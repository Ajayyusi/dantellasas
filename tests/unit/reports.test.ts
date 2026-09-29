import { describe, expect, it } from "vitest";

import { appointmentsReport } from "@/features/reports/aggregate/appointments";
import { prepaidReport, productsReport, servicesReport, stockState } from "@/features/reports/aggregate/catalog";
import { clientsReport, type ClientHistory } from "@/features/reports/aggregate/clients";
import { paymentsReport, profitReport, vatReport } from "@/features/reports/aggregate/finance";
import { buildLedger, mergeTransactions } from "@/features/reports/aggregate/ledger";
import { revenueByDay, revenueReport } from "@/features/reports/aggregate/revenue";
import { commissionsReport, staffReport } from "@/features/reports/aggregate/staff";
import type { ProductInput } from "@/features/reports/aggregate/catalog";
import type { ReportItem, ReportTransaction } from "@/features/reports/types";
import type { AppointmentDTO, PaymentDTO, RefundDTO } from "@/lib/types";

const TZ = "Asia/Dubai";
const RANGE = { from: "2026-09-01", to: "2026-09-30" };

function item(p: Partial<ReportItem>): ReportItem {
  return {
    id: "i1",
    type: "service",
    refId: "svc-cut",
    name: "Haircut",
    staffId: "st-sara",
    staffName: "Sara",
    quantity: 1,
    unitPriceMinor: 10500,
    discountMinor: 0,
    taxRateBps: 500,
    taxMinor: 500,
    totalMinor: 10500,
    commissionMinor: 1000,
    redeemed: false,
    ...p,
  };
}

function pay(p: Partial<PaymentDTO>): PaymentDTO {
  return { id: "p1", methodId: "card", methodType: "card", label: "Card", amountMinor: 0, reference: "", at: null, ...p };
}

function refund(p: Partial<RefundDTO>): RefundDTO {
  return { id: "rf_1", number: "CRD-000001", amountMinor: 0, tipMinor: 0, reason: "", methodId: "cash", methodLabel: "Cash", restocked: false, lines: [], at: null, byName: "", ...p };
}

function tx(p: Partial<ReportTransaction>): ReportTransaction {
  const items = p.items ?? [item({})];
  const total = items.reduce((s, i) => s + i.totalMinor, 0);
  return {
    id: "t1",
    number: "INV-000001",
    branchId: "b1",
    dateKey: "2026-09-10",
    status: "paid",
    clientId: null,
    clientName: "",
    appointmentId: null,
    items,
    subtotalMinor: total,
    discountMinor: 0,
    memberDiscountMinor: 0,
    orderDiscountMinor: 0,
    taxMinor: items.reduce((s, i) => s + i.taxMinor, 0),
    totalMinor: total,
    tipMinor: 0,
    tipStaffId: null,
    paidMinor: total,
    balanceMinor: 0,
    refundedMinor: 0,
    payments: [pay({ amountMinor: total })],
    paymentMethods: ["card"],
    refunds: [],
    staffIds: [],
    discountCode: "",
    notes: "",
    cashierName: "",
    createdAt: null,
    ...p,
  };
}

/** Invoice on 10 Sep (haircut 105 incl. 5 VAT + tip 20), half-refunded on 2 Oct with the tip. */
const refundedLater = tx({
  id: "t-old",
  number: "INV-000009",
  dateKey: "2026-08-28",
  tipMinor: 2000,
  tipStaffId: "st-sara",
  items: [item({ id: "a", quantity: 2, totalMinor: 21000, taxMinor: 1000, commissionMinor: 2000 })],
  refunds: [
    refund({
      amountMinor: 10500 + 2000,
      tipMinor: 2000,
      at: "2026-09-05T20:30:00.000Z", // 6 Sep 00:30 in Dubai
      lines: [{ itemId: "a", quantity: 1, amountMinor: 10500, taxMinor: 500, commissionMinor: 1000 }],
    }),
  ],
  status: "partially_refunded",
  refundedMinor: 12500,
});

