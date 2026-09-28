import "server-only";

import { Timestamp, type Transaction } from "firebase-admin/firestore";

import { toClient } from "@/features/clients/mappers";
import { toService } from "@/features/services/mappers";
import { toStaff } from "@/features/staff/mappers";
import { fail } from "@/lib/actions";
import { orgCol } from "@/lib/db";
import { minutesOfDay, zonedInstant } from "@/lib/dates";
import type { AppContext } from "@/lib/tenancy/context";
import { newId } from "@/lib/utils";

import { overlaps } from "./layout";
import type { AppointmentLineInput } from "./schema";
import { isActiveStatus } from "./status";

export interface BuiltLine {
  id: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  startAt: Timestamp;
  durationMin: number;
  priceMinor: number;
  discountMinor: number;
}

export interface BuiltAppointment {
  items: BuiltLine[];
  startAt: Timestamp;
  endAt: Timestamp;
  staffIds: string[];
  serviceIds: string[];
  totalMinor: number;
}

/**
 * Validates lines against the catalog and staff (reads inside the
 * transaction) and denormalises names so the appointment reads correctly
 * even after a rename.
 */
export async function buildLines(
  tx: Transaction,
  ctx: AppContext,
  branchId: string,
  dateKey: string,
  lines: AppointmentLineInput[],
): Promise<BuiltAppointment> {
  const serviceIds = [...new Set(lines.map((l) => l.serviceId))];
  const staffIds = [...new Set(lines.map((l) => l.staffId))];
  const [serviceSnaps, staffSnaps] = await Promise.all([
    tx.getAll(...serviceIds.map((id) => orgCol(ctx.org.id, "services").doc(id))),
    tx.getAll(...staffIds.map((id) => orgCol(ctx.org.id, "staff").doc(id))),
  ]);
  const services = new Map(serviceSnaps.filter((s) => s.exists).map((s) => [s.id, toService(s.id, s.data() ?? {})]));
  const staff = new Map(staffSnaps.filter((s) => s.exists).map((s) => [s.id, toStaff(s.id, s.data() ?? {})]));

  const items: BuiltLine[] = lines.map((l, i) => {
    const service = services.get(l.serviceId);
    const person = staff.get(l.staffId);
    if (!service) fail("errors.validation", { [`items.${i}.serviceId`]: "errors.notFound" });
    if (!person || person.status === "archived") fail("errors.validation", { [`items.${i}.staffId`]: "errors.notFound" });
    if (person.branchIds.length > 0 && !person.branchIds.includes(branchId)) {
      fail("errors.validation", { [`items.${i}.staffId`]: "errors.branchForbidden" });
    }
    return {
      id: l.id || newId("ln"),
      serviceId: service.id,
      serviceName: service.name,
      staffId: person.id,
      staffName: person.displayName,
      startAt: Timestamp.fromDate(zonedInstant(dateKey, l.start, ctx.timezone)),
      durationMin: l.durationMin,
      priceMinor: l.priceMinor,
      discountMinor: Math.min(l.discountMinor ?? 0, l.priceMinor),
    };
  });

  const starts = items.map((i) => i.startAt.toMillis());
  const ends = items.map((i) => i.startAt.toMillis() + i.durationMin * 60_000);
  return {
    items,
    startAt: Timestamp.fromMillis(Math.min(...starts)),
    endAt: Timestamp.fromMillis(Math.max(...ends)),
    staffIds: [...new Set(items.map((i) => i.staffId))],
    serviceIds: [...new Set(items.map((i) => i.serviceId))],
    totalMinor: items.reduce((s, i) => s + i.priceMinor - i.discountMinor, 0),
  };
}

/**
 * Rejects a line that overlaps another active booking or a blocked time for
 * the same staff member on that day (unless the org allows double-booking).
 * Must run before any transaction write.
 */
