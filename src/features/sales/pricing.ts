import { computeTicket, percentOf, type TicketResult } from "@/lib/money";
import type { SaleItemType } from "@/lib/types";

/**
 * Pure checkout pricing shared by the POS preview and the server. The server
 * re-runs it with authoritative prices and settings; the client uses it so the
 * screen always matches the invoice.
 */

export interface PricingLine {
  type: SaleItemType;
  quantity: number;
  unitPriceMinor: number;
  /** Manual line discount (minor units, for the whole line). */
  discountMinor: number;
  taxRateBps: number;
}

export interface OrderDiscount {
  kind: "none" | "percent" | "fixed";
  valueBps: number;
  valueMinor: number;
  appliesTo: "all" | "services" | "products";
}

export interface MemberBenefits {
  serviceDiscountBps: number;
  productDiscountBps: number;
}

export interface PricedLine {
  baseMinor: number;
  manualDiscountMinor: number;
  memberDiscountMinor: number;
  orderDiscountMinor: number;
  discountMinor: number;
  netMinor: number;
  taxMinor: number;
  totalMinor: number;
}

export interface PricingResult {
  lines: PricedLine[];
  subtotalMinor: number;
  discountMinor: number;
  orderDiscountMinor: number;
  memberDiscountMinor: number;
  taxMinor: number;
  totalMinor: number;
  tipMinor: number;
  dueMinor: number;
}

export const NO_DISCOUNT: OrderDiscount = { kind: "none", valueBps: 0, valueMinor: 0, appliesTo: "all" };

function eligible(type: SaleItemType, appliesTo: OrderDiscount["appliesTo"]): boolean {
  if (type !== "service" && type !== "product") return false;
  return appliesTo === "all" || (appliesTo === "services" ? type === "service" : type === "product");
}

export function priceSale(
  lines: PricingLine[],
  opts: { orderDiscount?: OrderDiscount; member?: MemberBenefits | null; pricesIncludeTax: boolean; tipMinor?: number },
): PricingResult {
  const order = opts.orderDiscount ?? NO_DISCOUNT;
  const stage = lines.map((l) => {
    const base = Math.max(0, Math.round(l.unitPriceMinor * l.quantity));
    const manual = Math.min(base, Math.max(0, Math.round(l.discountMinor)));
    const memberBps =
      opts.member && l.type === "service"
        ? opts.member.serviceDiscountBps
        : opts.member && l.type === "product"
          ? opts.member.productDiscountBps
          : 0;
    const member = Math.min(base - manual, percentOf(base - manual, memberBps));
    return { base, manual, member, value: base - manual - member };
  });

  // Order discount, spread over eligible lines in proportion to their value.
  const pool = stage.reduce((s, l, i) => (eligible(lines[i]!.type, order.appliesTo) ? s + l.value : s), 0);
  let orderTotal = 0;
  if (order.kind === "percent") orderTotal = percentOf(pool, order.valueBps);
  if (order.kind === "fixed") orderTotal = order.valueMinor;
  orderTotal = Math.min(pool, Math.max(0, orderTotal));
  const shares = stage.map(() => 0);
  if (orderTotal > 0) {
    const idx = stage.map((_, i) => i).filter((i) => eligible(lines[i]!.type, order.appliesTo) && stage[i]!.value > 0);
    let allocated = 0;
    idx.forEach((i, n) => {
      const share = n === idx.length - 1 ? orderTotal - allocated : Math.floor((orderTotal * stage[i]!.value) / pool);
      shares[i] = share;
      allocated += share;
    });
  }

  const ticket: TicketResult = computeTicket(
    lines.map((l, i) => ({
      unitPriceMinor: stage[i]!.base,
      quantity: 1,
      discountMinor: stage[i]!.manual + stage[i]!.member + shares[i]!,
      taxRateBps: l.taxRateBps,
    })),
    0,
    opts.pricesIncludeTax,
  );

  const priced: PricedLine[] = ticket.lines.map((t, i) => ({
    baseMinor: stage[i]!.base,
    manualDiscountMinor: stage[i]!.manual,
    memberDiscountMinor: stage[i]!.member,
    orderDiscountMinor: shares[i]!,
    discountMinor: t.discountMinor,
    netMinor: t.netMinor,
    taxMinor: t.taxMinor,
    totalMinor: t.totalMinor,
  }));
  const tip = Math.max(0, Math.round(opts.tipMinor ?? 0));
  return {
    lines: priced,
    subtotalMinor: ticket.subtotalMinor,
    discountMinor: ticket.discountMinor,
    orderDiscountMinor: shares.reduce((a, b) => a + b, 0),
    memberDiscountMinor: stage.reduce((s, l) => s + l.member, 0),
    taxMinor: ticket.taxMinor,
    totalMinor: ticket.totalMinor,
    tipMinor: tip,
    dueMinor: ticket.totalMinor + tip,
  };
}

/** VAT treatment by item type (UAE): vouchers and monetary credit are taxed on redemption. */
export function taxableAtSale(type: SaleItemType, packageKind?: "services" | "credit"): boolean {
  if (type === "gift_card") return false;
  if (type === "package" && packageKind === "credit") return false;
  return true;
}
