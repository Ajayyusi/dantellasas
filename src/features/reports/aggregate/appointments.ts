import { minutesOfDay, weekdayOfKey, type DateRange } from "@/lib/dates";
import { APPOINTMENT_SOURCES, APPOINTMENT_STATUSES, type AppointmentDTO, type AppointmentStatus } from "@/lib/types";

import type { AppointmentRow, AppointmentsReport } from "../types";
import { ratio } from "./ledger";

const DEFAULT_HOURS = { first: 9, last: 21 };

/**
 * Appointment outcomes. Rates: cancellation = cancelled ÷ all booked;
 * no-show = no-shows ÷ appointments not cancelled; completion = completed ÷
 * appointments not cancelled. The weekday × hour grid counts appointments
 * that were not cancelled, by local start time.
 */
export function appointmentsReport(appointments: AppointmentDTO[], range: DateRange, tz: string, weekStartsOn: number): AppointmentsReport {
  const list = appointments.filter((a) => a.dateKey >= range.from && a.dateKey <= range.to);
  const byStatus = Object.fromEntries(APPOINTMENT_STATUSES.map((s) => [s, 0])) as Record<AppointmentStatus, number>;
  const reasons = new Map<string, number>();
  const sources = new Map(APPOINTMENT_SOURCES.map((s) => [s, { source: s, count: 0, valueMinor: 0 }]));
  const cells = new Map<string, number>();
  let first = 24;
  let last = -1;
  const rows: AppointmentRow[] = [];

  for (const a of list) {
    byStatus[a.status] += 1;
    if (a.status === "cancelled") {
      const reason = a.cancellation?.reason.trim() ?? "";
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
    const src = sources.get(a.source) ?? sources.get("other")!;
    src.count += 1;
    if (a.status !== "cancelled" && a.status !== "no_show") src.valueMinor += a.totalMinor;
    if (a.status !== "cancelled") {
      const hour = Math.floor(minutesOfDay(new Date(a.startAt), tz) / 60);
      const key = `${weekdayOfKey(a.dateKey)}:${hour}`;
      cells.set(key, (cells.get(key) ?? 0) + 1);
      first = Math.min(first, hour);
      last = Math.max(last, hour);
    }
    rows.push({
      id: a.id,
      branchId: a.branchId,
      dateKey: a.dateKey,
      startAt: a.startAt,
      clientName: a.clientName,
      services: a.items.map((i) => i.serviceName).join(", "),
      staff: [...new Set(a.items.map((i) => i.staffName).filter(Boolean))].join(", "),
      status: a.status,
      source: a.source,
      reason: a.status === "cancelled" ? (a.cancellation?.reason ?? "") : "",
      valueMinor: a.totalMinor,
    });
  }
  if (last < 0) {
    first = DEFAULT_HOURS.first;
    last = DEFAULT_HOURS.last;
  }
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const heat = Array.from({ length: 7 }, (_, i) => {
    const weekday = (weekStartsOn + i) % 7;
    return { weekday, counts: hours.map((h) => cells.get(`${weekday}:${h}`) ?? 0) };
  });
  const total = list.length;
  const attended = total - byStatus.cancelled;
  rows.sort((a, b) => b.startAt.localeCompare(a.startAt));
  return {
    rows,
    total,
    byStatus,
    reasons: [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
    sources: [...sources.values()].filter((s) => s.count > 0).sort((a, b) => b.count - a.count),
    heat,
    hours,
    noShowRate: ratio(byStatus.no_show, attended),
    cancelRate: ratio(byStatus.cancelled, total),
    completionRate: ratio(byStatus.completed, attended),
  };
}
