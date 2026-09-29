import { addDaysToKey, timeToMinutes } from "@/lib/dates";
import type { StaffDTO, WeekdaySchedule, WeeklySchedule } from "@/lib/types";

/** Pure staff helpers shared by server pages and client views. */

export const WEEKDAY_KEYS = ["0", "1", "2", "3", "4", "5", "6"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

/** Weekday keys starting from the business's first day of the week. */
export function orderedWeekdays(weekStartsOn: number): WeekdayKey[] {
  return WEEKDAY_KEYS.map((_, i) => WEEKDAY_KEYS[(i + weekStartsOn) % 7]!);
}

export const STAFF_COLORS = [
  "#965660",
  "#b07a7f",
  "#a25c43",
  "#b08d57",
  "#507357",
  "#4b6d8a",
  "#7d5279",
  "#715f53",
  "#7a323b",
  "#4f7b80",
];

/** Documents expiring within this many days are flagged (UAE residence/passport). */
export const EXPIRY_WARNING_DAYS = 30;

export type ExpiryState = "expired" | "soon";

export function expiryState(date: string | null, today: string): ExpiryState | null {
  if (!date) return null;
  if (date < today) return "expired";
  if (date <= addDaysToKey(today, EXPIRY_WARNING_DAYS)) return "soon";
  return null;
}

export interface DocumentAlert {
  kind: "passport" | "visa";
  date: string;
  state: ExpiryState;
}

export function documentAlerts(hr: StaffDTO["hr"], today: string): DocumentAlert[] {
  const out: DocumentAlert[] = [];
  const p = expiryState(hr.passportExpiry, today);
  if (p && hr.passportExpiry) out.push({ kind: "passport", date: hr.passportExpiry, state: p });
  const v = expiryState(hr.visaExpiry, today);
  if (v && hr.visaExpiry) out.push({ kind: "visa", date: hr.visaExpiry, state: v });
  return out;
}

/** Scheduled working minutes for one weekday (shift minus break). */
export function shiftMinutes(day: WeekdaySchedule | undefined): number {
  if (!day?.working) return 0;
  const total = Math.max(0, timeToMinutes(day.end) - timeToMinutes(day.start));
  const br =
    day.breakStart && day.breakEnd ? Math.max(0, timeToMinutes(day.breakEnd) - timeToMinutes(day.breakStart)) : 0;
  return Math.max(0, total - br);
}

export function weeklyMinutes(schedule: WeeklySchedule): number {
  return WEEKDAY_KEYS.reduce((sum, k) => sum + shiftMinutes(schedule[k]), 0);
}

/** "HH:mm" options for time selects. */
export function timeOptions(stepMinutes = 15): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

export function fullName(s: Pick<StaffDTO, "firstName" | "lastName">): string {
  return `${s.firstName} ${s.lastName}`.trim();
}