describe("ledger", () => {
  it("dates credit notes by issue day in the business time zone and skips void invoices", () => {
    const ledger = buildLedger([refundedLater, tx({ id: "void", status: "void" }), tx({ id: "out", dateKey: "2026-10-01" })], RANGE, TZ);
    expect(ledger.invoices).toHaveLength(0);
    expect(ledger.credits).toHaveLength(1);
    expect(ledger.credits[0]!.dateKey).toBe("2026-09-06");
    expect(ledger.credits[0]!.taxMinor).toBe(500);
    expect(ledger.creditLines[0]!.item.id).toBe("a");
  });

  it("merges invoices loaded by overlapping queries", () => {
    expect(mergeTransactions([tx({ id: "a" })], [tx({ id: "a" }), tx({ id: "b" })])).toHaveLength(2);
  });
});

describe("revenue", () => {
  it("builds daily gross/refunds/net/VAT/tips with refunds on the credit-note date", () => {
    const sale = tx({ id: "s", dateKey: "2026-09-06", discountMinor: 300, tipMinor: 1000 });
    const { days, totals } = revenueByDay([sale, refundedLater], RANGE, TZ);
    expect(days).toHaveLength(30);
    const d6 = days.find((d) => d.dateKey === "2026-09-06")!;
    expect(d6).toMatchObject({ invoices: 1, grossMinor: 10500, discountMinor: 300, refundsMinor: 10500, netMinor: 0, vatMinor: 0, tipsMinor: -1000 });
    expect(totals.netExVatMinor).toBe(0);
  });

  it("compares against the previous period of equal length", () => {
    const report = revenueReport([tx({ dateKey: "2026-08-15" }), tx({ id: "b", dateKey: "2026-09-15" })], RANGE, TZ);
    expect(report.previousRange).toEqual({ from: "2026-08-02", to: "2026-08-31" });
    expect(report.previous.grossMinor).toBe(10500);
    expect(report.totals.netExVatMinor).toBe(10000);
  });
});

describe("services & products", () => {
  it("nets line-level refunds and rolls up categories", () => {
    const sale = tx({ items: [item({ id: "a", quantity: 2, totalMinor: 21000, taxMinor: 1000 }), item({ id: "b", refId: "svc-mani", name: "Manicure", totalMinor: 0, taxMinor: 0, unitPriceMinor: 0, redeemed: true })] });
    const r = servicesReport([sale, { ...refundedLater, id: "t-old2", items: [item({ id: "a", quantity: 2, totalMinor: 21000, taxMinor: 1000 })] }], RANGE, TZ, {
      services: [
        { id: "svc-cut", name: "Haircut", nameAr: "قص", categoryId: "hair" },
        { id: "svc-mani", name: "Manicure", nameAr: "", categoryId: "nails" },
      ],
      categories: [
        { id: "hair", name: "Hair", nameAr: "شعر" },
        { id: "nails", name: "Nails", nameAr: "أظافر" },
      ],
    });
    const cut = r.rows.find((x) => x.serviceId === "svc-cut")!;
    expect(cut).toMatchObject({ count: 1, refundedCount: 1, revenueMinor: 10000, refundsMinor: 10000, avgPriceMinor: 10000, nameAr: "قص" });
    expect(r.totals.redeemedCount).toBe(1);
    expect(r.categories[0]).toMatchObject({ categoryId: "hair", share: 1 });
  });

  it("computes product units, COGS at current cost and stock status in scope", () => {
    const sale = tx({ items: [item({ id: "p", type: "product", refId: "prod-1", name: "Shampoo", quantity: 3, totalMinor: 6300, taxMinor: 300 })] });
    const products: ProductInput[] = [
      { id: "prod-1", name: "Shampoo", nameAr: "", sku: "SH1", costMinor: 800, minStock: 2, trackStock: true, active: true, usage: "retail", stock: { b1: 2, b2: 10 } },
      { id: "prod-2", name: "Towel", nameAr: "", sku: "", costMinor: 0, minStock: 0, trackStock: true, active: true, usage: "professional", stock: {} },
    ];
    const r = productsReport([sale], RANGE, TZ, products, ["b1"]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ units: 3, revenueMinor: 6000, cogsMinor: 2400, marginMinor: 3600, stock: 2, status: "low" });
    expect(stockState(products[0]!, ["b2"]).status).toBe("in_stock");
    expect(stockState({ stock: {}, minStock: 0, trackStock: true }, ["b1"]).status).toBe("out");
  });
});

