import "server-only";

import { listAppointments } from "@/features/appointments/queries";
import { listMembershipPlans, listPackages } from "@/features/catalog/queries";
import { listExpenseCategories, listExpenses } from "@/features/expenses/queries";
import { listProducts } from "@/features/inventory/queries";
import { listCategories, listServices } from "@/features/services/queries";
import { listStaff } from "@/features/staff/queries";
import { previousRange, type DateRange } from "@/lib/dates";
import { can, ownAppointmentsOnly, type AppContext } from "@/lib/tenancy/context";
import type { AppointmentDTO } from "@/lib/types";

import { appointmentsReport } from "./aggregate/appointments";
import { prepaidReport, productsReport, servicesReport } from "./aggregate/catalog";
import { clientsReport } from "./aggregate/clients";
import { buildLedger, mergeTransactions } from "./aggregate/ledger";
import { paymentsReport, profitReport, vatReport } from "./aggregate/finance";
import { revenueReport } from "./aggregate/revenue";
import { commissionsReport, staffReport } from "./aggregate/staff";
import { clientHistories, prepaidLiability, REFUND_LOOKBACK_DAYS, refundedTransactions, reportTransactions } from "./queries";
import { REPORT_PERMISSION, type LoadedReport, type ReportId, type ReportMeta, type ReportTransaction } from "./types";

/** Whether the member may open a report (all need view_reports, some one more permission). */
export function canViewReport(ctx: AppContext, id: ReportId): boolean {
  const extra = REPORT_PERMISSION[id];
  return can(ctx, "view_reports") && (!extra || can(ctx, extra));
}

/** Invoices for the range plus older invoices refunded inside it. */
async function salesFor(ctx: AppContext, range: DateRange): Promise<{ txs: ReportTransaction[]; capped: boolean }> {
  const [inRange, refunded] = await Promise.all([reportTransactions(ctx, range), refundedTransactions(ctx, range)]);
  return { txs: mergeTransactions(inRange.rows, refunded.rows), capped: inRange.capped || refunded.capped };
}

async function appointmentsFor(ctx: AppContext, range: DateRange): Promise<AppointmentDTO[]> {
  const lists = await Promise.all(ctx.scopeBranchIds.map((b) => listAppointments(ctx, b, range.from, range.to)));
  return lists.flat();
}

async function staffNames(orgId: string) {
  const staff = await listStaff(orgId);
  const names = new Map(staff.map((s) => [s.id, s.displayName]));
  return (id: string, fallback: string) => names.get(id) || fallback || "—";
}

/**
 * Loads and aggregates one report. Callers must have checked
 * `canViewReport`; data is already limited to the member's branch scope.
 */
export async function loadReport(ctx: AppContext, id: ReportId, range: DateRange): Promise<LoadedReport> {
  const tz = ctx.timezone;
  const meta: ReportMeta = { capped: false, lookbackDays: REFUND_LOOKBACK_DAYS };

  switch (id) {
    case "revenue": {
      const prev = previousRange(range);
      const [cur, before, refunded] = await Promise.all([
        reportTransactions(ctx, range),
        reportTransactions(ctx, prev),
        refundedTransactions(ctx, { from: prev.from, to: range.to }),
      ]);
      meta.capped = cur.capped || before.capped || refunded.capped;
      return { id, meta, data: revenueReport(mergeTransactions(cur.rows, before.rows, refunded.rows), range, tz) };
    }
    case "services": {
      const [{ txs, capped }, services, categories] = await Promise.all([salesFor(ctx, range), listServices(ctx.org.id), listCategories(ctx.org.id)]);
      meta.capped = capped;
      return { id, meta, data: servicesReport(txs, range, tz, { services, categories }) };
    }
    case "products": {
      const [{ txs, capped }, products] = await Promise.all([salesFor(ctx, range), listProducts(ctx.org.id)]);
      meta.capped = capped;
      return { id, meta, data: productsReport(txs, range, tz, products, ctx.scopeBranchIds) };
    }
    case "packages": {
      const [{ txs, capped }, packages, plans, liability] = await Promise.all([
        salesFor(ctx, range),
        listPackages(ctx.org.id),
        listMembershipPlans(ctx.org.id),
        prepaidLiability(ctx.org.id),
      ]);
      meta.capped = capped;
      const methods = new Map(ctx.settings.payments.methods.map((m) => [m.id, m.type]));
      const names = [...packages, ...plans].map((p) => ({ id: p.id, name: p.name, nameAr: p.nameAr }));
      return { id, meta, data: prepaidReport(txs, range, tz, { names, methodType: (m) => methods.get(m), liability }) };
    }
    case "payments": {
      const { txs, capped } = await salesFor(ctx, range);
      meta.capped = capped;
      return { id, meta, data: paymentsReport(txs, range, tz, ctx.settings.payments.methods) };
    }
    case "staff": {
      const [{ txs, capped }, appointments, nameOf] = await Promise.all([salesFor(ctx, range), appointmentsFor(ctx, range), staffNames(ctx.org.id)]);
      meta.capped = capped;
      meta.ownAppointmentsOnly = ownAppointmentsOnly(ctx);
      return { id, meta, data: staffReport(txs, appointments, range, tz, { nameOf, showCommission: can(ctx, "view_commissions") }) };
    }
    case "commissions": {
      const [{ txs, capped }, nameOf] = await Promise.all([salesFor(ctx, range), staffNames(ctx.org.id)]);
      meta.capped = capped;
      return { id, meta, data: commissionsReport(txs, range, tz, nameOf) };
    }
    case "clients": {
      const { txs, capped } = await salesFor(ctx, range);
      const ids = buildLedger(txs, range, tz).invoices.flatMap((t) => (t.clientId ? [t.clientId] : []));
      const history = await clientHistories(ctx, ids);
      meta.capped = capped || history.capped;
      return { id, meta, data: clientsReport(txs, range, tz, history.rows) };
    }
    case "appointments": {
      const appointments = await appointmentsFor(ctx, range);
      meta.ownAppointmentsOnly = ownAppointmentsOnly(ctx);
      return { id, meta, data: appointmentsReport(appointments, range, tz, ctx.settings.locale.weekStartsOn) };
    }
    case "expenses": {
      const [{ txs, capped }, expenses, products, categories] = await Promise.all([
        salesFor(ctx, range),
        listExpenses(ctx, range),
        listProducts(ctx.org.id),
        listExpenseCategories(ctx.org.id),
      ]);
      meta.capped = capped || expenses.length >= 2000;
      const cost = new Map(products.map((p) => [p.id, p.costMinor]));
      return { id, meta, data: profitReport(txs, expenses, range, tz, { costOf: (pid) => cost.get(pid), categories }) };
    }
    case "vat": {
      const [{ txs, capped }, expenses] = await Promise.all([salesFor(ctx, range), listExpenses(ctx, range)]);
      meta.capped = capped || expenses.length >= 2000;
      return { id, meta, data: vatReport(txs, expenses, range, tz) };
    }
  }
}
