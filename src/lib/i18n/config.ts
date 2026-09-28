// Minimal locale/direction config. Full i18n (message catalogs, routing) is
// deferred until product copy exists; this only guarantees RTL/LTR correctness.

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const rtlLocales: readonly Locale[] = ["ar"];

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function getDefaultLocale(): Locale {
  const value = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  return isLocale(value) ? value : "ar";
}

export function getDir(locale: Locale): "rtl" | "ltr" {
  return rtlLocales.includes(locale) ? "rtl" : "ltr";
}