describe("prepaid", () => {
  it("counts prepaid sales, redemptions net of gift-card refunds, and passes liability through", () => {
    const sale = tx({
      items: [item({ id: "g", type: "gift_card", refId: "", name: "Gift card", totalMinor: 50000, taxMinor: 0, staffId: null }), item({ id: "k", type: "package", refId: "pk1", name: "10 massages", totalMinor: 300000, taxMinor: 14286 })],
      payments: [pay({ methodId: "gc", methodType: "gift_card", amountMinor: 10000 }), pay({ id: "p2", methodId: "pkg", methodType: "package", amountMinor: 5000 })],
      refunds: [refund({ methodId: "gc", amountMinor: 2000, at: "2026-09-12T08:00:00.000Z" })],
    });
    const liability = { giftCardMinor: 1, giftCards: 1, packageCreditMinor: 2, packageSessions: 3, capped: false };
    const r = prepaidReport([sale], RANGE, TZ, { names: [{ id: "pk1", name: "10 massages", nameAr: "١٠ مساج" }], methodType: (m) => (m === "gc" ? "gift_card" : "cash"), liability });
    expect(r.byType.find((b) => b.type === "gift_card")).toMatchObject({ count: 1, valueMinor: 50000 });
    expect(r.rows.find((x) => x.type === "package")!.nameAr).toBe("١٠ مساج");
    expect(r.redemptions).toEqual({ giftCardMinor: 8000, packageCreditMinor: 5000, packageSessions: 0 });
    expect(r.liability).toBe(liability);
  });
});

describe("staff & commissions", () => {
  const appt = (p: Partial<AppointmentDTO>): AppointmentDTO => ({
    id: "a",
    branchId: "b1",
    dateKey: "2026-09-10",
    startAt: "2026-09-10T06:00:00.000Z",
    endAt: "2026-09-10T07:00:00.000Z",
    status: "completed",
    source: "phone",
    clientId: null,
    clientName: "",
    clientPhone: "",
    items: [{ id: "l", serviceId: "svc-cut", serviceName: "Haircut", staffId: "st-sara", staffName: "Sara", startAt: "2026-09-10T06:00:00.000Z", durationMin: 60, priceMinor: 10500, discountMinor: 0 }],
    staffIds: ["st-sara"],
    totalMinor: 10500,
    notes: "",
    cancellation: null,
    transactionId: null,
    createdAt: null,
    ...p,
  });
  const nameOf = (id: string, fallback: string) => (id === "st-sara" ? "Sara H." : fallback);

  it("attributes revenue, commission net of reversals, tips and appointments", () => {
    const sale = tx({ tipMinor: 1500, tipStaffId: "st-sara" });
    const r = staffReport([sale, refundedLater], [appt({}), appt({ id: "b", status: "no_show" }), appt({ id: "c", status: "cancelled" })], RANGE, TZ, { nameOf, showCommission: true });
    expect(r.rows[0]).toMatchObject({ name: "Sara H.", services: 1, revenueMinor: 0, commissionMinor: 0, commissionReversedMinor: 1000, tipsMinor: -500, appointments: 2, completed: 1, noShows: 1 });
  });

  it("hides commission when the member may not see it", () => {
    const r = staffReport([tx({})], [], RANGE, TZ, { nameOf, showCommission: false });
    expect(r.rows[0]!.commissionMinor).toBeNull();
    expect(r.showCommission).toBe(false);
  });

  it("lists sale and reversal commission lines and a payroll summary", () => {
    const r = commissionsReport([tx({}), refundedLater, tx({ id: "nc", items: [item({ commissionMinor: 0 })] })], RANGE, TZ, nameOf);
    expect(r.lines.map((l) => [l.kind, l.commissionMinor, l.dateKey])).toEqual([
      ["reversal", -1000, "2026-09-06"],
      ["sale", 1000, "2026-09-10"],
    ]);
    expect(r.lines[0]).toMatchObject({ creditNumber: "CRD-000001", invoiceNumber: "INV-000009", quantity: -1, baseMinor: -10000 });
    expect(r.staff).toEqual([{ staffId: "st-sara", name: "Sara H.", lines: 2, baseMinor: 0, earnedMinor: 1000, reversedMinor: 1000, netMinor: 0 }]);
  });
});