export async function assertNoConflicts(
  tx: Transaction,
  ctx: AppContext,
  args: { branchId: string; dateKey: string; items: BuiltLine[]; excludeId?: string },
) {
  const [apptSnap, blockSnap] = await Promise.all([
    tx.get(
      orgCol(ctx.org.id, "appointments")
        .where("branchId", "==", args.branchId)
        .where("dateKey", "==", args.dateKey),
    ),
    tx.get(
      orgCol(ctx.org.id, "blockedTimes")
        .where("branchId", "==", args.branchId)
        .where("dateKey", "==", args.dateKey),
    ),
  ]);
  const tz = ctx.timezone;
  const span = (startAt: Timestamp, minutes: number) => {
    const start = minutesOfDay(startAt.toDate(), tz);
    return { start, end: start + minutes };
  };

  for (const line of args.items) {
    const mine = span(line.startAt, line.durationMin);

    for (const b of blockSnap.docs) {
      if (b.get("staffId") !== line.staffId) continue;
      const start = minutesOfDay((b.get("startAt") as Timestamp).toDate(), tz);
      const end = minutesOfDay((b.get("endAt") as Timestamp).toDate(), tz);
      if (overlaps(mine, { start, end })) fail("errors.staffBlocked", undefined, { staff: line.staffName });
    }

    if (ctx.settings.appointments.allowStaffOverlap) continue;

    for (const other of args.items) {
      if (other === line || other.staffId !== line.staffId) continue;
      if (overlaps(mine, span(other.startAt, other.durationMin))) {
        fail("errors.staffOverlap", undefined, { staff: line.staffName });
      }
    }
    for (const d of apptSnap.docs) {
      if (d.id === args.excludeId || !isActiveStatus(d.get("status"))) continue;
      const lines = (d.get("items") ?? []) as { staffId: string; startAt: Timestamp; durationMin: number }[];
      for (const o of lines) {
        if (o.staffId !== line.staffId) continue;
        if (overlaps(mine, span(o.startAt, o.durationMin))) {
          fail("errors.staffOverlap", undefined, { staff: line.staffName });
        }
      }
    }
  }
}

export interface ClientRef {
  clientId: string | null;
  clientName: string;
  clientPhone: string;
}

/** Resolves the client for a booking (existing client or walk-in name). */
export async function resolveClient(
  tx: Transaction,
  ctx: AppContext,
  clientId: string | null,
  walkInName: string,
  walkInLabel: string,
): Promise<ClientRef> {
  if (clientId) {
    const snap = await tx.get(orgCol(ctx.org.id, "clients").doc(clientId));
    if (!snap.exists) fail("errors.validation", { clientId: "errors.notFound" });
    const c = toClient(snap.id, snap.data() ?? {});
    return { clientId: c.id, clientName: c.fullName, clientPhone: c.phone };
  }
  return { clientId: null, clientName: walkInName || walkInLabel, clientPhone: "" };
}

/**
 * Recomputes a client's next upcoming appointment (after bookings, moves,
 * cancellations). Runs outside the booking transaction; eventual is fine.
 */
export async function refreshClientNextAppointment(orgId: string, clientId: string | null) {
  if (!clientId) return;
  const snap = await orgCol(orgId, "appointments")
    .where("clientId", "==", clientId)
    .where("startAt", ">=", Timestamp.now())
    .orderBy("startAt", "asc")
    .limit(10)
    .get();
  const next = snap.docs.find((d) => isActiveStatus(d.get("status")) && d.get("status") !== "completed");
  await orgCol(orgId, "clients")
    .doc(clientId)
    .update({ "stats.nextAppointmentAt": next ? next.get("startAt") : null })
    .catch(() => undefined);
}

export function describeAppointment(clientName: string, items: { serviceName: string; staffName: string }[], when: string) {
  const lines = items.map((i) => `${i.serviceName} · ${i.staffName}`).join(", ");
  return `${clientName} — ${lines} — ${when}`;
}
