import type { TransactionDTO } from "@/lib/types";

/**
 * Money totals for a set of invoices. Void invoices are ignored; refunds are
 * credit notes, so gross is what was invoiced and net is gross minus credits.
 * Tips are tracked separately and never count as revenue.
 */
export interface SalesSummary {
  count: number;
  grossMinor: number;
  discountMinor: number;
  refundsMinor: number;
  netMinor: number;
  vatMinor: number;
  tipsMinor: number;
  balanceMinor: number;
  paidMinor: number;
}

export function summarizeSales(transactions: TransactionDTO[]): SalesSummary {
  const s: SalesSummary = { count: 0, grossMinor: 0, discountMinor: 0, refundsMinor: 0, netMinor: 0, vatMinor: 0, tipsMinor: 0, balanceMinor: 0, paidMinor: 0 };
  for (const tx of transactions) {
    if (tx.status === "void") continue;
    s.count += 1;
    s.grossMinor += tx.totalMinor;
    s.discountMinor += tx.discountMinor;
    s.tipsMinor += tx.tipMinor;
    s.balanceMinor += tx.balanceMinor;
    s.paidMinor += tx.paidMinor;
    let refundTax = 0;
    let refundTip = 0;
    for (const r of tx.refunds) {
      refundTip += r.tipMinor;
      refundTax += r.lines.reduce((sum, l) => sum + l.taxMinor, 0);
    }
    s.refundsMinor += tx.refundedMinor - refundTip;
    s.tipsMinor -= refundTip;
    s.vatMinor += tx.taxMinor - refundTax;
  }
  s.netMinor = s.grossMinor - s.refundsMinor;
  return s;
}
