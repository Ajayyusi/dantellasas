import { formatDuration } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import { localName } from "@/lib/localize";
import { defaultTaxRate, taxRateFor, type OrgSettings } from "@/lib/settings";
import { newId } from "@/lib/utils";

import { taxableAtSale, type OrderDiscount, type PricingLine } from "../pricing";
import type { SaleInput } from "../schema";
import type { DiscountState, PosCatalog, PosLine } from "./pos-types";

/** Builders that turn catalogue picks into ticket lines, and the ticket into a sale request. */

function base(partial: Pick<PosLine, "type" | "refId" | "name" | "detail" | "unitPriceMinor" | "taxRateBps"> & Partial<PosLine>): PosLine {
  return {
    key: newId(),
    staffId: null,
    quantity: 1,
    catalogPriceMinor: partial.unitPriceMinor,
    discountMinor: 0,
    redeemClientPackageId: null,
    appointmentLineId: null,
    giftCard: null,
    ...partial,
  };
}

export function serviceLine(catalog: PosCatalog, id: string, settings: OrgSettings, locale: Locale, staffId: string | null): PosLine | null {
  const s = catalog.services.find((x) => x.id === id);
  if (!s) return null;
  return base({
    type: "service",
    refId: s.id,
    name: localName(s, locale),
    detail: formatDuration(s.durationMin, locale),
    unitPriceMinor: s.priceMinor,
    taxRateBps: taxRateFor(settings, s),
    staffId,
  });
}

export function productLine(catalog: PosCatalog, id: string, settings: OrgSettings, staffId: string | null): PosLine | null {
  const p = catalog.products.find((x) => x.id === id);
  if (!p) return null;
  return base({
    type: "product",
    refId: p.id,
    name: [p.brand, p.name].filter(Boolean).join(" "),
    detail: p.sku,
    unitPriceMinor: p.priceMinor,
    taxRateBps: taxRateFor(settings, p),
    staffId,
  });
}

export function packageLine(catalog: PosCatalog, id: string, settings: OrgSettings, locale: Locale, detail: string): PosLine | null {
  const p = catalog.packages.find((x) => x.id === id);
  if (!p) return null;
  return base({
    type: "package",
    refId: p.id,
    name: localName(p, locale),
    detail,
    unitPriceMinor: p.priceMinor,
    taxRateBps: taxableAtSale("package", p.kind) ? (defaultTaxRate(settings)?.rateBps ?? 0) : 0,
  });
}

export function membershipLine(catalog: PosCatalog, id: string, settings: OrgSettings, locale: Locale, detail: string): PosLine | null {
  const p = catalog.plans.find((x) => x.id === id);
  if (!p) return null;
  return base({
    type: "membership",
    refId: p.id,
    name: localName(p, locale),
    detail,
    unitPriceMinor: p.priceMinor,
    taxRateBps: settings.tax.enabled ? (defaultTaxRate(settings)?.rateBps ?? 0) : 0,
  });
}

export function giftCardLine(name: string, detail: string, amountMinor: number, giftCard: NonNullable<PosLine["giftCard"]>): PosLine {
  return base({ type: "gift_card", refId: "", name, detail, unitPriceMinor: amountMinor, catalogPriceMinor: null, taxRateBps: 0, giftCard });
}

/** A line covered by a package is charged at zero, like on the server. */
export function toPricingLine(l: PosLine): PricingLine {
  const redeemed = !!l.redeemClientPackageId;
  return {
    type: l.type,
    quantity: l.quantity,
    unitPriceMinor: redeemed ? 0 : l.unitPriceMinor,
    discountMinor: redeemed ? 0 : l.discountMinor,
    taxRateBps: l.taxRateBps,
  };
}

export function toOrderDiscount(d: DiscountState): OrderDiscount {
  switch (d.kind) {
    case "percent":
      return { kind: "percent", valueBps: d.valueBps, valueMinor: 0, appliesTo: "all" };
    case "fixed":
      return { kind: "fixed", valueBps: 0, valueMinor: d.valueMinor, appliesTo: "all" };
    case "code":
      return { kind: d.discountKind, valueBps: d.valueBps, valueMinor: d.valueMinor, appliesTo: d.appliesTo };
    default:
      return { kind: "none", valueBps: 0, valueMinor: 0, appliesTo: "all" };
  }
}

export function toSaleDiscount(d: DiscountState): NonNullable<SaleInput["orderDiscount"]> {
  switch (d.kind) {
    case "percent":
      return { kind: "percent", valueBps: d.valueBps, valueMinor: 0, code: "" };
    case "fixed":
      return { kind: "fixed", valueBps: 0, valueMinor: d.valueMinor, code: "" };
    case "code":
      return { kind: "code", valueBps: 0, valueMinor: 0, code: d.code };
    default:
      return { kind: "none", valueBps: 0, valueMinor: 0, code: "" };
  }
}

export function toSaleLines(lines: PosLine[]): SaleInput["lines"] {
  return lines.map((l) => ({
    key: l.key,
    type: l.type,
    refId: l.refId,
    staffId: l.staffId,
    quantity: l.quantity,
    unitPriceMinor: l.unitPriceMinor,
    discountMinor: l.discountMinor,
    redeemClientPackageId: l.redeemClientPackageId,
    appointmentLineId: l.appointmentLineId,
    giftCard: l.giftCard,
  }));
}
