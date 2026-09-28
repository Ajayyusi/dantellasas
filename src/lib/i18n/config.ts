export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function getDefaultLocale(): Locale {
  const value = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  return isLocale(value) ? value : "en";
}

export function getDir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export const localeNames: Record<Locale, string> = { en: "English", ar: "العربية" };
