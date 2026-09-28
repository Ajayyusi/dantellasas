import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getServerEnv, SESSION_COOKIE } from "@/lib/env.server";
import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * Session model (docs/architecture/auth.md):
 *  1. The browser signs in with the Firebase Web SDK (email/password today;
 *     Google/phone later — only the sign-in call changes).
 *  2. It POSTs the fresh ID token to /api/auth/session.
 *  3. The server verifies it and sets an httpOnly Firebase *session cookie*.
 *  4. Server code calls `getSession()`, which verifies the cookie with
 *     revocation checks. `src/proxy.ts` only checks cookie presence.
 */

export interface Session {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: (decoded.name as string | undefined) ?? decoded.email?.split("@")[0] ?? "",
      emailVerified: decoded.email_verified ?? false,
    };
  } catch {
    return null;
  }
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function createSessionCookie(idToken: string) {
  const { SESSION_COOKIE_MAX_AGE_DAYS } = getServerEnv();
  const expiresIn = SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(idToken, true);
  // Require a recent sign-in to mint a long-lived session (mitigates stolen tokens).
  if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
    throw new Error("recent_login_required");
  }
  const cookie = await auth.createSessionCookie(idToken, { expiresIn });
  return { cookie, expiresIn, uid: decoded.uid };
}
