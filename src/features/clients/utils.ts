import type { ClientDTO } from "@/lib/types";

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
const AVATAR_COLORS = ["#7c5cff", "#e5484d", "#0d9488", "#d97706", "#2563eb", "#db2777", "#16a34a", "#9333ea"];
export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}
