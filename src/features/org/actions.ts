"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { getSession } from "@/lib/auth/session";
import { BRANCH_COOKIE, ORG_COOKIE } from "@/lib/cookies";
import { getServerEnv } from "@/lib/env.server";

import { provisionOrganization } from "./provision";

const schema = z.object({
  businessName: z.string().trim().min(2, "validation.required").max(80, "validation.tooLong"),
  branchName: z.string().trim().min(1, "validation.required").max(60, "validation.tooLong"),
  phone: z.string().trim().max(30).optional(),
  defaultLocale: z.enum(["en", "ar"]),
  demoData: z.boolean().default(false),
});

/**
 * Onboarding: the signed-in user creates their business. This is the only
 * action that runs without an organization context.
 */
export async function createOrganizationAction(
  input: z.input<typeof schema>,
): Promise<ActionResult<{ orgId: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "errors.unauthenticated" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
    return { ok: false, error: "errors.validation", fieldErrors };
  }
  try {
    const { orgId, branchId } = await provisionOrganization({
      ownerUid: session.uid,
      ownerEmail: session.email,
      ownerName: session.name,
      businessName: parsed.data.businessName,
      branchName: parsed.data.branchName,
      phone: parsed.data.phone,
      defaultLocale: parsed.data.defaultLocale,
    });
    const jar = await cookies();
    jar.set(ORG_COOKIE, orgId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    jar.set(BRANCH_COOKIE, branchId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    if (parsed.data.demoData && getServerEnv().ALLOW_DEMO_DATA) {
      const { seedDemoData } = await import("@/features/demo/seed-demo");
      await seedDemoData({ orgId, branchId, actorUid: session.uid, actorName: session.name });
    }
    return { ok: true, data: { orgId } };
  } catch (err) {
    console.error("[onboarding] failed", err);
    return { ok: false, error: "errors.generic" };
  }
}
