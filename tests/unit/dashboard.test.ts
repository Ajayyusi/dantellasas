import { describe, expect, it } from "vitest";

import {
  bookingsSeries,
  busyHours,
  categoryPerformance,
  clientRetention,
  invoiceNet,
  pendingPayments,
  revenueSeries,
  staffWorkingToday,
  todaySummary,
  topServices,
} from "@/features/dashboard/aggregate";
import type { AppointmentDTO, StaffDTO, TransactionDTO } from "@/lib/types";

function tx(p: Partial<TransactionDTO>): TransactionDTO {
  return {
    id: "t",
    number: "INV-1",
    branchId: "b",
    dateKey: "2026-09-01",
    status: "paid",
    clientId: null,
    clientName: "",
    appointmentId: null,
    items: [],
    subtotalMinor: 0,
    discountMinor: 0,
    memberDiscountMinor: 0,
    orderDiscountMinor: 0,
    taxMinor: 0,
    totalMinor: 0,
    tipMinor: 0,
    tipStaffId: null,
    paidMinor: 0,
    balanceMinor: 0,
    refundedMinor: 0,
    payments: [],
    paymentMethods: [],
    refunds: [],
    staffIds: [],
    discountCode: "",
    notes: "",
    cashierName: "",
    createdAt: null,
    ...p,
  };
}

const item = (id: string, refId: string, totalMinor: number) => ({
  id,
  type: "service" as const,
  refId,
  name: refId,
  staffId: "s1",
  staffName: "Sara",
  quantity: 1,
  unitPriceMinor: totalMinor,
  discountMinor: 0,
  taxRateBps: 500,
  taxMinor: 0,
  totalMinor,
  commissionMinor: 0,
});

describe("dashboard aggregation", () => {
  it("nets credit notes but not refunded tips", () => {
    expect(
      invoiceNet(
        tx({
          totalMinor: 10000,
          tipMinor: 1000,
          refundedMinor: 3000,
          refunds: [{ id: "r", number: "CRD-1", amountMinor: 3000, tipMinor: 1000, reason: "", methodId: "cash", methodLabel: "", restocked: false, lines: [], at: null, byName: "" }],
        }),
      ),
    ).toBe(8000);
    expect(invoiceNet(tx({ status: "void", totalMinor: 5000 }))).toBe(0);
  });

  it("aligns the previous period day by day", () => {
    const s = revenueSeries(
      { from: "2026-09-08", to: "2026-09-09" },
      { from: "2026-09-06", to: "2026-09-07" },
      [tx({ dateKey: "2026-09-09", totalMinor: 500 })],
      [tx({ dateKey: "2026-09-06", totalMinor: 200 })],
    );
    expect(s).toEqual([
      { dateKey: "2026-09-08", netMinor: 0, prevNetMinor: 200 },
      { dateKey: "2026-09-09", netMinor: 500, prevNetMinor: 0 },
    ]);
  });

  it("ranks services by revenue after line refunds", () => {
    const rows = topServices([
      tx({ items: [item("a", "cut", 15000), item("b", "colour", 20000)], refunds: [{ id: "r", number: "CRD-1", amountMinor: 20000, tipMinor: 0, reason: "", methodId: "cash", methodLabel: "", restocked: false, lines: [{ itemId: "b", quantity: 1, amountMinor: 20000, taxMinor: 0, commissionMinor: 0 }], at: null, byName: "" }] }),
    ]);
    expect(rows[0]).toMatchObject({ id: "cut", revenueMinor: 15000 });
    expect(rows[1]).toMatchObject({ id: "colour", revenueMinor: 0 });
  });
});

function appt(p: Partial<AppointmentDTO>): AppointmentDTO {
  return {
    id: "a",
    branchId: "b",
    dateKey: "2026-09-29",
    startAt: "2026-09-29T06:00:00.000Z",
    endAt: "2026-09-29T07:00:00.000Z",
    status: "booked",
    source: "phone",
    clientId: null,
    clientName: "",
    clientPhone: "",
    items: [],
    staffIds: [],
    totalMinor: 0,
    notes: "",
    cancellation: null,
    transactionId: null,
    createdAt: null,
    ...p,
  };
}

function staff(p: Partial<StaffDTO>): StaffDTO {
  return {
    id: "s",
    firstName: "",
    lastName: "",
    displayName: "",
    photoUrl: null,
    phone: "",
    email: "",
    position: "",
    branchIds: [],
    status: "active",
    color: "",
    hireDate: null,
    bookable: true,
    schedule: {},
    commission: { serviceRateBps: 0, productRateBps: 0 },
    hr: { dateOfBirth: null, nationality: "", passportExpiry: null, visaExpiry: null },
    memberUid: null,
    sortOrder: 0,
    serviceIds: [],
    ...p,
  };
}

