import type { DateRange } from "@/lib/dates";

import type {
  CategoryRow,
  PrepaidReport,
  PrepaidRow,
  PrepaidType,
  ProductReportRow,
  ProductsReport,
  ReportTransaction,
  ServiceRow,
  ServicesReport,
  StockState,
} from "../types";
import { buildLedger, lineNet, sortBy } from "./ledger";

interface Named {
  id: string;
  name: string;
  nameAr: string;
}

// ── Services ─────────────────────────────────────────────────────────

export function servicesReport(
  transactions: ReportTransaction[],
  range: DateRange,
  tz: string,
  catalog: { services: (Named & { categoryId: string })[]; categories: Named[] },
): ServicesReport {
  const ledger = buildLedger(transactions, range, tz);
  const serviceById = new Map(catalog.services.map((s) => [s.id, s]));
  const rows = new Map<string, ServiceRow>();
  const row = (refId: string, fallbackName: string) => {
    let r = rows.get(refId);
    if (!r) {
      const s = serviceById.get(refId);
      r = { serviceId: refId, name: s?.name ?? fallbackName, nameAr: s?.nameAr ?? "", categoryId: s?.categoryId ?? "", count: 0, refundedCount: 0, redeemedCount: 0, revenueMinor: 0, refundsMinor: 0, avgPriceMinor: 0 };
      rows.set(refId, r);
    }
    return r;
  };
  for (const tx of ledger.invoices) {
    for (const item of tx.items) {
      if (item.type !== "service") continue;
      const r = row(item.refId, item.name);
      r.count += item.quantity;
      if (item.redeemed) r.redeemedCount += item.quantity;
      r.revenueMinor += lineNet(item);
    }
  }
  for (const c of ledger.creditLines) {
    if (c.item.type !== "service") continue;
    const r = row(c.item.refId, c.item.name);
    r.refundedCount += c.quantity;
    r.refundsMinor += c.amountMinor - c.taxMinor;
  }
  const list = [...rows.values()].map((r) => {
    const revenue = r.revenueMinor - r.refundsMinor;
    const count = r.count - r.refundedCount;
    return { ...r, count, revenueMinor: revenue, avgPriceMinor: count > 0 ? Math.round(revenue / count) : 0 };
  });
  sortBy(list, (r) => r.revenueMinor, (r) => r.name);

  const totalRevenue = list.reduce((s, r) => s + r.revenueMinor, 0);
  const catById = new Map(catalog.categories.map((c) => [c.id, c]));
  const cats = new Map<string, CategoryRow>();
  for (const r of list) {
    const c = catById.get(r.categoryId);
    const key = c ? c.id : "";
    const cat = cats.get(key) ?? { categoryId: key, name: c?.name ?? "", nameAr: c?.nameAr ?? "", count: 0, revenueMinor: 0, share: 0 };
    cat.count += r.count;
    cat.revenueMinor += r.revenueMinor;
    cats.set(key, cat);
  }
  const categories = sortBy(
    [...cats.values()].map((c) => ({ ...c, share: totalRevenue > 0 ? c.revenueMinor / totalRevenue : 0 })),
    (c) => c.revenueMinor,
    (c) => c.name,
  );
  return {
    rows: list,
    categories,
    totals: {
      count: list.reduce((s, r) => s + r.count, 0),
      revenueMinor: totalRevenue,
      refundsMinor: list.reduce((s, r) => s + r.refundsMinor, 0),
      redeemedCount: list.reduce((s, r) => s + r.redeemedCount, 0),
    },
  };
}

// ── Products ─────────────────────────────────────────────────────────

export interface ProductInput extends Named {
  sku: string;
  costMinor: number;
  minStock: number;
  trackStock: boolean;
  active: boolean;
  usage: "retail" | "professional" | "both";
  stock: Record<string, number>;
}

export function stockState(p: Pick<ProductInput, "stock" | "minStock" | "trackStock">, branchIds: string[]): { stock: number; status: StockState } {
  const stock = branchIds.reduce((s, id) => s + (p.stock[id] ?? 0), 0);
  if (!p.trackStock) return { stock, status: "untracked" };
  if (stock <= 0) return { stock, status: "out" };
  if (branchIds.some((id) => (p.stock[id] ?? 0) <= p.minStock)) return { stock, status: "low" };
  return { stock, status: "in_stock" };
}

/**
 * Units and revenue from invoice lines (net of credit notes), cost of goods at
 * each product's current cost price, stock across the branches in scope.
 * Active retail products with no sales are listed too so low stock shows.
 */
