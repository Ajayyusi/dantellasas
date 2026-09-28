import { describe, expect, it } from "vitest";

import { overlaps, packColumns, snap, timeSlots } from "../../src/features/appointments/layout";
import { canTransition, isActiveStatus, permissionForStatus } from "../../src/features/appointments/status";

describe("appointment status machine", () => {
  it("follows the lifecycle", () => {
    expect(canTransition("booked", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "checked_in")).toBe(true);
    expect(canTransition("checked_in", "in_service")).toBe(true);
    expect(canTransition("in_service", "completed")).toBe(true);
  });
  it("blocks invalid jumps and edits to completed visits", () => {
    expect(canTransition("booked", "completed")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
    expect(canTransition("in_service", "no_show")).toBe(false);
  });
  it("allows undoing arrival and restoring cancellations", () => {
    expect(canTransition("checked_in", "confirmed")).toBe(true);
    expect(canTransition("cancelled", "booked")).toBe(true);
  });
  it("requires cancel permission for exits", () => {
    expect(permissionForStatus("cancelled")).toBe("cancel_appointments");
    expect(permissionForStatus("no_show")).toBe("cancel_appointments");
    expect(permissionForStatus("checked_in")).toBe("edit_appointments");
    expect(isActiveStatus("no_show")).toBe(false);
  });
});

describe("calendar layout", () => {
  it("packs overlapping events side by side", () => {
    const placed = packColumns([
      { id: "a", start: 600, end: 660 },
      { id: "b", start: 630, end: 690 },
      { id: "c", start: 700, end: 730 },
    ]);
    const a = placed.find((p) => p.id === "a")!;
    const b = placed.find((p) => p.id === "b")!;
    const c = placed.find((p) => p.id === "c")!;
    expect([a.column, b.column]).toEqual([0, 1]);
    expect(a.columns).toBe(2);
    expect(c.columns).toBe(1);
    expect(c.column).toBe(0);
  });
  it("snaps and slices time", () => {
    expect(snap(607, 15)).toBe(600);
    expect(snap(608, 15)).toBe(615);
    expect(timeSlots(540, 600, 15)).toEqual([540, 555, 570, 585]);
    expect(overlaps({ start: 600, end: 660 }, { start: 660, end: 700 })).toBe(false);
  });
});
