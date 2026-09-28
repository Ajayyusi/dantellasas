import { describe, expect, it } from "vitest";

import { cashSuggestions, settle } from "@/features/sales/payments";

describe("settle", () => {
  it("reports what is still due", () => {
    const s = settle([{ key: "a", methodType: "card", amountMinor: 3000 }], 10000);
    expect(s.remainingMinor).toBe(7000);
    expect(s.changeMinor).toBe(0);
    expect(s.paidMinor).toBe(3000);
  });

  it("gives change from cash and records only the amount due", () => {
    const s = settle(
      [
        { key: "a", methodType: "card", amountMinor: 4000 },
        { key: "b", methodType: "cash", amountMinor: 10000 },
      ],
      10500,
    );
    expect(s.changeMinor).toBe(3500);
    expect(s.paidMinor).toBe(10500);
    expect(s.recorded.get("b")).toBe(6500);
    expect(s.recorded.get("a")).toBe(4000);
    expect(s.overpaid).toBe(false);
  });

  it("refuses overpayment without enough cash", () => {
    const s = settle([{ key: "a", methodType: "card", amountMinor: 12000 }], 10000);
    expect(s.overpaid).toBe(true);
  });
});

describe("cashSuggestions", () => {
  it("offers exact plus round notes", () => {
    expect(cashSuggestions(18375)).toEqual([18375, 19000, 20000, 50000]);
    expect(cashSuggestions(0)).toEqual([]);
  });
});