export function productsReport(transactions: ReportTransaction[], range: DateRange, tz: string, products: ProductInput[], branchIds: string[]): ProductsReport {
  const ledger = buildLedger(transactions, range, tz);
  const byId = new Map(products.map((p) => [p.id, p]));
  const rows = new Map<string, ProductReportRow>();
  const row = (refId: string, fallbackName: string) => {
    let r = rows.get(refId);
    if (!r) {
      const p = byId.get(refId);
      const s = p ? stockState(p, branchIds) : { stock: 0, status: "untracked" as const };
      r = { productId: refId, name: p?.name ?? fallbackName, nameAr: p?.nameAr ?? "", sku: p?.sku ?? "", units: 0, refundedUnits: 0, revenueMinor: 0, cogsMinor: 0, marginMinor: 0, stock: s.stock, minStock: p?.minStock ?? 0, status: s.status };
      rows.set(refId, r);
    }
    return r;
  };
  for (const p of products) if (p.active && p.usage !== "professional") row(p.id, p.name);
  for (const tx of ledger.invoices) {
    for (const item of tx.items) {
      if (item.type !== "product") continue;
      const r = row(item.refId, item.name);
      r.units += item.quantity;
      r.revenueMinor += lineNet(item);
      r.cogsMinor += (byId.get(item.refId)?.costMinor ?? 0) * item.quantity;
    }
  }
  for (const c of ledger.creditLines) {
    if (c.item.type !== "product") continue;
    const r = row(c.item.refId, c.item.name);
    r.refundedUnits += c.quantity;
    r.units -= c.quantity;
    r.revenueMinor -= c.amountMinor - c.taxMinor;
    r.cogsMinor -= (byId.get(c.item.refId)?.costMinor ?? 0) * c.quantity;
  }
  const list = sortBy(
    [...rows.values()].map((r) => ({ ...r, marginMinor: r.revenueMinor - r.cogsMinor })),
    (r) => r.revenueMinor,
    (r) => r.name,
  );
  return {
    rows: list,
    totals: {
      units: list.reduce((s, r) => s + r.units, 0),
      revenueMinor: list.reduce((s, r) => s + r.revenueMinor, 0),
      cogsMinor: list.reduce((s, r) => s + r.cogsMinor, 0),
      low: list.filter((r) => r.status === "low").length,
      out: list.filter((r) => r.status === "out").length,
    },
  };
}

// ── Packages, memberships, gift cards ────────────────────────────────

const PREPAID: PrepaidType[] = ["package", "membership", "gift_card"];

/**
 * Prepaid products sold in the range (VAT inclusive, net of credit notes) and
 * how prepaid value was used: gift-card and package-credit payments (minus
 * credit notes refunded back to a gift card) and package sessions redeemed.
 */
export function prepaidReport(
  transactions: ReportTransaction[],
  range: DateRange,
  tz: string,
  opts: { names: Named[]; methodType: (methodId: string) => string | undefined; liability: PrepaidReport["liability"] },
): PrepaidReport {
  const ledger = buildLedger(transactions, range, tz);
  const names = new Map(opts.names.map((n) => [n.id, n]));
  const rows = new Map<string, PrepaidRow>();
  const row = (type: PrepaidType, refId: string, fallback: string) => {
    const key = type === "gift_card" ? "gift_card" : `${type}:${refId}`;
    let r = rows.get(key);
    if (!r) {
      const n = type === "gift_card" ? undefined : names.get(refId);
      r = { key, type, refId, name: n?.name ?? fallback, nameAr: n?.nameAr ?? "", count: 0, valueMinor: 0, refundedMinor: 0 };
      rows.set(key, r);
    }
    return r;
  };
  const redemptions = { giftCardMinor: 0, packageCreditMinor: 0, packageSessions: 0 };
  for (const tx of ledger.invoices) {
    for (const item of tx.items) {
      if (item.type === "service" && item.redeemed) redemptions.packageSessions += item.quantity;
      if (!(PREPAID as string[]).includes(item.type)) continue;
      const r = row(item.type as PrepaidType, item.refId, item.name);
      r.count += item.quantity;
      r.valueMinor += item.totalMinor;
    }
    for (const p of tx.payments) {
      if (p.methodType === "gift_card") redemptions.giftCardMinor += p.amountMinor;
      if (p.methodType === "package") redemptions.packageCreditMinor += p.amountMinor;
    }
  }
  for (const c of ledger.creditLines) {
    if (!(PREPAID as string[]).includes(c.item.type)) continue;
    const r = row(c.item.type as PrepaidType, c.item.refId, c.item.name);
    r.count -= c.quantity;
    r.refundedMinor += c.amountMinor;
    r.valueMinor -= c.amountMinor;
  }
  for (const c of ledger.credits) {
    if (opts.methodType(c.methodId) === "gift_card") redemptions.giftCardMinor -= c.amountMinor;
  }
  const list = sortBy([...rows.values()], (r) => r.valueMinor, (r) => r.name);
  const byType = PREPAID.map((type) => {
    const of = list.filter((r) => r.type === type);
    return { type, count: of.reduce((s, r) => s + r.count, 0), valueMinor: of.reduce((s, r) => s + r.valueMinor, 0) };
  });
  return { rows: list, byType, redemptions, liability: opts.liability };
}
