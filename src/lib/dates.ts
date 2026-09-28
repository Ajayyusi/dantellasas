import { TZDate } from "@date-fns/tz";

/**
 * Time-zone helpers. Instants are Firestore Timestamps / JS Dates; anything
 * shown "by day" also carries a dateKey (YYYY-MM-DD) computed in the business
 * time zone, so day queries never do time-zone arithmetic.
 */

export const DEFAULT_TIMEZONE = "Asia/Dubai";

const pad = (n: number) => String(n).padStart(2, "0");

export function dateKeyOf(date: Date | number, tz: string): string {
  const d = new TZDate(typeof date === "number" ? date : date.getTime(), tz);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(tz: string): string {
  return dateKeyOf(Date.now(), tz);
}

export function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

export function isDateKey(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** The instant at wall-clock `time` ("HH:mm") on `key` in `tz`. */
export function zonedInstant(key: string, time: string, tz: string): Date {
  const { y, m, d } = parseKey(key);
  const [hh, mm] = time.split(":").map(Number);
  const z = new TZDate(y, m - 1, d, hh ?? 0, mm ?? 0, 0, tz);
  return new Date(z.getTime());
}

export function startOfDayInstant(key: string, tz: string): Date {
  return zonedInstant(key, "00:00", tz);
}

/** Minutes since local midnight for an instant. */
export function minutesOfDay(date: Date | number, tz: string): number {
  const d = new TZDate(typeof date === "number" ? date : date.getTime(), tz);
  return d.getHours() * 60 + d.getMinutes();
}

export function timeOf(date: Date | number, tz: string): string {
  const mins = minutesOfDay(date, tz);
  return minutesToTime(mins);
}

export function minutesToTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function addDaysToKey(key: string, days: number): string {
  const { y, m, d } = parseKey(key);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOfKey(key: string): number {
  const { y, m, d } = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function diffDays(fromKey: string, toKey: string): number {
  const a = parseKey(fromKey);
  const b = parseKey(toKey);
  return Math.round(
    (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000,
  );
}

export function startOfWeekKey(key: string, weekStartsOn: number): string {
  const wd = weekdayOfKey(key);
  const delta = (wd - weekStartsOn + 7) % 7;
  return addDaysToKey(key, -delta);
}

export function eachDayKey(from: string, to: string): string[] {
  const out: string[] = [];
  const n = diffDays(from, to);
  for (let i = 0; i <= n; i++) out.push(addDaysToKey(from, i));
  return out;
}

export interface DateRange {
  from: string;
  to: string;
}

export const RANGE_PRESETS = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "custom",
] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export function rangeForPreset(
  preset: RangePreset,
  tz: string,
  weekStartsOn = 1,
  custom?: Partial<DateRange>,
): DateRange {
  const today = todayKey(tz);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDaysToKey(today, -1);
      return { from: y, to: y };
    }
    case "this_week":
      return { from: startOfWeekKey(today, weekStartsOn), to: today };
    case "last_week": {
      const start = addDaysToKey(startOfWeekKey(today, weekStartsOn), -7);
      return { from: start, to: addDaysToKey(start, 6) };
    }
    case "this_month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "last_month": {
      const firstThis = `${today.slice(0, 7)}-01`;
      const lastPrev = addDaysToKey(firstThis, -1);
      return { from: `${lastPrev.slice(0, 7)}-01`, to: lastPrev };
    }
    case "custom": {
      const from = isDateKey(custom?.from) ? custom.from : today;
      const to = isDateKey(custom?.to) ? custom.to : from;
      return from <= to ? { from, to } : { from: to, to: from };
    }
  }
}

/** The equally long period immediately before `range`. */
export function previousRange(range: DateRange): DateRange {
  const len = diffDays(range.from, range.to) + 1;
  const to = addDaysToKey(range.from, -1);
  return { from: addDaysToKey(to, -(len - 1)), to };
}

export function ageInDays(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((now - t) / 86_400_000);
}
