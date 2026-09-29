import { describe, expect, it } from "vitest";

import { productDisplayName, stockStatus } from "../../src/features/inventory/types";

describe("productDisplayName", () => {
  it("prefixes the brand", () => {
    expect(productDisplayName("Kérastase", "Elixir Ultime Hair Oil 100ml")).toBe("Kérastase Elixir Ultime Hair Oil 100ml");
  });
  it("doesn't repeat a brand the name already starts with", () => {
    expect(productDisplayName("Moroccanoil", "Moroccanoil Treatment 100ml")).toBe("Moroccanoil Treatment 100ml");
    expect(productDisplayName("OPI", "opi Nail Lacquer")).toBe("opi Nail Lacquer");
  });
  it("copes with a missing brand or name", () => {
    expect(productDisplayName("", "Cotton pads")).toBe("Cotton pads");
    expect(productDisplayName("Wella ", " ")).toBe("Wella");
  });
});

describe("stockStatus", () => {
  const p = (stock: Record<string, number>, minStock = 3, trackStock = true) => ({ stock, minStock, trackStock });
  it("reads one branch or all branches in scope", () => {
    expect(stockStatus(p({ a: 10 }), "a", ["a", "b"])).toBe("in_stock");
    expect(stockStatus(p({ a: 2 }), "a", ["a", "b"])).toBe("low");
    expect(stockStatus(p({ a: 0 }), "a", ["a", "b"])).toBe("out");
    // Low when any branch in scope is at or below the minimum.
    expect(stockStatus(p({ a: 10, b: 1 }), null, ["a", "b"])).toBe("low");
  });
  it("ignores untracked products", () => {
    expect(stockStatus(p({}, 3, false), null, ["a"])).toBe("untracked");
  });
});