describe("dashboard overview metrics", () => {
  it("summarises today across bookings and invoices", () => {
    const now = Date.parse("2026-09-29T08:00:00.000Z");
    const s = todaySummary(
      [tx({ clientId: "c1", totalMinor: 10000 }), tx({ id: "t2", clientId: null, totalMinor: 5000 }), tx({ id: "t3", status: "void", clientId: "c9", totalMinor: 999 })],
      [
        appt({ id: "1", clientId: "c1", status: "completed" }),
        appt({ id: "2", clientId: "c2", startAt: "2026-09-29T10:00:00.000Z" }),
        appt({ id: "3", clientId: "c3", status: "cancelled" }),
        appt({ id: "4", clientName: "Walk-in Sara", status: "confirmed", startAt: "2026-09-29T07:00:00.000Z" }),
      ],
      now,
    );
    expect(s).toMatchObject({ revenueMinor: 15000, sales: 2, appointments: 3, completed: 1, upcoming: 1, clients: 4 });
  });

  it("counts open balances only on unpaid and part-paid invoices", () => {
    expect(
      pendingPayments([
        tx({ status: "unpaid", balanceMinor: 12000 }),
        tx({ status: "partially_paid", balanceMinor: 3000 }),
        tx({ status: "paid", balanceMinor: 0 }),
        tx({ status: "void", balanceMinor: 5000 }),
      ]),
    ).toEqual({ count: 2, balanceMinor: 15000 });
  });

  it("measures returning clients against the previous period", () => {
    const r = clientRetention(
      [tx({ clientId: "a" }), tx({ clientId: "b" }), tx({ clientId: "c" }), tx({ clientId: null })],
      [tx({ clientId: "a" }), tx({ clientId: "b" }), tx({ clientId: "d" }), tx({ clientId: "e", status: "void" })],
    );
    expect(r).toEqual({ current: 3, previous: 3, returning: 2, fresh: 1, rate: 2 / 3 });
    expect(clientRetention([tx({ clientId: "a" })], []).rate).toBeNull();
  });

  it("aligns bookings day by day and leaves out cancellations", () => {
    const s = bookingsSeries(
      { from: "2026-09-08", to: "2026-09-09" },
      { from: "2026-09-06", to: "2026-09-07" },
      [appt({ dateKey: "2026-09-09" }), appt({ dateKey: "2026-09-09", status: "cancelled" })],
      [appt({ dateKey: "2026-09-06" }), appt({ dateKey: "2026-09-06" })],
    );
    expect(s).toEqual([
      { dateKey: "2026-09-08", count: 0, prevCount: 2 },
      { dateKey: "2026-09-09", count: 1, prevCount: 0 },
    ]);
  });

  it("buckets booking starts by weekday and hour in the business time zone", () => {
    // 06:00Z and 07:30Z on Tuesday 29 Sep are 10:00 and 11:30 in Dubai.
    const b = busyHours(
      [appt({ startAt: "2026-09-29T06:00:00.000Z" }), appt({ startAt: "2026-09-29T07:30:00.000Z" }), appt({ startAt: "2026-09-29T07:45:00.000Z" }), appt({ status: "cancelled", startAt: "2026-09-29T15:00:00.000Z" })],
      "Asia/Dubai",
    );
    expect(b.from).toBe(10);
    expect(b.to).toBe(12);
    expect(b.counts[2]).toEqual([1, 2]);
    expect(b.max).toBe(2);
  });

  it("groups service revenue by category after refunds", () => {
    const rows = categoryPerformance(
      [
        tx({
          items: [item("a", "cut", 15000), item("b", "colour", 20000), item("c", "mani", 8000)],
          refunds: [{ id: "r", number: "CRD-1", amountMinor: 5000, tipMinor: 0, reason: "", methodId: "cash", methodLabel: "", restocked: false, lines: [{ itemId: "b", quantity: 1, amountMinor: 5000, taxMinor: 0, commissionMinor: 0 }], at: null, byName: "" }],
        }),
      ],
      [
        { id: "cut", categoryId: "hair" },
        { id: "colour", categoryId: "hair" },
        { id: "mani", categoryId: "nails" },
      ],
      [
        { id: "hair", name: "Hair", nameAr: "الشعر", color: "#965660" },
        { id: "nails", name: "Nails", nameAr: "الأظافر", color: "#b07a7f" },
      ],
    );
    expect(rows.map((r) => [r.id, r.revenueMinor, r.count])).toEqual([
      ["hair", 30000, 2],
      ["nails", 8000, 1],
    ]);
  });

  it("counts active staff scheduled on the weekday in the branch scope", () => {
    const on = { working: true, start: "10:00", end: "20:00" };
    const list = [
      staff({ id: "1", schedule: { "2": on } }),
      staff({ id: "2", schedule: { "2": on }, branchIds: ["other"] }),
      staff({ id: "3", schedule: { "2": { ...on, working: false } } }),
      staff({ id: "4", schedule: { "2": on }, status: "inactive" }),
      staff({ id: "5", schedule: { "2": on }, branchIds: ["b"] }),
    ];
    expect(staffWorkingToday(list, 2, ["b"])).toBe(2);
  });
});
