import { eachDayKey, previousRange, type DateRange } from "@/lib/dates";

import type { ReportTransaction, RevenueDay, RevenueReport, RevenueTotals } from "../types";
import { buildLedger } from "./ledger";

export function emptyTotals(): RevenueTotals {
  return { invoices: 0, grossMinor: 0, discountMinor: 0, refundsMinor: 0, netMinor: 0, vatMinor: 0, netExVatMinor: 0, tipsMinor: 0 };
}

function finish<T extends RevenueTotals>(t: T): T {
  t.netMinor = t.grossMinor - t.refundsMinor;
  t.netExVatMinor = t.netMinor - t.vatMinor;
  return t;
}

/**
 * Daily revenue. Gross is what was invoiced (VAT inclusive, after
 * discounts — the Sales page definition); refunds are credit notes excluding
 * refunded tips, on the day they were issued; VAT is output VAT net of
 * credit-note VAT; tips never count as revenue.
 */
export function revenueByDay(transactions: ReportTransaction[], range: DateRange, tz: string): { days: RevenueDay[]; totals: RevenueTotals } {
  const ledger = buildLedger(transactions, range, tz);
  const days = new Map<string, RevenueDay>(eachDayKey(range.from, range.to).map((k) => [k, { dateKey: k, ...emptyTotals() }]));
  const day = (k: string) => {
    let d = days.get(k);
    if (!d) {
      d = { dateKey: k, ...emptyTotals() };
      days.set(k, d);
    }
    return d;
  };
  for (const tx of ledger.invoices) {
    const d = day(tx.dateKey);
    d.invoices += 1;
    d.grossMinor += tx.totalMinor;
    d.discountMinor += tx.discountMinor;
    d.vatMinor += tx.taxMinor;
    d.tipsMinor += tx.tipMinor;
  }
  for (const c of ledger.credits) {
    const d = day(c.dateKey);
    d.refundsMinor += c.amountMinor - c.tipMinor;
    d.vatMinor -= c.taxMinor;
    d.tipsMinor -= c.tipMinor;
  }
  const list = [...days.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).map(finish);
  const totals = emptyTotals();
  for (const d of list) {
    totals.invoices += d.invoices;
    totals.grossMinor += d.grossMinor;
    totals.discountMinor += d.discountMinor;
    totals.refundsMinor += d.refundsMinor;
    totals.vatMinor += d.vatMinor;
    totals.tipsMinor += d.tipsMinor;
  }
  return { days: list, totals: finish(totals) };
}

/** Revenue for `range` plus totals for the equally long period before it. */
export function revenueReport(transactions: ReportTransaction[], range: DateRange, tz: string): RevenueReport {
  const prev = previousRange(range);
  const current = revenueByDay(transactions, range, tz);
  const previous = revenueByDay(transactions, prev, tz).totals;
  return { days: current.days, totals: current.totals, previous, previousRange: prev };
}
