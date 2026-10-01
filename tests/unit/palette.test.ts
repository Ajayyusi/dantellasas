import { describe, expect, it } from "vitest";

import { STAFF_COLORS } from "../../src/features/staff/utils";
import { currentColor } from "../../src/lib/palette";

const PREMIUM = ["#965660", "#b07a7f", "#a25c43", "#b08d57", "#507357", "#4b6d8a", "#7d5279", "#715f53", "#7a323b", "#4f7b80"];
const ORIGINAL = ["#8b3a62", "#b4536e", "#c07a3a", "#b8962e", "#3f7f6d", "#3e6fa8", "#6b5bb5", "#5b6472", "#a33f3f", "#2f8a9a"];
// src/features/services/components/category-dialog.tsx
const CATEGORY_COLORS = ["#a8406a", "#b8527d", "#9a4b34", "#2f7a55", "#3f5f99", "#6a4c96", "#5f595c", "#2e6b73", "#7a323b"];

describe("currentColor", () => {
  it("moves every colour of the earlier palettes onto the current one", () => {
    for (const old of [...PREMIUM, ...ORIGINAL]) expect(STAFF_COLORS).toContain(currentColor(old));
  });

  it("keeps colours that were distinct distinct", () => {
    expect(new Set(PREMIUM.map(currentColor)).size).toBe(PREMIUM.length);
    expect(new Set(ORIGINAL.map(currentColor)).size).toBe(ORIGINAL.length);
  });

  it("keeps the earlier category presets inside the current category presets", () => {
    for (const old of ["#965660", "#b07a7f", "#a25c43", "#507357", "#4b6d8a", "#7d5279", "#715f53", "#7a323b"]) {
      expect(CATEGORY_COLORS).toContain(currentColor(old));
    }
  });

  it("keeps wine (Makeup) as wine", () => {
    expect(currentColor("#7a323b")).toBe("#7a323b");
    expect(currentColor("#a33f3f")).toBe("#7a323b");
    expect(CATEGORY_COLORS).toContain("#7a323b");
    expect(STAFF_COLORS).toContain("#7a323b");
  });

  it("moves teal-grey to light blue", () => {
    expect(currentColor("#4f7b80")).toBe("#4a78b0");
  });

  it("ignores case and leaves other colours alone", () => {
    expect(currentColor("#965660")).toBe("#a8406a");
    expect(currentColor("#4B6D8A")).toBe("#3f5f99");
    expect(currentColor("#123456")).toBe("#123456");
    expect(currentColor("#a8406a")).toBe("#a8406a");
  });
});
