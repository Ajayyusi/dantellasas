import "server-only";

import { randomBytes } from "node:crypto";

import { headers } from "next/headers";

import { fail } from "@/lib/actions";
import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * Login accounts created on someone's behalf (Settings → Users, and salons the
 * platform admin sets up). The system sends no email: whoever creates the
 * account shares a password-setup link.
 */

export async function findOrCreateAuthUser(email: string, displayName: string): Promise<{ uid: string; created: boolean }> {
  const auth = getAdminAuth();
  try {
    const user = await auth.getUserByEmail(email);
    return { uid: user.uid, created: false };
  } catch (err) {
    if ((err as { code?: string }).code !== "auth/user-not-found") {
      console.error("[accounts] auth lookup failed", err);
      fail("settings.errors.authUnavailable");
    }
  }
  const user = await auth.createUser({
    email,
    displayName,
    // Never shown to anyone: the user sets their own password via the setup link.
    password: randomBytes(24).toString("base64url"),
    emailVerified: false,
  });
  return { uid: user.uid, created: true };
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * A one-time link that opens the app's own reset-password page (so it works
 * the same with the Auth emulator and in production).
 */
export async function passwordSetupLink(email: string): Promise<string> {
  const raw = await getAdminAuth().generatePasswordResetLink(email);
  let code: string | null = null;
  try {
    code = new URL(raw).searchParams.get("oobCode");
  } catch {
    code = null;
  }
  if (!code) return raw;
  return `${await requestOrigin()}/reset-password?oobCode=${encodeURIComponent(code)}`;
}
