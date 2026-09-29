import { addDaysToKey, dateKeyOf, diffDays } from "@/lib/dates";
import type { AppointmentDTO, ClientDTO } from "@/lib/types";

import type { LastVisitBucket } from "./types";

/** Client-safe helpers shared by the directory and the profile. */

const DAY = 86_400_000;

export function daysSince(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / DAY));
}

/** ≤30 days = recent, 31–90 = lapsing, >90 = lapsed, never visited. */
export function lastVisitBucket(client: ClientDTO, now: number): LastVisitBucket {
  const days = daysSince(client.stats.lastVisitAt, now);
  if (days === null) return "never";
  if (days <= 30) return "recent";
  if (days <= 90) return "lapsing";
  return "lapsed";
}

/** Future next appointment only — `stats.nextAppointmentAt` can go stale. */
export function upcomingAt(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) || t < now ? null : iso;
}

/** Digits in international form for wa.me / tel: links (050… → 97150…). */
export function phoneDigits(phone: string, countryCode: string): string {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = countryCode + digits.slice(1);
  else if (digits.length <= 9) digits = countryCode + digits;
  return digits;
}

export function whatsappLink(phone: string, countryCode: string): string | null {
  const digits = phoneDigits(phone, countryCode);
  return digits ? `https://wa.me/${digits}` : null;
}

export function telLink(phone: string, countryCode: string): string | null {
  const digits = phoneDigits(phone, countryCode);
  return digits ? `tel:+${digits}` : null;
}

/** Text the directory search matches: name, e-mail and several phone spellings. */
export function clientSearchText(c: ClientDTO, countryCode: string): string {
  const digits = phoneDigits(c.phone, countryCode);
  const local = digits.startsWith(countryCode) ? `0${digits.slice(countryCode.length)}` : "";
  return [c.fullName, c.email, c.phone, c.phone.replace(/\D/g, ""), digits, local, c.tags.join(" ")].join(" ");
}

export function averageSpendMinor(c: ClientDTO): number {
  return c.stats.visits > 0 ? Math.round(c.stats.totalSpendMinor / c.stats.visits) : 0;
}

/** Stable accent colour for a client's avatar, derived from the id. */
const AVATAR_COLORS = ["#965660", "#a25c43", "#90693b", "#507357", "#4b6d8a", "#7d5279", "#715f53", "#4f7b80"];
export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

/** Whole days from today (in `tz`) to the next birthday; 0 on the day itself. */
export function daysUntilBirthday(b: NonNullable<ClientDTO["birthday"]>, now: number, tz: string): number {
  const today = dateKeyOf(now, tz);
  const year = Number(today.slice(0, 4));
  const key = (y: number) => addDaysToKey(`${y}-${String(b.month).padStart(2, "0")}-01`, b.day - 1);
  const thisYear = key(year);
  return thisYear >= today ? diffDays(today, thisYear) : diffDays(today, key(year + 1));
}

/** The client's most booked services across completed visits, most frequent first. */
export function favouriteServices(visits: AppointmentDTO[], limit = 3): { id: string; name: string; count: number }[] {
  const byService = new Map<string, { id: string; name: string; count: number; last: string }>();
  for (const a of visits) {
    for (const i of a.items) {
      const id = i.serviceId || i.serviceName;
      const row = byService.get(id);
      if (!row) byService.set(id, { id, name: i.serviceName, count: 1, last: i.startAt });
      else {
        row.count += 1;
        if (i.startAt > row.last) row.last = i.startAt;
      }
    }
  }
  return [...byService.values()]
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, limit)
    .map(({ id, name, count }) => ({ id, name, count }));
}
