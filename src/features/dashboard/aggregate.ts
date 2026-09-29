import { summarizeSales } from "@/features/sales/summary";
import { eachDayKey, minutesOfDay, weekdayOfKey, type DateRange } from "@/lib/dates";
import type { AppointmentDTO, AppointmentStatus, StaffDTO, TransactionDTO } from "@/lib/types";

/** Pure dashboard maths, shared by the page and unit tests. */

export interface DashboardKpis {
  netMinor: number;
  prevNetMinor: number;
  sales: number;
  avgTicketMinor: number;
  prevAvgTicketMinor: number;
  appointments: number;
  prevAppointments: number;
  completed: number;
  noShows: number;
  newClients: number;
  prevNewClients: number;
}

export interface SeriesPoint {
  dateKey: string;
  netMinor: number;
  prevNetMinor: number;
}

export interface RankedRow {
  id: string;
  name: string;
  count: number;
  revenueMinor: number;
}

/** Net value of an invoice: total minus credit notes (tips excluded). */
export function invoiceNet(tx: TransactionDTO): number {
  if (tx.status === "void") return 0;
  const refundTips = tx.refunds.reduce((s, r) => s + r.tipMinor, 0);
  return tx.totalMinor - (tx.refundedMinor - refundTips);
}

/** Line total left after refunds on that line. */
function lineNet(tx: TransactionDTO, itemId: string, totalMinor: number): number {
  let refunded = 0;
  for (const r of tx.refunds) for (const l of r.lines) if (l.itemId === itemId) refunded += l.amountMinor;
  return totalMinor - refunded;
}

function countedAppointments(list: AppointmentDTO[]) {
  // Cancelled bookings are not demand served; keep them out of the headline count.
  return list.filter((a) => a.status !== "cancelled").length;
}

export function computeKpis(input: {
  transactions: TransactionDTO[];
  prevTransactions: TransactionDTO[];
  appointments: AppointmentDTO[];
  prevAppointments: AppointmentDTO[];
  newClients: number;
  prevNewClients: number;
}): DashboardKpis {
  const cur = summarizeSales(input.transactions);
  const prev = summarizeSales(input.prevTransactions);
  return {
    netMinor: cur.netMinor,
    prevNetMinor: prev.netMinor,
    sales: cur.count,
    avgTicketMinor: cur.count ? Math.round(cur.grossMinor / cur.count) : 0,
    prevAvgTicketMinor: prev.count ? Math.round(prev.grossMinor / prev.count) : 0,
    appointments: countedAppointments(input.appointments),
    prevAppointments: countedAppointments(input.prevAppointments),
    completed: input.appointments.filter((a) => a.status === "completed").length,
    noShows: input.appointments.filter((a) => a.status === "no_show").length,
    newClients: input.newClients,
    prevNewClients: input.prevNewClients,
  };
}

/** Daily net revenue for the range, aligned day-by-day with the previous period. */
export function revenueSeries(range: DateRange, prevRange: DateRange, transactions: TransactionDTO[], prevTransactions: TransactionDTO[]): SeriesPoint[] {
  const byDay = (list: TransactionDTO[]) => {
    const m = new Map<string, number>();
    for (const tx of list) m.set(tx.dateKey, (m.get(tx.dateKey) ?? 0) + invoiceNet(tx));
    return m;
  };
  const cur = byDay(transactions);
  const prev = byDay(prevTransactions);
  const prevDays = eachDayKey(prevRange.from, prevRange.to);
  return eachDayKey(range.from, range.to).map((dateKey, i) => ({
    dateKey,
    netMinor: cur.get(dateKey) ?? 0,
    prevNetMinor: prev.get(prevDays[i] ?? "") ?? 0,
  }));
}

export function statusBreakdown(appointments: AppointmentDTO[]): Partial<Record<AppointmentStatus, number>> {
  const out: Partial<Record<AppointmentStatus, number>> = {};
  for (const a of appointments) out[a.status] = (out[a.status] ?? 0) + 1;
  return out;
}

