import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { listAppointments } from "@/features/appointments/queries";
import { listTransactions } from "@/features/sales/queries";
import { listCategories, listServices } from "@/features/services/queries";
import { listStaff } from "@/features/staff/queries";
import { orgCol } from "@/lib/db";
import { addDaysToKey, previousRange, todayKey, weekdayOfKey, zonedInstant, type DateRange } from "@/lib/dates";
import { can, type AppContext } from "@/lib/tenancy/context";
import type { AppointmentDTO, TransactionDTO } from "@/lib/types";

import {
  bookingsSeries,
  busyHours,
  categoryPerformance,
  clientRetention,
  computeKpis,
  pendingPayments,
  revenueSeries,
  staffWorkingToday,
  statusBreakdown,
  todaySummary,
  topServices,
  topStaff,
} from "./aggregate";

async function appointmentsIn(ctx: AppContext, from: string, to: string): Promise<AppointmentDTO[]> {
  const lists = await Promise.all(ctx.scopeBranchIds.map((b) => listAppointments(ctx, b, from, to)));
  return lists.flat().sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Clients created in the range (org-wide; clients are shared across branches). */
async function countNewClients(ctx: AppContext, range: DateRange): Promise<number> {
  const start = Timestamp.fromDate(zonedInstant(range.from, "00:00", ctx.timezone));
  const end = Timestamp.fromDate(zonedInstant(addDaysToKey(range.to, 1), "00:00", ctx.timezone));
  const snap = await orgCol(ctx.org.id, "clients").where("createdAt", ">=", start).where("createdAt", "<", end).count().get();
  return snap.data().count;
}

export async function loadDashboard(ctx: AppContext, range: DateRange) {
  const prev = previousRange(range);
  const today = todayKey(ctx.timezone);
  const canSales = can(ctx, "view_sales");
  const canClients = can(ctx, "view_customers");
  const none: TransactionDTO[] = [];

  const [transactions, prevTransactions, todaysSales, appointments, prevAppointments, todays, newClients, prevNewClients, staff, services, categories] =
    await Promise.all([
      canSales ? listTransactions(ctx, range.from, range.to) : none,
      canSales ? listTransactions(ctx, prev.from, prev.to) : none,
      canSales ? listTransactions(ctx, today, today) : none,
      appointmentsIn(ctx, range.from, range.to),
      appointmentsIn(ctx, prev.from, prev.to),
      appointmentsIn(ctx, today, today),
      canClients ? countNewClients(ctx, range) : 0,
      canClients ? countNewClients(ctx, prev) : 0,
      listStaff(ctx.org.id),
      canSales ? listServices(ctx.org.id) : [],
      canSales ? listCategories(ctx.org.id) : [],
    ]);

  const ranked = canSales ? topServices(transactions) : [];
  return {
    canSales,
    canClients,
    kpis: computeKpis({ transactions, prevTransactions, appointments, prevAppointments, newClients, prevNewClients }),
    todaySummary: todaySummary(todaysSales, todays, Date.now()),
    pending: pendingPayments(transactions),
    retention: clientRetention(transactions, prevTransactions),
    staffWorking: staffWorkingToday(staff, weekdayOfKey(today), ctx.scopeBranchIds),
    series: canSales ? revenueSeries(range, prev, transactions, prevTransactions) : [],
    bookings: bookingsSeries(range, prev, appointments, prevAppointments),
    busy: busyHours(appointments, ctx.timezone),
    categories: canSales ? categoryPerformance(transactions, services, categories) : [],
    statuses: statusBreakdown(appointments),
    topServices: ranked,
    topStaff: canSales ? topStaff(transactions) : [],
    today: todays.filter((a) => a.status !== "cancelled"),
    recent: transactions.slice(0, 6),
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
