"use client";

import { createContext, useContext, useMemo } from "react";

import type { Locale } from "./config";
import { createTranslator, type MessageTree, type Vars } from "./define";
import type { Messages, TKey } from "./messages";

interface I18nValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: TKey, vars?: Vars) => string;
  tp: (key: string, count: number, vars?: Vars) => string;
  /** Translate a dynamic key (e.g. an error code from the server). */
  te: (key: string, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(() => {
    const { t, tp, te } = createTranslator(messages as unknown as MessageTree, locale);
    return { locale, dir: locale === "ar" ? "rtl" : "ltr", t: t as I18nValue["t"], tp, te };
  }, [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