export function topServices(transactions: TransactionDTO[], limit = 5): RankedRow[] {
  const m = new Map<string, RankedRow>();
  for (const tx of transactions) {
    if (tx.status === "void") continue;
    for (const i of tx.items) {
      if (i.type !== "service") continue;
      const row = m.get(i.refId) ?? { id: i.refId, name: i.name, count: 0, revenueMinor: 0 };
      row.count += i.quantity;
      row.revenueMinor += lineNet(tx, i.id, i.totalMinor);
      m.set(i.refId, row);
    }
  }
  return [...m.values()].sort((a, b) => b.revenueMinor - a.revenueMinor).slice(0, limit);
}

export function topStaff(transactions: TransactionDTO[], limit = 5): RankedRow[] {
  const m = new Map<string, RankedRow>();
  for (const tx of transactions) {
    if (tx.status === "void") continue;
    for (const i of tx.items) {
      if (!i.staffId || (i.type !== "service" && i.type !== "product")) continue;
      const row = m.get(i.staffId) ?? { id: i.staffId, name: i.staffName, count: 0, revenueMinor: 0 };
      if (i.type === "service") row.count += i.quantity;
      row.revenueMinor += lineNet(tx, i.id, i.totalMinor);
      m.set(i.staffId, row);
    }
  }
  return [...m.values()].sort((a, b) => b.revenueMinor - a.revenueMinor).slice(0, limit);
}

export interface TodaySummary {
  revenueMinor: number;
  sales: number;
  appointments: number;
  completed: number;
  upcoming: number;
  clients: number;
}

/** Today at a glance: takings, bookings and distinct clients (booked or served). */
export function todaySummary(transactions: TransactionDTO[], appointments: AppointmentDTO[], nowMs: number): TodaySummary {
  const live = appointments.filter((a) => a.status !== "cancelled");
  const clients = new Set<string>();
  for (const a of live) clients.add(a.clientId ?? `walk-in:${a.clientName}`);
  for (const tx of transactions) if (tx.status !== "void") clients.add(tx.clientId ?? `walk-in:${tx.id}`);
  const sales = summarizeSales(transactions);
  return {
    revenueMinor: sales.netMinor,
    sales: sales.count,
    appointments: live.length,
    completed: live.filter((a) => a.status === "completed").length,
    upcoming: live.filter((a) => (a.status === "booked" || a.status === "confirmed") && Date.parse(a.startAt) > nowMs).length,
    clients: clients.size,
  };
}

/** Open balances left on unpaid and part-paid invoices. */
export function pendingPayments(transactions: TransactionDTO[]): { count: number; balanceMinor: number } {
  let count = 0;
  let balanceMinor = 0;
  for (const tx of transactions) {
    if ((tx.status === "unpaid" || tx.status === "partially_paid") && tx.balanceMinor > 0) {
      count += 1;
      balanceMinor += tx.balanceMinor;
    }
  }
  return { count, balanceMinor };
}

export interface Retention {
  current: number;
  previous: number;
  /** Clients who bought in both periods. */
  returning: number;
  /** Clients this period who did not buy last period. */
  fresh: number;
  /** Share of last period's clients who came back (null without a baseline). */
  rate: number | null;
}

function clientSet(list: TransactionDTO[]): Set<string> {
  const s = new Set<string>();
  for (const tx of list) if (tx.clientId && tx.status !== "void") s.add(tx.clientId);
  return s;
}

export function clientRetention(transactions: TransactionDTO[], prevTransactions: TransactionDTO[]): Retention {
  const cur = clientSet(transactions);
  const prev = clientSet(prevTransactions);
  let returning = 0;
  for (const id of cur) if (prev.has(id)) returning += 1;
  return {
    current: cur.size,
    previous: prev.size,
    returning,
    fresh: cur.size - returning,
    rate: prev.size ? returning / prev.size : null,
  };
}

