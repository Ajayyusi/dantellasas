import type { DateRange } from "@/lib/dates";
import type { AppointmentDTO } from "@/lib/types";

import type { CommissionLine, CommissionStaffRow, CommissionsReport, ReportTransaction, StaffReport, StaffRow } from "../types";
import { buildLedger, lineNet, sortBy } from "./ledger";

type NameOf = (staffId: string, fallback: string) => string;

function emptyRow(staffId: string, name: string): StaffRow {
  return { staffId, name, services: 0, serviceRevenueMinor: 0, productRevenueMinor: 0, revenueMinor: 0, commissionMinor: 0, commissionReversedMinor: 0, tipsMinor: 0, appointments: 0, completed: 0, noShows: 0 };
}

/**
 * Per staff member: services performed (invoice lines), revenue attributed
 * (line totals excluding VAT, net of credit notes), commission earned net of
 * credit-note reversals, tips (net of refunded tips), and appointments they
 * had a line on (cancelled ones excluded from the count).
 */
export function staffReport(
  transactions: ReportTransaction[],
  appointments: AppointmentDTO[],
  range: DateRange,
  tz: string,
  opts: { nameOf: NameOf; showCommission: boolean },
): StaffReport {
  const ledger = buildLedger(transactions, range, tz);
  const rows = new Map<string, StaffRow>();
  const row = (id: string, fallback: string) => {
    let r = rows.get(id);
    if (!r) {
      r = emptyRow(id, opts.nameOf(id, fallback));
      rows.set(id, r);
    }
    return r;
  };
  for (const tx of ledger.invoices) {
    for (const item of tx.items) {
      if (!item.staffId) continue;
      const r = row(item.staffId, item.staffName);
      const net = lineNet(item);
      if (item.type === "service") {
        r.services += item.quantity;
        r.serviceRevenueMinor += net;
      } else if (item.type === "product") {
        r.productRevenueMinor += net;
      }
      r.revenueMinor += net;
      r.commissionMinor = (r.commissionMinor ?? 0) + item.commissionMinor;
    }
    if (tx.tipStaffId && tx.tipMinor) row(tx.tipStaffId, "").tipsMinor += tx.tipMinor;
  }
  for (const c of ledger.creditLines) {
    if (!c.item.staffId) continue;
    const r = row(c.item.staffId, c.item.staffName);
    const net = c.amountMinor - c.taxMinor;
    if (c.item.type === "service") r.serviceRevenueMinor -= net;
    else if (c.item.type === "product") r.productRevenueMinor -= net;
    r.revenueMinor -= net;
    r.commissionMinor = (r.commissionMinor ?? 0) - c.commissionMinor;
    r.commissionReversedMinor = (r.commissionReversedMinor ?? 0) + c.commissionMinor;
  }
  for (const c of ledger.credits) {
    if (c.tipMinor && c.tx.tipStaffId) row(c.tx.tipStaffId, "").tipsMinor -= c.tipMinor;
  }
  for (const a of appointments) {
    if (a.dateKey < range.from || a.dateKey > range.to) continue;
    const people = new Map<string, string>();
    for (const i of a.items) if (i.staffId) people.set(i.staffId, i.staffName);
    for (const [id, name] of people) {
      const r = row(id, name);
      if (a.status === "no_show") r.noShows += 1;
      if (a.status === "cancelled") continue;
      r.appointments += 1;
      if (a.status === "completed") r.completed += 1;
    }
  }
  const list = sortBy([...rows.values()], (r) => r.revenueMinor, (r) => r.name).map((r) =>
    opts.showCommission ? r : { ...r, commissionMinor: null, commissionReversedMinor: null },
  );
  return { rows: list, showCommission: opts.showCommission };
}

/**
 * Commission ledger for payroll: one row per invoice line that earned
 * commission (dated by invoice) and one negative row per credit-note line
 * that reversed it (dated by the credit note).
 */
export function commissionsReport(transactions: ReportTransaction[], range: DateRange, tz: string, nameOf: NameOf): CommissionsReport {
  const ledger = buildLedger(transactions, range, tz);
  const lines: CommissionLine[] = [];
  for (const tx of ledger.invoices) {
    for (const item of tx.items) {
      if (!item.staffId || !item.commissionMinor) continue;
      lines.push({
        id: `${tx.id}:${item.id}`,
        kind: "sale",
        dateKey: tx.dateKey,
        txId: tx.id,
        invoiceNumber: tx.number,
        creditNumber: "",
        staffId: item.staffId,
        staffName: nameOf(item.staffId, item.staffName),
        itemName: item.name,
        itemType: item.type,
        quantity: item.quantity,
        baseMinor: lineNet(item),
        commissionMinor: item.commissionMinor,
      });
    }
  }
  for (const c of ledger.creditLines) {
    if (!c.item.staffId || !c.commissionMinor) continue;
    lines.push({
      id: `${c.tx.id}:${c.note.id}:${c.item.id}`,
      kind: "reversal",
      dateKey: c.note.dateKey,
      txId: c.tx.id,
      invoiceNumber: c.tx.number,
      creditNumber: c.note.number,
      staffId: c.item.staffId,
      staffName: nameOf(c.item.staffId, c.item.staffName),
      itemName: c.item.name,
      itemType: c.item.type,
      quantity: -c.quantity,
      baseMinor: -(c.amountMinor - c.taxMinor),
      commissionMinor: -c.commissionMinor,
    });
  }
  lines.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.invoiceNumber.localeCompare(b.invoiceNumber) || a.kind.localeCompare(b.kind));

  const staff = new Map<string, CommissionStaffRow>();
  for (const l of lines) {
    const s = staff.get(l.staffId) ?? { staffId: l.staffId, name: l.staffName, lines: 0, baseMinor: 0, earnedMinor: 0, reversedMinor: 0, netMinor: 0 };
    s.lines += 1;
    s.baseMinor += l.baseMinor;
    if (l.kind === "sale") s.earnedMinor += l.commissionMinor;
    else s.reversedMinor -= l.commissionMinor;
    s.netMinor += l.commissionMinor;
    staff.set(l.staffId, s);
  }
  return { lines, staff: sortBy([...staff.values()], (s) => s.netMinor, (s) => s.name) };
}
