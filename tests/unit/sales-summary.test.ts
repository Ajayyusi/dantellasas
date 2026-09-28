import { describe, expect, it } from "vitest";

import { summarizeSales } from "@/features/sales/summary";
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

describe("summarizeSales", () => {
  it("nets refunds and keeps tips out of revenue", () => {
    const s = summarizeSales([
      tx({ totalMinor: 21000, taxMinor: 1000, tipMinor: 2000, paidMinor: 23000 }),
      tx({
        status: "partially_refunded",
        totalMinor: 10500,
        taxMinor: 500,
        paidMinor: 10500,
        refundedMinor: 5250,
        refunds: [
          { id: "r", number: "CRD-000001", amountMinor: 5250, tipMinor: 0, reason: "x", methodId: "cash", methodLabel: "Cash", restocked: false, lines: [{ itemId: "i", quantity: 1, amountMinor: 5250, taxMinor: 250, commissionMinor: 0 }], at: null, byName: "" },
        ],
      }),
      tx({ status: "void", totalMinor: 99999 }),
    ]);
    expect(s.count).toBe(2);
    expect(s.grossMinor).toBe(31500);
    expect(s.refundsMinor).toBe(5250);
    expect(s.netMinor).toBe(26250);
    expect(s.vatMinor).toBe(1250);
    expect(s.tipsMinor).toBe(2000);
  });
});
