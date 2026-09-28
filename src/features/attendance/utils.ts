import type { AttendanceDTO } from "@/lib/types";

/** Pure time-clock helpers shared by the server and the client. */

export type ClockState = "not_in" | "in" | "on_break" | "out";

export function clockState(record: AttendanceDTO | null | undefined): ClockState {
  if (!record || !record.clockInAt) return "not_in";
  if (record.status === "closed" || record.clockOutAt) return "out";
  const last = record.breaks[record.breaks.length - 1];
  return last && last.startAt && !last.endAt ? "on_break" : "in";
}

interface Span {
  startAt: string | Date | null;
  endAt: string | Date | null;
}

const ms = (v: string | Date | null | undefined) => (v ? new Date(v).getTime() : NaN);

/** Minutes between clock-in and clock-out (or `now` while open), minus breaks. */
export function workedMinutes(
  rec: { clockInAt: string | Date | null; clockOutAt: string | Date | null; breaks: Span[] },
  now: number = Date.now(),
): number {
  const start = ms(rec.clockInAt);
  if (Number.isNaN(start)) return 0;
  const endRaw = ms(rec.clockOutAt);
  const end = Number.isNaN(endRaw) ? now : endRaw;
  let breakMs = 0;
  for (const b of rec.breaks) {
    const bs = ms(b.startAt);
    if (Number.isNaN(bs)) continue;
    const beRaw = ms(b.endAt);
    const be = Number.isNaN(beRaw) ? end : beRaw;
    breakMs += Math.max(0, Math.min(be, end) - Math.max(bs, start));
  }
  return Math.max(0, Math.floor((end - start - breakMs) / 60000));
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function inRange(key: string, from: string, to: string) {
  return key >= from && key <= to;
}
