import { describe, expect, it } from "vitest";

import {
  addDaysToKey,
  dateKeyOf,
  eachDayKey,
  minutesOfDay,
  previousRange,
  startOfWeekKey,
  weekdayOfKey,
  zonedInstant,
} from "../../src/lib/dates";
import { buildSearchTokens, normalizePhone, searchTermToken } from "../../src/lib/search";

describe("dates in Asia/Dubai", () => {
  const tz = "Asia/Dubai";
  it("builds instants from wall-clock time", () => {
    const d = zonedInstant("2026-10-01", "10:00", tz);
    expect(d.toISOString()).toBe("2026-10-01T06:00:00.000Z");
    expect(minutesOfDay(d, tz)).toBe(600);
  });
  it("computes date keys across midnight UTC", () => {
    expect(dateKeyOf(new Date("2026-09-30T21:30:00Z"), tz)).toBe("2026-10-01");
  });
  it("does calendar arithmetic on keys", () => {
    expect(addDaysToKey("2026-02-28", 1)).toBe("2026-03-01");
    expect(weekdayOfKey("2026-09-28")).toBe(1);
    expect(startOfWeekKey("2026-10-01", 1)).toBe("2026-09-28");
    expect(startOfWeekKey("2026-10-01", 6)).toBe("2026-09-26");
    expect(eachDayKey("2026-09-29", "2026-10-02")).toHaveLength(4);
    expect(previousRange({ from: "2026-09-01", to: "2026-09-30" })).toEqual({ from: "2026-08-02", to: "2026-08-31" });
  });
});

describe("search tokens", () => {
  it("normalises UAE phone numbers", () => {
    expect(normalizePhone("050 123 4567")).toBe("971501234567");
    expect(normalizePhone("+971 50 123 4567")).toBe("971501234567");
    expect(normalizePhone("00971501234567")).toBe("971501234567");
  });
  it("indexes names, phones and emails", () => {
    const tokens = buildSearchTokens({
      names: ["Mariam", "Al Nuaimi"],
      phone: "971501234567",
      email: "mariam@example.com",
    });
    expect(tokens).toContain("ma");
    expect(tokens).toContain("mariam");
    expect(tokens).toContain("nuaimi");
    expect(tokens).toContain("mariam al");
    expect(tokens).toContain("0501234567");
    expect(tokens).toContain("4567");
    expect(tokens).toContain("mariam@example.com");
  });
  it("normalises search terms the same way", () => {
    expect(searchTermToken("  Mariam ")).toBe("mariam");
    expect(searchTermToken("050 123 4567")).toBe("0501234567");
    expect(searchTermToken("Mariam  Al")).toBe("mariam al");
  });
  it("handles Arabic names", () => {
    const tokens = buildSearchTokens({ names: ["مريم", "النعيمي"] });
    expect(tokens).toContain("مريم");
    expect(searchTermToken("مريم")).toBe("مريم");
  });
});
