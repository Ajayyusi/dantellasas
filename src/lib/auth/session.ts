import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getServerEnv } from "@/lib/env.server";
import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * Auth architecture (see docs/architecture/auth.md):
 *  1. Client signs in with the Firebase Web SDK (provider TBD).
 *  2. Client POSTs the ID token to /api/auth/session.
 *  3. Server verifies it and sets an httpOnly Firebase *session cookie*.
 *  4. Server components / route handlers call `getSession()`.
 *  5. `src/proxy.ts` only checks cookie presence for fast redirects; real
 *     verification always happens server-side here.
 */

export interface Session {
  uid: string;
  email?: string;
  phoneNumber?: string;
  emailVerified: boolean;
}

export const getSession = cache(async (): Promise<Session | null> => {
  const { SESSION_COOKIE_NAME } = getServerEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    // checkRevoked=true so sign-out-everywhere / disabled users take effect.
    const decoded = await getAdminAuth().verifySessionCookie(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      phoneNumber: decoded.phone_number,
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
  const authAgeSec = Date.now() / 1000 - decoded.auth_time;
  if (authAgeSec > 5 * 60) {
    throw new Error("recent_login_required");
  }
  const cookie = await auth.createSessionCookie(idToken, { expiresIn });
  return { cookie, expiresIn, uid: decoded.uid };
}
