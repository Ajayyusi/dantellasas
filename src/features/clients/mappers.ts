import "server-only";

import { arr, bool, iso, num, str, strOrNull, type Data } from "@/lib/db";
import type { AuditLogDTO, ClientDTO, ClientMembershipDTO, ClientNoteDTO, ClientPackageDTO } from "@/lib/types";

import type { ClientActivityView } from "./types";

export function toClient(id: string, d: Data): ClientDTO {
  const stats = (d.stats ?? {}) as Data;
  const birthday = d.birthday as ClientDTO["birthday"] | undefined;
  return {
    id,
    firstName: str(d.firstName),
    lastName: str(d.lastName),
    fullName: str(d.fullName) || `${str(d.firstName)} ${str(d.lastName)}`.trim(),
    phone: str(d.phone),
    email: str(d.email),
    birthday: birthday && birthday.month && birthday.day ? birthday : null,
    gender: (str(d.gender) as ClientDTO["gender"]) || "",
    nationality: str(d.nationality),
    source: str(d.source),
    tags: arr<string>(d.tags),
    notes: str(d.notes),
    preferredStaffId: strOrNull(d.preferredStaffId),
    marketingConsent: bool(d.marketingConsent),
    status: d.status === "archived" ? "archived" : "active",
    stats: {
      visits: num(stats.visits),
      totalSpendMinor: num(stats.totalSpendMinor),
      lastVisitAt: iso(stats.lastVisitAt),
      firstVisitAt: iso(stats.firstVisitAt),
      nextAppointmentAt: iso(stats.nextAppointmentAt),
      noShows: num(stats.noShows),
      cancellations: num(stats.cancellations),
    },
    createdAt: iso(d.createdAt),
  };
}

export function toClientNote(id: string, d: Data): ClientNoteDTO {
  return {
    id,
    body: str(d.body),
    pinned: bool(d.pinned),
    authorName: str(d.authorName),
    createdAt: iso(d.createdAt),
  };
}

export function toClientPackage(id: string, d: Data): ClientPackageDTO {
  return {
    id,
    clientId: str(d.clientId),
    clientName: str(d.clientName),
    packageId: str(d.packageId),
    name: str(d.name),
    kind: d.kind === "credit" ? "credit" : "services",
    purchasedAt: iso(d.purchasedAt),
    expiresAt: iso(d.expiresAt),
    items: arr<Data>(d.items).map((i) => ({
      serviceId: str(i.serviceId),
      serviceName: str(i.serviceName),
      total: num(i.total),
      used: num(i.used),
    })),
    creditMinor: num(d.creditMinor),
    creditUsedMinor: num(d.creditUsedMinor),
    status: (["active", "exhausted", "expired", "cancelled"].includes(str(d.status)) ? d.status : "active") as ClientPackageDTO["status"],
    redemptions: arr<Data>(d.redemptions).map((r) => ({
      at: iso(r.at),
      label: str(r.label) || str(r.serviceName),
      quantity: num(r.quantity, 1),
      amountMinor: num(r.amountMinor),
    })),
  };
}

export function toClientMembership(id: string, d: Data): ClientMembershipDTO {
  const benefits = (d.benefits ?? {}) as Data;
  return {
    id,
    clientId: str(d.clientId),
    clientName: str(d.clientName),
    planId: str(d.planId),
    planName: str(d.planName),
    startAt: iso(d.startAt),
    endAt: iso(d.endAt),
    status: (["active", "expired", "cancelled"].includes(str(d.status)) ? d.status : "active") as ClientMembershipDTO["status"],
    autoRenew: bool(d.autoRenew),
    serviceDiscountBps: num(d.serviceDiscountBps, num(benefits.serviceDiscountBps)),
    productDiscountBps: num(d.productDiscountBps, num(benefits.productDiscountBps)),
  };
}

export function toAuditLog(id: string, d: Data): AuditLogDTO {
  return {
    id,
    action: str(d.action),
    entity: str(d.entity),
    entityId: str(d.entityId),
    summary: str(d.summary),
    branchId: strOrNull(d.branchId),
    actorName: str(d.actorName),
    at: iso(d.at),
  };
}

export function toClientActivity(id: string, d: Data): ClientActivityView {
  const log = toAuditLog(id, d);
  const changes = d.changes && typeof d.changes === "object" ? Object.keys(d.changes as Data) : [];
  return { id, action: log.action, summary: log.summary, actorName: log.actorName, at: log.at, changedFields: changes };
}
