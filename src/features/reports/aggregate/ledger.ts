import { dateKeyOf, type DateRange } from "@/lib/dates";

import type { ReportItem, ReportTransaction } from "../types";

/**
 * Splits invoices into the two event streams every report is built from:
 * invoice lines dated by the invoice, and credit-note lines dated by the day
 * the credit note was issued (business time zone).
 */

export interface CreditNoteEvent {
  tx: ReportTransaction;
  id: string;
  number: string;
  dateKey: string;
  /** Total credited, including any refunded tip. */
  amountMinor: number;
  tipMinor: number;
  taxMinor: number;
  methodId: string;
  methodLabel: string;
}

export interface CreditLineEvent {
  tx: ReportTransaction;
  note: CreditNoteEvent;
  item: ReportItem;
  quantity: number;
  amountMinor: number;
  taxMinor: number;
  commissionMinor: number;
}

export interface Ledger {
  /** Non-void invoices dated inside the range. */
  invoices: ReportTransaction[];
  /** Credit notes issued inside the range (from any loaded invoice). */
  credits: CreditNoteEvent[];
  creditLines: CreditLineEvent[];
}

export function inRange(key: string, range: DateRange): boolean {
  return key >= range.from && key <= range.to;
}

/** De-duplicates invoices loaded by several queries (range + refund look-back). */
export function mergeTransactions(...lists: ReportTransaction[][]): ReportTransaction[] {
  const byId = new Map<string, ReportTransaction>();
  for (const list of lists) for (const t of list) byId.set(t.id, t);
  return [...byId.values()];
}

export function buildLedger(transactions: ReportTransaction[], range: DateRange, tz: string): Ledger {
  const invoices: ReportTransaction[] = [];
  const credits: CreditNoteEvent[] = [];
  const creditLines: CreditLineEvent[] = [];
  for (const tx of transactions) {
    if (tx.status === "void") continue;
    if (inRange(tx.dateKey, range)) invoices.push(tx);
    for (const r of tx.refunds) {
      const dateKey = r.at ? dateKeyOf(new Date(r.at), tz) : tx.dateKey;
      if (!inRange(dateKey, range)) continue;
      const note: CreditNoteEvent = {
        tx,
        id: r.id,
        number: r.number,
        dateKey,
        amountMinor: r.amountMinor,
        tipMinor: r.tipMinor,
        taxMinor: r.lines.reduce((s, l) => s + l.taxMinor, 0),
        methodId: r.methodId,
        methodLabel: r.methodLabel,
      };
      credits.push(note);
      for (const l of r.lines) {
        const item = tx.items.find((i) => i.id === l.itemId);
        if (!item) continue;
        creditLines.push({ tx, note, item, quantity: l.quantity, amountMinor: l.amountMinor, taxMinor: l.taxMinor, commissionMinor: l.commissionMinor });
      }
    }
  }
  return { invoices, credits, creditLines };
}

/** Line value excluding VAT, after discounts. */
export function lineNet(item: Pick<ReportItem, "totalMinor" | "taxMinor">): number {
  return item.totalMinor - item.taxMinor;
}

export function ratio(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

export function sortBy<T>(rows: T[], value: (r: T) => number, tie: (r: T) => string): T[] {
  return rows.sort((a, b) => value(b) - value(a) || tie(a).localeCompare(tie(b)));
}
