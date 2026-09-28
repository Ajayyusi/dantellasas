import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { LOCALE_COOKIE } from "@/lib/cookies";

import { getDefaultLocale, getDir, isLocale, type Locale } from "./config";
import { createTranslator, type MessageTree, type Vars } from "./define";
import { messages, type TKey } from "./messages";

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : getDefaultLocale();
});

export const getI18n = cache(async () => {
  const locale = await getLocale();
  const tree = messages[locale] as unknown as MessageTree;
  const { t, tp, te } = createTranslator(tree, locale);
  return {
    locale,
    dir: getDir(locale),
    messages: messages[locale],
    t: t as (key: TKey, vars?: Vars) => string,
    tp,
    te,
  };
});
