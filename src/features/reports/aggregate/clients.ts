import type { DateRange } from "@/lib/dates";

import type { ClientRow, ClientsReport, ReportTransaction } from "../types";
import { buildLedger, inRange, sortBy } from "./ledger";

export interface ClientHistory {
  /** Business-day key of the client's first ever visit, if known. */
  firstVisitKey: string | null;
  /** Business-day key the client record was created. */
  createdKey: string | null;
}

/**
 * Clients who bought something in the range. A client is "new" when their
 * first ever visit falls inside the range (or, with no visit recorded yet,
 * when their record was created inside it); everyone else is returning.
 * Spend is VAT inclusive, excludes tips and is net of credit notes.
 * Visits are distinct days with an invoice.
 */
export function clientsReport(transactions: ReportTransaction[], range: DateRange, tz: string, history: Map<string, ClientHistory>): ClientsReport {
  const ledger = buildLedger(transactions, range, tz);
  const rows = new Map<string, ClientRow & { days: Set<string> }>();
  let walkInInvoices = 0;
  let walkInSpendMinor = 0;
  const row = (tx: ReportTransaction) => {
    const id = tx.clientId!;
    let r = rows.get(id);
    if (!r) {
      r = { clientId: id, name: tx.clientName, invoices: 0, visits: 0, spendMinor: 0, avgTicketMinor: 0, firstVisitKey: null, lastVisitKey: null, isNew: false, days: new Set() };
      rows.set(id, r);
    }
    return r;
  };
  for (const tx of ledger.invoices) {
    if (!tx.clientId) {
      walkInInvoices += 1;
      walkInSpendMinor += tx.totalMinor;
      continue;
    }
    const r = row(tx);
    r.invoices += 1;
    r.spendMinor += tx.totalMinor;
    r.days.add(tx.dateKey);
    if (!r.lastVisitKey || tx.dateKey > r.lastVisitKey) r.lastVisitKey = tx.dateKey;
    if (tx.clientName) r.name = tx.clientName;
  }
  for (const c of ledger.credits) {
    const credit = c.amountMinor - c.tipMinor;
    if (!c.tx.clientId) {
      walkInSpendMinor -= credit;
      continue;
    }
    // Credit notes on clients with no purchase in the range still reduce spend, but don't make them "served".
    const r = rows.get(c.tx.clientId);
    if (r) r.spendMinor -= credit;
  }
  const list: ClientRow[] = [...rows.values()].map(({ days, ...r }) => {
    const h = history.get(r.clientId);
    const firstVisitKey = h?.firstVisitKey ?? null;
    const isNew = firstVisitKey ? inRange(firstVisitKey, range) || firstVisitKey > range.to : h?.createdKey ? inRange(h.createdKey, range) : false;
    return { ...r, visits: days.size, avgTicketMinor: r.invoices ? Math.round(r.spendMinor / r.invoices) : 0, firstVisitKey, isNew };
  });
  sortBy(list, (r) => r.spendMinor, (r) => r.name);
  const newCount = list.filter((r) => r.isNew).length;
  return {
    rows: list,
    summary: {
      served: list.length,
      newCount,
      returningCount: list.length - newCount,
      spendMinor: list.reduce((s, r) => s + r.spendMinor, 0),
      walkInInvoices,
      walkInSpendMinor,
    },
  };
}
