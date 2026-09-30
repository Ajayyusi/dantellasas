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
  "#a8406a",
  "#3f5f99",
  "#2f7a55",
  "#8a5a0b",
  "#6a4c96",
  "#2e6b73",
  "#9a4b34",
  "#b8527d",
  "#5f595c",
  "#4a78b0",
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