describe("clients", () => {
  it("splits new and returning clients and nets refunds from spend", () => {
    const history = new Map<string, ClientHistory>([
      ["c-new", { firstVisitKey: "2026-09-10", createdKey: "2026-09-10" }],
      ["c-old", { firstVisitKey: "2025-01-01", createdKey: "2025-01-01" }],
      ["c-created", { firstVisitKey: null, createdKey: "2026-09-02" }],
    ]);
    const r = clientsReport(
      [
        tx({ id: "1", clientId: "c-new", clientName: "Mona" }),
        tx({ id: "2", clientId: "c-new", clientName: "Mona", dateKey: "2026-09-11" }),
        tx({ id: "3", clientId: "c-old", clientName: "Huda", refunds: [refund({ amountMinor: 3000, tipMinor: 1000, at: "2026-09-20T08:00:00.000Z" })] }),
        tx({ id: "4", clientId: "c-created", clientName: "Aya" }),
        tx({ id: "5" }),
      ],
      RANGE,
      TZ,
      history,
    );
    expect(r.summary).toMatchObject({ served: 3, newCount: 2, returningCount: 1, walkInInvoices: 1, walkInSpendMinor: 10500 });
    expect(r.rows[0]).toMatchObject({ clientId: "c-new", visits: 2, invoices: 2, spendMinor: 21000, avgTicketMinor: 10500, isNew: true, lastVisitKey: "2026-09-11" });
    expect(r.rows.find((x) => x.clientId === "c-old")).toMatchObject({ spendMinor: 8500, isNew: false });
  });
});

describe("appointments", () => {
  const base: AppointmentDTO = {
    id: "a",
    branchId: "b1",
    dateKey: "2026-09-07", // Monday
    startAt: "2026-09-07T06:30:00.000Z", // 10:30 Dubai
    endAt: "2026-09-07T07:30:00.000Z",
    status: "completed",
    source: "phone",
    clientId: null,
    clientName: "Mona",
    clientPhone: "",
    items: [],
    staffIds: [],
    totalMinor: 10000,
    notes: "",
    cancellation: null,
    transactionId: null,
    createdAt: null,
  };

  it("computes status totals, rates, reasons, sources and the weekday × hour grid", () => {
    const r = appointmentsReport(
      [
        base,
        { ...base, id: "b", status: "no_show", source: "online" },
        { ...base, id: "c", status: "cancelled", cancellation: { reason: "Client unwell", note: "", at: null } },
        { ...base, id: "d", status: "cancelled", cancellation: { reason: "Client unwell", note: "", at: null } },
        { ...base, id: "e", dateKey: "2026-10-01" },
      ],
      RANGE,
      TZ,
      1,
    );
    expect(r.total).toBe(4);
    expect(r.byStatus).toMatchObject({ completed: 1, no_show: 1, cancelled: 2 });
    expect(r.cancelRate).toBe(0.5);
    expect(r.noShowRate).toBe(0.5);
    expect(r.completionRate).toBe(0.5);
    expect(r.reasons).toEqual([{ reason: "Client unwell", count: 2 }]);
    expect(r.sources).toEqual([
      { source: "phone", count: 3, valueMinor: 10000 },
      { source: "online", count: 1, valueMinor: 0 },
    ]);
    expect(r.hours).toEqual([10]);
    expect(r.heat[0]).toEqual({ weekday: 1, counts: [2] });
    expect(r.rows).toHaveLength(4);
  });

  it("returns null rates and default hours when there is nothing", () => {
    const r = appointmentsReport([], RANGE, TZ, 0);
    expect(r.noShowRate).toBeNull();
    expect(r.hours[0]).toBe(9);
    expect(r.heat[0]!.weekday).toBe(0);
  });
});

