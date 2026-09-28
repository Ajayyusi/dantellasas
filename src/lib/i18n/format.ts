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

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(locale: Locale, tz: string) {
  const key = `${locale}|${tz}`;
  let f = partsCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
      timeZone: tz,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hourCycle: "h23",
    });
    partsCache.set(key, f);
  }
  return f;
}

const SHORT_MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 12-hour clock with our own AM/PM strings, identical on server and browser. */
export function formatClock(totalMinutes: number, locale: Locale): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = locale === "ar" ? (h < 12 ? "ص" : "م") : h < 12 ? "AM" : "PM";
  return `${h12}:${mm} ${suffix}`;
}

/** Compact hour label for calendar gutters: "10 AM" / "10 ص". */
export function formatHour(totalMinutes: number, locale: Locale): string {
  const h = Math.floor((((totalMinutes % 1440) + 1440) % 1440) / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = locale === "ar" ? (h < 12 ? "ص" : "م") : h < 12 ? "AM" : "PM";
  return `${h12} ${suffix}`;
}

/**
 * Deterministic formatting: Node and browsers ship different ICU data (commas,
 * narrow spaces), which breaks hydration. We take the parts from Intl and join
 * them ourselves.
 */
export function formatDate(
  value: string | Date | number | null | undefined,
  locale: Locale,
  tz: string,
  style: DateStyle = "date",
): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const parts = Object.fromEntries(partsFormatter(locale, tz).formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>;
  const monthIndex = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, month: "numeric" }).format(d)) - 1;
  const month = parts.month ?? "";
  const shortMonth = locale === "ar" ? month : (SHORT_MONTHS_EN[monthIndex] ?? month);
  const weekday = parts.weekday ?? "";
  const shortWeekday = locale === "ar" ? weekday : weekday.slice(0, 3);
  const day = parts.day ?? "";
  const year = parts.year ?? "";
  const clock = formatClock(Number(parts.hour ?? 0) * 60 + Number(parts.minute ?? 0), locale);
  const comma = locale === "ar" ? "،" : ",";
  switch (style) {
    case "date":
      return `${day} ${shortMonth} ${year}`;
    case "dateLong":
      return `${weekday}${comma} ${day} ${month} ${year}`;
    case "datetime":
      return `${day} ${shortMonth} ${year}${comma} ${clock}`;
    case "time":
      return clock;
    case "weekday":
      return shortWeekday;
    case "weekdayDate":
      return `${shortWeekday}${comma} ${day} ${shortMonth}`;
    case "monthDay":
      return `${day} ${shortMonth}`;
    case "monthYear":
      return `${month} ${year}`;
    case "dayNumber":
      return day;
  }
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
