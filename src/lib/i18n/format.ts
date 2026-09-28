import { numberLocale } from "@/lib/money";

import type { Locale } from "./config";

/** Date/time formatting in the business time zone, Western digits in Arabic. */

export type DateStyle =
  | "date"
  | "dateLong"
  | "datetime"
  | "time"
  | "weekday"
  | "weekdayDate"
  | "monthDay"
  | "monthYear"
  | "dayNumber";

const OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  date: { day: "numeric", month: "short", year: "numeric" },
  dateLong: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  datetime: { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" },
  time: { hour: "numeric", minute: "2-digit" },
  weekday: { weekday: "short" },
  weekdayDate: { weekday: "short", day: "numeric", month: "short" },
  monthDay: { day: "numeric", month: "short" },
  monthYear: { month: "long", year: "numeric" },
  dayNumber: { day: "numeric" },
};

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: Locale, tz: string, style: DateStyle) {
  const key = `${locale}|${tz}|${style}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
      ...OPTIONS[style],
      timeZone: tz,
    });
    cache.set(key, f);
  }
  return f;
}

export function formatDate(
  value: string | Date | number | null | undefined,
  locale: Locale,
  tz: string,
  style: DateStyle = "date",
): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatter(locale, tz, style).format(d);
}

/** Formats a YYYY-MM-DD key (a calendar date, no time zone involved). */
export function formatDateKey(key: string, locale: Locale, style: DateStyle = "date"): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
  return formatDate(date, locale, "UTC", style);
}

export function formatRelative(
  value: string | Date | null | undefined,
  locale: Locale,
  now = Date.now(),
): string {
  if (!value) return "—";
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  if (Number.isNaN(t)) return "—";
  const diffSec = Math.round((t - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(numberLocale(locale), { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

export function formatDuration(minutes: number, locale: Locale): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "ar") {
    if (h && m) return `${h} س ${m} د`;
    if (h) return `${h} س`;
    return `${m} د`;
  }
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
