import { describe, expect, it } from "vitest";

import { daysUntilBirthday, favouriteServices } from "../../src/features/clients/utils";
import type { AppointmentDTO, AppointmentItemDTO } from "../../src/lib/types";

const tz = "Asia/Dubai";
// 2026-09-29 10:00 in Dubai.
const now = Date.parse("2026-09-29T06:00:00Z");

function visit(startAt: string, items: Pick<AppointmentItemDTO, "serviceId" | "serviceName">[]): AppointmentDTO {
  return {
    id: startAt,
    branchId: "b1",
    dateKey: startAt.slice(0, 10),
    startAt,
    endAt: startAt,
    status: "completed",
    source: "phone",
    clientId: "c1",
    clientName: "Layla",
    clientPhone: "",
    items: items.map((i, n) => ({
      ...i,
      id: `${startAt}-${n}`,
      staffId: "s1",
      staffName: "Sara",
      startAt,
      durationMin: 60,
      priceMinor: 10000,
      discountMinor: 0,
    })),
    staffIds: ["s1"],
    totalMinor: 10000 * items.length,
    notes: "",
    cancellation: null,
    transactionId: null,
    createdAt: null,
  };
}

describe("daysUntilBirthday", () => {
  it("is zero on the day and counts forward within the year", () => {
    expect(daysUntilBirthday({ month: 9, day: 29 }, now, tz)).toBe(0);
    expect(daysUntilBirthday({ month: 10, day: 5 }, now, tz)).toBe(6);
  });
  it("wraps to next year once the date has passed", () => {
    expect(daysUntilBirthday({ month: 9, day: 28 }, now, tz)).toBe(364);
  });
  it("uses the business time zone, not UTC", () => {
    // 21:30 UTC on 28 Sep is already 29 Sep in Dubai.
    expect(daysUntilBirthday({ month: 9, day: 29 }, Date.parse("2026-09-28T21:30:00Z"), tz)).toBe(0);
  });
});

describe("favouriteServices", () => {
  it("ranks by visit count, then by most recent", () => {
    const visits = [
      visit("2026-06-01T08:00:00Z", [{ serviceId: "blow", serviceName: "Blow-dry" }]),
      visit("2026-07-01T08:00:00Z", [
        { serviceId: "blow", serviceName: "Blow-dry" },
        { serviceId: "mani", serviceName: "Manicure" },
      ]),
      visit("2026-08-01T08:00:00Z", [{ serviceId: "facial", serviceName: "Facial" }]),
      visit("2026-09-01T08:00:00Z", [{ serviceId: "brows", serviceName: "Brow shaping" }]),
    ];
    expect(favouriteServices(visits)).toEqual([
      { id: "blow", name: "Blow-dry", count: 2 },
      { id: "brows", name: "Brow shaping", count: 1 },
      { id: "facial", name: "Facial", count: 1 },
    ]);
  });
  it("returns nothing without visits", () => {
    expect(favouriteServices([])).toEqual([]);
  });
});
