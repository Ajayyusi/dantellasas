import { describe, expect, it } from "vitest";

import { priceSale, taxableAtSale } from "../../src/features/sales/pricing";

const svc = (price: number, extra: Partial<Parameters<typeof priceSale>[0][number]> = {}) => ({
  type: "service" as const,
  quantity: 1,
  unitPriceMinor: price,
  discountMinor: 0,
  taxRateBps: 500,
  ...extra,
});

describe("priceSale", () => {
  it("prices a simple VAT-inclusive ticket", () => {
    const r = priceSale([svc(15000), svc(12000)], { pricesIncludeTax: true });
    expect(r.totalMinor).toBe(27000);
    expect(r.taxMinor).toBe(714 + 571); // VAT is rounded per line
    expect(r.dueMinor).toBe(27000);
  });

  it("applies member discounts per item type", () => {
    const r = priceSale(
      [svc(10000), { type: "product", quantity: 2, unitPriceMinor: 5000, discountMinor: 0, taxRateBps: 500 }],
      { pricesIncludeTax: true, member: { serviceDiscountBps: 1000, productDiscountBps: 500 } },
    );
    expect(r.lines[0]!.memberDiscountMinor).toBe(1000);
    expect(r.lines[1]!.memberDiscountMinor).toBe(500);
    expect(r.totalMinor).toBe(9000 + 9500);
  });

  it("limits an order discount to eligible lines", () => {
    const r = priceSale(
      [svc(20000), { type: "product", quantity: 1, unitPriceMinor: 10000, discountMinor: 0, taxRateBps: 500 }, { type: "gift_card", quantity: 1, unitPriceMinor: 50000, discountMinor: 0, taxRateBps: 0 }],
      { pricesIncludeTax: true, orderDiscount: { kind: "percent", valueBps: 1000, valueMinor: 0, appliesTo: "services" } },
    );
    expect(r.orderDiscountMinor).toBe(2000);
    expect(r.lines[1]!.orderDiscountMinor).toBe(0);
    expect(r.lines[2]!.orderDiscountMinor).toBe(0);
    expect(r.totalMinor).toBe(18000 + 10000 + 50000);
  });

  it("caps fixed discounts at the eligible value and adds tips outside VAT", () => {
    const r = priceSale([svc(3000)], {
      pricesIncludeTax: true,
      orderDiscount: { kind: "fixed", valueBps: 0, valueMinor: 5000, appliesTo: "all" },
      tipMinor: 2000,
    });
    expect(r.totalMinor).toBe(0);
    expect(r.taxMinor).toBe(0);
    expect(r.dueMinor).toBe(2000);
  });

  it("treats vouchers as taxable only on redemption", () => {
    expect(taxableAtSale("gift_card")).toBe(false);
    expect(taxableAtSale("package", "credit")).toBe(false);
    expect(taxableAtSale("package", "services")).toBe(true);
    expect(taxableAtSale("membership")).toBe(true);
  });
});
