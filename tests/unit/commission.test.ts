import { describe, expect, it } from "vitest";

import { commissionAmount, resolveCommissionRate, ruleSpecificity } from "../../src/features/catalog/commission";
import type { CommissionRuleDTO } from "../../src/lib/types";

const rule = (id: string, over: Partial<CommissionRuleDTO> = {}): CommissionRuleDTO => ({
  id,
  name: id,
  itemType: "service",
  staffId: null,
  serviceId: null,
  rateBps: 1000,
  priority: 0,
  active: true,
  ...over,
});

const defaults = { serviceRateBps: 1500, productRateBps: 500 };

describe("ruleSpecificity", () => {
  it("ranks staff+service > service > staff > general", () => {
    expect(ruleSpecificity({ staffId: "s", serviceId: "v" })).toBe(3);
    expect(ruleSpecificity({ staffId: null, serviceId: "v" })).toBe(2);
    expect(ruleSpecificity({ staffId: "s", serviceId: null })).toBe(1);
    expect(ruleSpecificity({ staffId: null, serviceId: null })).toBe(0);
  });
});

describe("resolveCommissionRate", () => {
  const rules = [
    rule("general", { itemType: "all", rateBps: 800 }),
    rule("staff", { staffId: "maria", rateBps: 1200 }),
    rule("service", { serviceId: "massage", rateBps: 2000 }),
    rule("staff-service", { staffId: "maria", serviceId: "massage", rateBps: 2500 }),
  ];

  it("prefers the staff + service rule", () => {
    expect(
      resolveCommissionRate({ itemType: "service", staffId: "maria", serviceId: "massage", rules, staffDefaults: defaults }),
    ).toEqual({ rateBps: 2500, ruleId: "staff-service" });
  });

  it("falls back to the service rule for other staff", () => {
    expect(
      resolveCommissionRate({ itemType: "service", staffId: "sara", serviceId: "massage", rules, staffDefaults: defaults }),
    ).toEqual({ rateBps: 2000, ruleId: "service" });
  });

  it("uses the staff rule for other services", () => {
    expect(
      resolveCommissionRate({ itemType: "service", staffId: "maria", serviceId: "blowdry", rules, staffDefaults: defaults }),
    ).toEqual({ rateBps: 1200, ruleId: "staff" });
  });

  it("uses the staff record default before business-wide rules", () => {
    expect(
      resolveCommissionRate({ itemType: "service", staffId: "sara", serviceId: "blowdry", rules, staffDefaults: defaults }),
    ).toEqual({ rateBps: 1500, ruleId: null });
    expect(
      resolveCommissionRate({ itemType: "product", staffId: "sara", serviceId: null, rules, staffDefaults: defaults }),
    ).toEqual({ rateBps: 500, ruleId: null });
  });

  it("uses a business-wide rule when the staff record has no rate", () => {
    expect(
      resolveCommissionRate({
        itemType: "product",
        staffId: "sara",
        serviceId: null,
        rules,
        staffDefaults: { serviceRateBps: 0, productRateBps: 0 },
      }),
    ).toEqual({ rateBps: 800, ruleId: "general" });
    expect(resolveCommissionRate({ itemType: "service", staffId: null, serviceId: "x", rules, staffDefaults: null })).toEqual({
      rateBps: 800,
      ruleId: "general",
    });
  });

  it("returns 0 when nothing applies", () => {
    expect(resolveCommissionRate({ itemType: "product", staffId: "a", serviceId: null, rules: [], staffDefaults: null })).toEqual(
      {
        rateBps: 0,
        ruleId: null,
      },
    );
  });

  it("ignores inactive rules and rules for another item type", () => {
    const list = [
      rule("inactive", { staffId: "maria", serviceId: "massage", rateBps: 9000, active: false }),
      rule("product-only", { itemType: "product", staffId: "maria", rateBps: 700 }),
    ];
    expect(
      resolveCommissionRate({
        itemType: "service",
        staffId: "maria",
        serviceId: "massage",
        rules: list,
        staffDefaults: defaults,
      }),
    ).toEqual({ rateBps: 1500, ruleId: null });
    expect(
      resolveCommissionRate({ itemType: "product", staffId: "maria", serviceId: null, rules: list, staffDefaults: defaults }),
    ).toEqual({ rateBps: 700, ruleId: "product-only" });
  });

  it("never applies service-specific rules to products", () => {
    const list = [rule("svc", { itemType: "all", serviceId: "massage", rateBps: 3000 })];
    expect(
      resolveCommissionRate({ itemType: "product", staffId: null, serviceId: "massage", rules: list, staffDefaults: null }),
    ).toEqual({ rateBps: 0, ruleId: null });
  });

  it("breaks ties by priority, then exact item type, then id", () => {
    const list = [
      rule("b-all", { itemType: "all", staffId: "maria", rateBps: 1000, priority: 1 }),
      rule("a-low", { staffId: "maria", rateBps: 1100, priority: 0 }),
      rule("c-high", { staffId: "maria", rateBps: 1300, priority: 5 }),
    ];
    expect(
      resolveCommissionRate({ itemType: "service", staffId: "maria", serviceId: null, rules: list, staffDefaults: null }).ruleId,
    ).toBe("c-high");
    const tie = [
      rule("z-all", { itemType: "all", staffId: "maria", rateBps: 1000 }),
      rule("y-exact", { staffId: "maria", rateBps: 1100 }),
    ];
    expect(
      resolveCommissionRate({ itemType: "service", staffId: "maria", serviceId: null, rules: tie, staffDefaults: null }).ruleId,
    ).toBe("y-exact");
    const ids = [rule("b", { staffId: "maria" }), rule("a", { staffId: "maria" })];
    expect(
      resolveCommissionRate({ itemType: "service", staffId: "maria", serviceId: null, rules: ids, staffDefaults: null }).ruleId,
    ).toBe("a");
  });

  it("clamps out-of-range rates", () => {
    const list = [rule("big", { rateBps: 25000 })];
    expect(
      resolveCommissionRate({ itemType: "service", staffId: null, serviceId: null, rules: list, staffDefaults: null }).rateBps,
    ).toBe(10000);
  });
});

describe("commissionAmount", () => {
  it("applies basis points to the net amount", () => {
    expect(commissionAmount(35000, 1500)).toBe(5250);
    expect(commissionAmount(333, 1000)).toBe(33);
    expect(commissionAmount(-100, 1000)).toBe(0);
  });
});
