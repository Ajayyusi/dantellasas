import type { TransactionDTO } from "@/lib/types";

export interface DiscountRow {
  label: string;
  amountMinor: number;
}

/**
 * Discount lines for an invoice's totals: the membership discount, the code
 * (when one was used) and the remaining manual discounts, each on its own
 * line. Invoices saved before the split was recorded keep one combined line.
 * Shared by the sale page and the printed receipt.
 */
export function discountRows(
  tx: Pick<TransactionDTO, "discountMinor" | "memberDiscountMinor" | "orderDiscountMinor" | "discountCode">,
  labels: { discount: string; member: string },
): DiscountRow[] {
  const codeLabel = tx.discountCode ? `${labels.discount} (${tx.discountCode})` : labels.discount;
  if (tx.memberDiscountMinor + tx.orderDiscountMinor <= 0) {
    return tx.discountMinor > 0 ? [{ label: codeLabel, amountMinor: tx.discountMinor }] : [];
  }
  const manual = Math.max(0, tx.discountMinor - tx.memberDiscountMinor - tx.orderDiscountMinor);
  const rows: DiscountRow[] = [{ label: labels.member, amountMinor: tx.memberDiscountMinor }];
  if (tx.discountCode) rows.push({ label: codeLabel, amountMinor: tx.orderDiscountMinor }, { label: labels.discount, amountMinor: manual });
  else rows.push({ label: labels.discount, amountMinor: tx.orderDiscountMinor + manual });
  return rows.filter((r) => r.amountMinor > 0);
}
