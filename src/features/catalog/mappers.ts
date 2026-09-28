import "server-only";

import { arr, bool, iso, num, str, strOrNull, type Data } from "@/lib/db";
import type {
  ClientMembershipDTO,
  CommissionRuleDTO,
  DiscountDTO,
  GiftCardDTO,
  MembershipPlanDTO,
  PackageDTO,
} from "@/lib/types";

type ServiceItem = { serviceId: string; serviceName: string; quantity: number };

function serviceItems(v: unknown): ServiceItem[] {
  return arr<Data>(v).map((i) => ({
    serviceId: str(i.serviceId),
    serviceName: str(i.serviceName),
    quantity: Math.max(1, num(i.quantity, 1)),
  }));
}

export function toPackage(id: string, d: Data): PackageDTO {
  return {
    id,
    name: str(d.name),
    nameAr: str(d.nameAr),
    description: str(d.description),
    kind: d.kind === "credit" ? "credit" : "services",
    priceMinor: num(d.priceMinor),
    validityDays: num(d.validityDays),
    items: serviceItems(d.items),
    creditMinor: num(d.creditMinor),
    active: bool(d.active, true),
    sortOrder: num(d.sortOrder),
  };
}

const PERIODS = ["monthly", "quarterly", "yearly"] as const;

export function toMembershipPlan(id: string, d: Data): MembershipPlanDTO {
  return {
    id,
    name: str(d.name),
    nameAr: str(d.nameAr),
    description: str(d.description),
    priceMinor: num(d.priceMinor),
    period: PERIODS.includes(d.period) ? d.period : "monthly",
    serviceDiscountBps: num(d.serviceDiscountBps),
    productDiscountBps: num(d.productDiscountBps),
    includedServices: serviceItems(d.includedServices),
    active: bool(d.active, true),
  };
}

export function toClientMembership(id: string, d: Data): ClientMembershipDTO {
  const benefits = (d.benefits ?? {}) as Data;
  const endAt = iso(d.endAt);
  let status: ClientMembershipDTO["status"] =
    d.status === "cancelled" ? "cancelled" : d.status === "expired" ? "expired" : "active";
  // Lapsed memberships read as expired even before a job flips the stored status.
  if (status === "active" && endAt && Date.parse(endAt) < Date.now()) status = "expired";
  return {
    id,
    clientId: str(d.clientId),
    clientName: str(d.clientName),
    planId: str(d.planId),
    planName: str(d.planName),
    startAt: iso(d.startAt),
    endAt,
    status,
    autoRenew: bool(d.autoRenew),
    serviceDiscountBps: num(benefits.serviceDiscountBps, num(d.serviceDiscountBps)),
    productDiscountBps: num(benefits.productDiscountBps, num(d.productDiscountBps)),
  };
}

export function toGiftCard(id: string, d: Data): GiftCardDTO {
  const expiresAt = iso(d.expiresAt);
  const balanceMinor = num(d.balanceMinor);
  let status: GiftCardDTO["status"] =
    d.status === "void" ? "void" : d.status === "redeemed" ? "redeemed" : d.status === "expired" ? "expired" : "active";
  if (status === "active" && balanceMinor <= 0) status = "redeemed";
  if (status === "active" && expiresAt && Date.parse(expiresAt) < Date.now()) status = "expired";
  return {
    id,
    code: str(d.code),
    initialMinor: num(d.initialMinor),
    balanceMinor,
    issuedAt: iso(d.issuedAt),
    expiresAt,
    purchaserClientId: strOrNull(d.purchaserClientId),
    purchaserName: str(d.purchaserName),
    recipientName: str(d.recipientName),
    recipientEmail: str(d.recipientEmail),
    message: str(d.message),
    status,
    redemptions: arr<Data>(d.redemptions).map((r) => ({
      at: iso(r.at),
      amountMinor: num(r.amountMinor),
      transactionId: strOrNull(r.transactionId),
    })),
  };
}

export function toDiscount(id: string, d: Data): DiscountDTO {
  const max = num(d.maxUses, 0);
  return {
    id,
    name: str(d.name),
    code: str(d.code),
    kind: d.kind === "fixed" ? "fixed" : "percent",
    valueBps: num(d.valueBps),
    valueMinor: num(d.valueMinor),
    appliesTo: d.appliesTo === "services" || d.appliesTo === "products" ? d.appliesTo : "all",
    startsAt: strOrNull(d.startsAt),
    endsAt: strOrNull(d.endsAt),
    maxUses: max > 0 ? max : null,
    usedCount: num(d.usedCount),
    active: bool(d.active, true),
  };
}

export function toCommissionRule(id: string, d: Data): CommissionRuleDTO {
  return {
    id,
    name: str(d.name),
    itemType: d.itemType === "product" || d.itemType === "all" ? d.itemType : "service",
    staffId: strOrNull(d.staffId),
    serviceId: strOrNull(d.serviceId),
    rateBps: num(d.rateBps),
    priority: num(d.priority),
    active: bool(d.active, true),
  };
}
