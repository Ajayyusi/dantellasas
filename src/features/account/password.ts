"use client";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  updatePassword,
} from "firebase/auth";

import { authErrorKey, establishSession } from "@/lib/auth/client";
import { getClientAuth } from "@/lib/firebase/client";

/**
 * Changes the signed-in user's password in the browser: re-authenticate with
 * the current password (or sign in if the SDK has no cached user), update it,
 * then refresh the server session cookie — a password change revokes the old one.
 */
export async function changePassword(email: string, current: string, next: string): Promise<void> {
  const auth = getClientAuth();
  let user = auth.currentUser;
  if (user && user.email?.toLowerCase() === email.toLowerCase()) {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, current));
  } else {
    user = (await signInWithEmailAndPassword(auth, email, current)).user;
  }
  await updatePassword(user, next);
  await establishSession(user);
}

export function passwordErrorKey(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code === "auth/requires-recent-login") return "account.errors.recentLogin";
  if (code === "auth/missing-password") return "account.errors.currentPasswordRequired";
  if (code === "app/session-failed") return "account.errors.sessionRefresh";
  return authErrorKey(err);
}