describe("finance", () => {
  const expenses = [
    { dateKey: "2026-09-02", categoryId: "rent", categoryName: "Rent", amountMinor: 100000, taxMinor: 0 },
    { dateKey: "2026-09-05", categoryId: "sup", categoryName: "Supplies", amountMinor: 10500, taxMinor: 500 },
    { dateKey: "2026-10-05", categoryId: "sup", categoryName: "Supplies", amountMinor: 99999, taxMinor: 99 },
  ];

  it("estimates profit from revenue excl. VAT, product cost and expenses excl. VAT", () => {
    const sale = tx({ items: [item({}), item({ id: "p", type: "product", refId: "prod-1", totalMinor: 21000, taxMinor: 1000, quantity: 2 }), item({ id: "q", type: "product", refId: "prod-x", totalMinor: 1050, taxMinor: 50 })] });
    const r = profitReport([sale], expenses, RANGE, TZ, { costOf: (id) => (id === "prod-1" ? 5000 : undefined), categories: [{ id: "rent", name: "Rent", nameAr: "إيجار" }] });
    expect(r.revenueExVatMinor).toBe(31000);
    expect(r.cogsMinor).toBe(10000);
    expect(r.expensesMinor).toBe(110500);
    expect(r.expensesExVatMinor).toBe(110000);
    expect(r.profitMinor).toBe(31000 - 10000 - 110000);
    expect(r.unitsWithoutCost).toBe(1);
    expect(r.categories[0]).toMatchObject({ categoryId: "rent", nameAr: "إيجار", share: 100000 / 110500 });
  });

  it("totals payments per method net of refunds by refund method", () => {
    const sale = tx({
      payments: [pay({ amountMinor: 5000 }), pay({ id: "p2", methodId: "cash", methodType: "cash", label: "Cash", amountMinor: 5500 })],
      refunds: [refund({ methodId: "cash", amountMinor: 2000, at: "2026-09-11T08:00:00.000Z" })],
    });
    const r = paymentsReport([sale], RANGE, TZ, [
      { id: "card", label: "Card", type: "card" },
      { id: "cash", label: "Cash", type: "cash" },
    ]);
    expect(r.totals).toEqual({ collectedMinor: 10500, refundedMinor: 2000, netMinor: 8500 });
    expect(r.rows.map((x) => [x.methodId, x.netMinor])).toEqual([
      ["card", 5000],
      ["cash", 3500],
    ]);
  });

  it("summarises output VAT by rate, credit-note VAT and input VAT", () => {
    const sale = tx({ items: [item({}), item({ id: "g", type: "gift_card", taxRateBps: 0, taxMinor: 0, totalMinor: 20000 })] });
    const r = vatReport([sale, refundedLater], expenses, RANGE, TZ);
    expect(r.rows.map((x) => [x.key, x.taxableMinor, x.vatMinor])).toEqual([
      ["output:500", 10000, 500],
      ["output:0", 20000, 0],
      ["credit:500", 10000, 500],
      ["input:-", 110000, 500],
    ]);
    expect(r.netMinor).toBe(500 - 500 - 500);
  });
});
