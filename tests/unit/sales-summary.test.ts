import { describe, expect, it } from "vitest";

import { discountRows } from "@/features/sales/invoice-lines";
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
    memberDiscountMinor: 0,
    orderDiscountMinor: 0,
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

describe("discountRows", () => {
  const labels = { discount: "Discount", member: "Member discount" };
  const row = (d: number, member: number, order: number, code = "") => ({ discountMinor: d, memberDiscountMinor: member, orderDiscountMinor: order, discountCode: code });
  it("splits membership, code and manual discounts", () => {
    expect(discountRows(row(3860, 1200, 2160, "AUTUMN"), labels)).toEqual([
      { label: "Member discount", amountMinor: 1200 },
      { label: "Discount (AUTUMN)", amountMinor: 2160 },
      { label: "Discount", amountMinor: 500 },
    ]);
  });
  it("merges manual order and line discounts when no code was used", () => {
    expect(discountRows(row(1500, 0, 1000), labels)).toEqual([{ label: "Discount", amountMinor: 1500 }]);
  });
  it("keeps one combined line for invoices saved before the split", () => {
    expect(discountRows(row(3360, 0, 0, "OLD"), labels)).toEqual([{ label: "Discount (OLD)", amountMinor: 3360 }]);
    expect(discountRows(row(0, 0, 0), labels)).toEqual([]);
  });
});
