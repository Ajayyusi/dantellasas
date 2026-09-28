import type { DateRange } from "@/lib/dates";
import type { PaymentMethodType } from "@/lib/settings";
import type { ExpenseDTO } from "@/lib/types";

import type { ExpenseCategoryRow, PaymentMethodRow, PaymentsReport, ProfitReport, ReportTransaction, VatReport, VatRow } from "../types";
import { buildLedger, ratio, sortBy } from "./ledger";
import { revenueByDay } from "./revenue";

type ExpenseInput = Pick<ExpenseDTO, "dateKey" | "categoryId" | "categoryName" | "amountMinor" | "taxMinor">;

// ── Expenses & profit ────────────────────────────────────────────────

/**
 * Profit estimate: revenue excluding VAT (net of credit notes) − cost of
 * products sold at current cost prices − expenses excluding recoverable
 * VAT. Expenses count on their expense date as entered (cash basis).
 */
export function profitReport(
  transactions: ReportTransaction[],
  expenses: ExpenseInput[],
  range: DateRange,
  tz: string,
  opts: { costOf: (productId: string) => number | undefined; categories: { id: string; name: string; nameAr: string }[] },
): ProfitReport {
  const revenue = revenueByDay(transactions, range, tz).totals;
  const ledger = buildLedger(transactions, range, tz);
  let cogsMinor = 0;
  let unitsWithoutCost = 0;
  for (const tx of ledger.invoices) {
    for (const item of tx.items) {
      if (item.type !== "product") continue;
      const cost = opts.costOf(item.refId);
      if (!cost) unitsWithoutCost += item.quantity;
      cogsMinor += (cost ?? 0) * item.quantity;
    }
  }
  for (const c of ledger.creditLines) {
    if (c.item.type === "product") cogsMinor -= (opts.costOf(c.item.refId) ?? 0) * c.quantity;
  }

  const catById = new Map(opts.categories.map((c) => [c.id, c]));
  const cats = new Map<string, ExpenseCategoryRow>();
  let expensesMinor = 0;
  let expenseVatMinor = 0;
  for (const e of expenses) {
    if (e.dateKey < range.from || e.dateKey > range.to) continue;
    const c = catById.get(e.categoryId);
    const row = cats.get(e.categoryId) ?? { categoryId: e.categoryId, name: c?.name ?? e.categoryName, nameAr: c?.nameAr ?? "", count: 0, amountMinor: 0, taxMinor: 0, netMinor: 0, share: 0 };
    row.count += 1;
    row.amountMinor += e.amountMinor;
    row.taxMinor += e.taxMinor;
    row.netMinor += e.amountMinor - e.taxMinor;
    cats.set(e.categoryId, row);
    expensesMinor += e.amountMinor;
    expenseVatMinor += e.taxMinor;
  }
  const categories = sortBy(
    [...cats.values()].map((r) => ({ ...r, share: expensesMinor > 0 ? r.amountMinor / expensesMinor : 0 })),
    (r) => r.amountMinor,
    (r) => r.name,
  );
  const expensesExVatMinor = expensesMinor - expenseVatMinor;
  const grossProfitMinor = revenue.netExVatMinor - cogsMinor;
  const profitMinor = grossProfitMinor - expensesExVatMinor;
  return {
    categories,
    revenueExVatMinor: revenue.netExVatMinor,
    cogsMinor,
    grossProfitMinor,
    expensesMinor,
    expensesExVatMinor,
    expenseVatMinor,
    profitMinor,
    margin: ratio(profitMinor, revenue.netExVatMinor),
    unitsWithoutCost,
  };
}

// ── Payment methods ──────────────────────────────────────────────────

/**
 * Money taken per payment method on invoices dated in the range (tips
 * included — they are paid through the same tender), minus credit notes
 * issued in the range, by the method the refund was paid out with.
 */
export function paymentsReport(
  transactions: ReportTransaction[],
  range: DateRange,
  tz: string,
  methods: { id: string; label: string; type: PaymentMethodType }[],
): PaymentsReport {
  const ledger = buildLedger(transactions, range, tz);
  const known = new Map(methods.map((m) => [m.id, m]));
  const rows = new Map<string, PaymentMethodRow>();
  const row = (methodId: string, label: string, type: PaymentMethodType) => {
    let r = rows.get(methodId);
    if (!r) {
      const m = known.get(methodId);
      r = { methodId, label: m?.label ?? label, type: m?.type ?? type, count: 0, collectedMinor: 0, refundedMinor: 0, netMinor: 0, share: 0 };
      rows.set(methodId, r);
    }
    return r;
  };
  for (const tx of ledger.invoices) {
    for (const p of tx.payments) {
      const r = row(p.methodId, p.label, p.methodType);
      r.count += 1;
      r.collectedMinor += p.amountMinor;
    }
  }
  for (const c of ledger.credits) row(c.methodId, c.methodLabel, "other").refundedMinor += c.amountMinor;
  const list = [...rows.values()].map((r) => ({ ...r, netMinor: r.collectedMinor - r.refundedMinor }));
  const net = list.reduce((s, r) => s + r.netMinor, 0);
  return {
    rows: sortBy(list.map((r) => ({ ...r, share: net > 0 ? r.netMinor / net : 0 })), (r) => r.netMinor, (r) => r.label),
    totals: {
      collectedMinor: list.reduce((s, r) => s + r.collectedMinor, 0),
      refundedMinor: list.reduce((s, r) => s + r.refundedMinor, 0),
      netMinor: net,
    },
  };
}

// ── VAT ──────────────────────────────────────────────────────────────

/**
 * VAT summary: output VAT per rate from invoice lines, VAT reversed by
 * credit notes issued in the range (per the original line's rate), and
 * input VAT recorded on expenses. Net = output − credit notes − input.
 */
export function vatReport(transactions: ReportTransaction[], expenses: ExpenseInput[], range: DateRange, tz: string): VatReport {
  const ledger = buildLedger(transactions, range, tz);
  const rows = new Map<string, VatRow>();
  const add = (kind: VatRow["kind"], rateBps: number | null, taxable: number, vat: number) => {
    const key = `${kind}:${rateBps ?? "-"}`;
    const r = rows.get(key) ?? { key, kind, rateBps, taxableMinor: 0, vatMinor: 0 };
    r.taxableMinor += taxable;
    r.vatMinor += vat;
    rows.set(key, r);
  };
  for (const tx of ledger.invoices) for (const i of tx.items) add("output", i.taxRateBps, i.totalMinor - i.taxMinor, i.taxMinor);
  for (const c of ledger.creditLines) add("credit", c.item.taxRateBps, c.amountMinor - c.taxMinor, c.taxMinor);
  for (const e of expenses) {
    if (e.dateKey < range.from || e.dateKey > range.to) continue;
    add("input", null, e.amountMinor - e.taxMinor, e.taxMinor);
  }
  const order = { output: 0, credit: 1, input: 2 } as const;
  const list = [...rows.values()].sort((a, b) => order[a.kind] - order[b.kind] || (b.rateBps ?? 0) - (a.rateBps ?? 0));
  const sum = (kind: VatRow["kind"]) => list.filter((r) => r.kind === kind).reduce((s, r) => s + r.vatMinor, 0);
  const outputMinor = sum("output");
  const creditMinor = sum("credit");
  const inputMinor = sum("input");
  return { rows: list, outputMinor, creditMinor, inputMinor, netMinor: outputMinor - creditMinor - inputMinor };
}
