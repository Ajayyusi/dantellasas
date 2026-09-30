import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, resolveSettings } from "../../src/lib/settings";

describe("resolveSettings", () => {
  it("fills missing sections with the defaults", () => {
    const s = resolveSettings({ business: { displayName: "Salon" } });
    expect(s.business.displayName).toBe("Salon");
    expect(s.appearance.accentColor).toBe(DEFAULT_SETTINGS.appearance.accentColor);
  });

  it("moves earlier default accents to the current default", () => {
    expect(resolveSettings({ appearance: { accentColor: "#965660" } }).appearance.accentColor).toBe("#a8406a");
    expect(resolveSettings({ appearance: { accentColor: "#8B3A62" } }).appearance.accentColor).toBe("#a8406a");
  });

  it("keeps an accent the business picked", () => {
    expect(resolveSettings({ appearance: { accentColor: "#3f5f99" } }).appearance.accentColor).toBe("#3f5f99");
  });
});
