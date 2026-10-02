import "server-only";

import { revalidatePath } from "next/cache";
import { forbidden, redirect, unstable_rethrow } from "next/navigation";
import { cache } from "react";
import type { z } from "zod";

import { ActionError, fieldErrorsOf, type ActionResult } from "@/lib/actions";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env.server";
import { getAdminAuth } from "@/lib/firebase/admin";

import { adminAccess, isAdminEmail, parseAdminEmails } from "./admins";

/**
 * Server-side gate for /admin. Pages and actions call it on every request
 * (layouts don't re-render on client navigation), and the account is read
 * live from Firebase Auth rather than trusted from the session cookie, so a
 * removed, disabled or unverified admin is refused straight away. Admin data
 * is read with the Admin SDK on the server only; Firestore rules are unchanged.
 */

export interface PlatformAdmin {
  uid: string;
  email: string;
  name: string;
}

export type PlatformAdminState =
  | { ok: true; admin: PlatformAdmin }
  | { ok: false; reason: "unauthenticated" }
  | { ok: false; reason: "denied"; email: string }
  | { ok: false; reason: "unverified"; email: string };

function platformAdminEmails(): string[] {
  return parseAdminEmails(getServerEnv().PLATFORM_ADMIN_EMAILS);
}

/** UI hint only (the account-menu link). Never use it to authorize anything. */
export function listedAsPlatformAdmin(email: string): boolean {
  return isAdminEmail(email, platformAdminEmails());
}

export const resolvePlatformAdmin = cache(async (): Promise<PlatformAdminState> => {
  const session = await getSession();
  if (!session) return { ok: false, reason: "unauthenticated" };
  const admins = platformAdminEmails();
  if (!isAdminEmail(session.email, admins)) return { ok: false, reason: "denied", email: session.email };
  try {
    const user = await getAdminAuth().getUser(session.uid);
    const email = user.email ?? "";
    const access = adminAccess({ email, emailVerified: user.emailVerified, disabled: user.disabled }, admins);
    if (access === "denied") return { ok: false, reason: "denied", email };
    if (access === "unverified") return { ok: false, reason: "unverified", email };
    return { ok: true, admin: { uid: user.uid, email, name: user.displayName || session.name } };
  } catch (err) {
    console.error("[platform] admin lookup failed", err);
    return { ok: false, reason: "denied", email: session.email };
  }
});

/**
 * For admin pages and the admin layout: signed-out visitors go to the admin
 * sign-in, everyone who isn't an admin gets the 403 page, and a listed admin
 * whose email isn't verified yet is asked to verify it.
 */
export async function platformAdminForPage(): Promise<{ admin: PlatformAdmin } | { verifyEmail: string }> {
  const state = await resolvePlatformAdmin();
  if (state.ok) return { admin: state.admin };
  if (state.reason === "unauthenticated") redirect("/admin/login");
  if (state.reason === "denied") forbidden();
  return { verifyEmail: state.email };
}

/** `action()` for the platform admin: re-checks admin access, validates input, maps failures. */
export function platformAction<S extends z.ZodType, R>(
  config: { schema: S; revalidate?: boolean },
  handler: (input: z.output<S>, admin: PlatformAdmin) => Promise<R>,
): (input: z.input<S>) => Promise<ActionResult<R>> {
  return async (input) => {
    const state = await resolvePlatformAdmin();
    if (!state.ok) return { ok: false, error: state.reason === "unauthenticated" ? "errors.unauthenticated" : "errors.forbidden" };
    const parsed = config.schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "errors.validation", fieldErrors: fieldErrorsOf(parsed.error) };
    try {
      const data = await handler(parsed.data, state.admin);
      if (config.revalidate !== false) revalidatePath("/admin");
      return { ok: true, data };
    } catch (err) {
      unstable_rethrow(err);
      if (err instanceof ActionError) return { ok: false, error: err.code, fieldErrors: err.fieldErrors, vars: err.vars };
      console.error("[platform] unexpected error", err);
      return { ok: false, error: "errors.generic" };
    }
  };
}
