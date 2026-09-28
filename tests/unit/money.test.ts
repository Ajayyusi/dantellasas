import { describe, expect, it } from "vitest";

import { computeTicket, splitTax, toMinor } from "../../src/lib/money";

describe("toMinor", () => {
  it("rounds to fils", () => {
    expect(toMinor(150)).toBe(15000);
    expect(toMinor("99.995")).toBe(10000);
    expect(toMinor("AED 1,250.50")).toBe(125050);
    expect(toMinor("abc")).toBe(0);
  });
});

describe("splitTax", () => {
  it("extracts VAT from inclusive prices (UAE 5%)", () => {
    // 220 incl. VAT → 209.52 + 10.48 (as observed on the reference invoice)
    expect(splitTax(22000, 500, true)).toEqual({ netMinor: 20952, taxMinor: 1048, grossMinor: 22000 });
  });
  it("adds VAT to exclusive prices", () => {
    expect(splitTax(10000, 500, false)).toEqual({ netMinor: 10000, taxMinor: 500, grossMinor: 10500 });
  });
  it("handles exempt items", () => {
    expect(splitTax(10000, 0, true)).toEqual({ netMinor: 10000, taxMinor: 0, grossMinor: 10000 });
  });
});

describe("computeTicket", () => {
  it("sums lines with quantity and line discounts", () => {
    const r = computeTicket(
      [
        { unitPriceMinor: 15000, quantity: 1, taxRateBps: 500 },
        { unitPriceMinor: 4000, quantity: 2, discountMinor: 1000, taxRateBps: 500 },
      ],
      0,
      true,
    );
    expect(r.subtotalMinor).toBe(23000);
    expect(r.discountMinor).toBe(1000);
    expect(r.totalMinor).toBe(22000);
    expect(r.taxMinor).toBe(r.lines.reduce((s, l) => s + l.taxMinor, 0));
  });

  it("spreads the order discount proportionally and exactly", () => {
    const r = computeTicket(
      [
        { unitPriceMinor: 10000, quantity: 1, taxRateBps: 500 },
        { unitPriceMinor: 5000, quantity: 1, taxRateBps: 500 },
        { unitPriceMinor: 3333, quantity: 1, taxRateBps: 0 },
      ],
      1001,
      true,
    );
    const shares = r.lines.map((l) => l.orderDiscountShareMinor);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1001);
    expect(r.totalMinor).toBe(10000 + 5000 + 3333 - 1001);
  });

  it("never discounts below zero", () => {
    const r = computeTicket([{ unitPriceMinor: 5000, quantity: 1, taxRateBps: 500 }], 999999, true);
    expect(r.totalMinor).toBe(0);
    expect(r.taxMinor).toBe(0);
  });

  it("adds tax on top when prices exclude tax", () => {
    const r = computeTicket([{ unitPriceMinor: 10000, quantity: 1, taxRateBps: 500 }], 0, false);
    expect(r.totalMinor).toBe(10500);
    expect(r.taxMinor).toBe(500);
  });
});
