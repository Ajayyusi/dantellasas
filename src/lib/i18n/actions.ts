"use server";

import { cookies } from "next/headers";

import { getSession } from "@/lib/auth/session";
import { LOCALE_COOKIE } from "@/lib/cookies";
import { userRef } from "@/lib/db";

import { isLocale } from "./config";

export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const session = await getSession();
  if (session) {
    await userRef(session.uid).set({ locale }, { merge: true }).catch(() => undefined);
  }
}
