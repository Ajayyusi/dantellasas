import { describe, expect, it } from "vitest";

import { invoiceNet, revenueSeries, topServices } from "@/features/dashboard/aggregate";
import type { TransactionDTO } from "@/lib/types";

function tx(p: Partial<TransactionDTO>): TransactionDTO {
  return {
    id: "t",
    number: "INV-1",
    branchId: "b",
    dateKey: "2026-09-01",
    status: "paid",
    clientId: null,
    clientName: "",
    appointmentId: null,
    items: [],
    subtotalMinor: 0,
    discountMinor: 0,
    taxMinor: 0,
    totalMinor: 0,
    tipMinor: 0,
    tipStaffId: null,
    paidMinor: 0,
    balanceMinor: 0,
    refundedMinor: 0,
    payments: [],
    paymentMethods: [],
    refunds: [],
    staffIds: [],
    discountCode: "",
    notes: "",
    cashierName: "",
    createdAt: null,
    ...p,
  };
}

const item = (id: string, refId: string, totalMinor: number) => ({
  id,
  type: "service" as const,
  refId,
  name: refId,
  staffId: "s1",
  staffName: "Sara",
  quantity: 1,
  unitPriceMinor: totalMinor,
  discountMinor: 0,
  taxRateBps: 500,
  taxMinor: 0,
  totalMinor,
  commissionMinor: 0,
});

describe("dashboard aggregation", () => {
  it("nets credit notes but not refunded tips", () => {
    expect(
      invoiceNet(
        tx({
          totalMinor: 10000,
          tipMinor: 1000,
          refundedMinor: 3000,
          refunds: [{ id: "r", number: "CRD-1", amountMinor: 3000, tipMinor: 1000, reason: "", methodId: "cash", methodLabel: "", restocked: false, lines: [], at: null, byName: "" }],
        }),
      ),
    ).toBe(8000);
    expect(invoiceNet(tx({ status: "void", totalMinor: 5000 }))).toBe(0);
  });

  it("aligns the previous period day by day", () => {
    const s = revenueSeries(
      { from: "2026-09-08", to: "2026-09-09" },
      { from: "2026-09-06", to: "2026-09-07" },
      [tx({ dateKey: "2026-09-09", totalMinor: 500 })],
      [tx({ dateKey: "2026-09-06", totalMinor: 200 })],
    );
    expect(s).toEqual([
      { dateKey: "2026-09-08", netMinor: 0, prevNetMinor: 200 },
      { dateKey: "2026-09-09", netMinor: 500, prevNetMinor: 0 },
    ]);
  });

  it("ranks services by revenue after line refunds", () => {
    const rows = topServices([
      tx({ items: [item("a", "cut", 15000), item("b", "colour", 20000)], refunds: [{ id: "r", number: "CRD-1", amountMinor: 20000, tipMinor: 0, reason: "", methodId: "cash", methodLabel: "", restocked: false, lines: [{ itemId: "b", quantity: 1, amountMinor: 20000, taxMinor: 0, commissionMinor: 0 }], at: null, byName: "" }] }),
    ]);
    expect(rows[0]).toMatchObject({ id: "cut", revenueMinor: 15000 });
    expect(rows[1]).toMatchObject({ id: "colour", revenueMinor: 0 });
  });
});
