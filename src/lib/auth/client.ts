"use client";

import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  verifyPasswordResetCode,
  type User,
} from "firebase/auth";

import { getClientAuth } from "@/lib/firebase/client";

/**
 * Browser-side auth flows. Only the sign-in call is provider specific; adding
 * Google or phone sign-in later means another function that ends in
 * `establishSession(user)`.
 */

export async function establishSession(user: User): Promise<void> {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw Object.assign(new Error("session_failed"), { code: "app/session-failed" });
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(getClientAuth(), email.trim(), password);
  await establishSession(cred.user);
  return cred.user;
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(getClientAuth(), email.trim(), password);
  if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
  await establishSession(cred.user);
  return cred.user;
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(getClientAuth(), email.trim(), {
    url: `${window.location.origin}/login`,
  });
}

export async function checkResetCode(code: string): Promise<string> {
  return verifyPasswordResetCode(getClientAuth(), code);
}

export async function resetPassword(code: string, newPassword: string) {
  await confirmPasswordReset(getClientAuth(), code, newPassword);
}

export async function signOutEverywhere() {
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
  await firebaseSignOut(getClientAuth()).catch(() => undefined);
}

/** Maps Firebase Auth error codes to translation keys. */
export function authErrorKey(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "auth.invalidCredentials";
    case "auth/too-many-requests":
      return "auth.tooManyAttempts";
    case "auth/user-disabled":
      return "auth.userDisabled";
    case "auth/network-request-failed":
      return "auth.networkError";
    case "auth/email-already-in-use":
      return "auth.emailInUse";
    case "auth/weak-password":
      return "auth.weakPassword";
    case "auth/expired-action-code":
    case "auth/invalid-action-code":
      return "auth.invalidLink";
    default:
      return "errors.generic";
  }
}