export interface BookingPoint {
  dateKey: string;
  count: number;
  prevCount: number;
}

/** Bookings per day (cancellations excluded), aligned with the previous period. */
export function bookingsSeries(
  range: DateRange,
  prevRange: DateRange,
  appointments: AppointmentDTO[],
  prevAppointments: AppointmentDTO[],
): BookingPoint[] {
  const byDay = (list: AppointmentDTO[]) => {
    const m = new Map<string, number>();
    for (const a of list) if (a.status !== "cancelled") m.set(a.dateKey, (m.get(a.dateKey) ?? 0) + 1);
    return m;
  };
  const cur = byDay(appointments);
  const prev = byDay(prevAppointments);
  const prevDays = eachDayKey(prevRange.from, prevRange.to);
  return eachDayKey(range.from, range.to).map((dateKey, i) => ({
    dateKey,
    count: cur.get(dateKey) ?? 0,
    prevCount: prev.get(prevDays[i] ?? "") ?? 0,
  }));
}

export interface BusyHours {
  /** First hour shown (inclusive) and last hour (exclusive). */
  from: number;
  to: number;
  /** counts[weekday][hour - from], weekday 0 = Sunday. */
  counts: number[][];
  max: number;
}

/** Booking starts by weekday and hour, clipped to the hours that saw bookings. */
export function busyHours(appointments: AppointmentDTO[], tz: string): BusyHours {
  const live = appointments.filter((a) => a.status !== "cancelled");
  const hours = live.map((a) => Math.floor(minutesOfDay(new Date(a.startAt), tz) / 60));
  const from = hours.length ? Math.min(...hours) : 9;
  const to = hours.length ? Math.max(...hours) + 1 : 21;
  const counts = Array.from({ length: 7 }, () => Array.from({ length: to - from }, () => 0));
  live.forEach((a, i) => {
    const row = counts[weekdayOfKey(a.dateKey)];
    const h = hours[i]!;
    if (row) row[h - from] = (row[h - from] ?? 0) + 1;
  });
  return { from, to, counts, max: Math.max(0, ...counts.flat()) };
}

export interface CategoryRow {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  revenueMinor: number;
  count: number;
}

/** Service revenue (after line refunds) grouped by service category. */
export function categoryPerformance(
  transactions: TransactionDTO[],
  services: { id: string; categoryId: string }[],
  categories: { id: string; name: string; nameAr: string; color: string }[],
): CategoryRow[] {
  const categoryOf = new Map(services.map((s) => [s.id, s.categoryId]));
  const info = new Map(categories.map((c) => [c.id, c]));
  const m = new Map<string, CategoryRow>();
  for (const tx of transactions) {
    if (tx.status === "void") continue;
    for (const i of tx.items) {
      if (i.type !== "service") continue;
      const id = categoryOf.get(i.refId) ?? "";
      const c = info.get(id);
      const row = m.get(id) ?? { id, name: c?.name ?? "", nameAr: c?.nameAr ?? "", color: c?.color ?? "", revenueMinor: 0, count: 0 };
      row.count += i.quantity;
      row.revenueMinor += lineNet(tx, i.id, i.totalMinor);
      m.set(id, row);
    }
  }
  return [...m.values()].filter((r) => r.revenueMinor > 0).sort((a, b) => b.revenueMinor - a.revenueMinor);
}

/** Active staff whose weekly schedule has them working on `weekday` in the branch scope. */
export function staffWorkingToday(staff: StaffDTO[], weekday: number, branchIds: string[]): number {
  return staff.filter(
    (s) =>
      s.status === "active" &&
      s.schedule[String(weekday)]?.working === true &&
      (s.branchIds.length === 0 || s.branchIds.some((b) => branchIds.includes(b))),
  ).length;
}
