import { summarizeSales } from "@/features/sales/summary";
import { eachDayKey, type DateRange } from "@/lib/dates";
import type { AppointmentDTO, AppointmentStatus, TransactionDTO } from "@/lib/types";

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
