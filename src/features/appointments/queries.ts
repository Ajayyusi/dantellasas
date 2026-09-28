import "server-only";

import { orgCol } from "@/lib/db";
import { ownAppointmentsOnly, type AppContext } from "@/lib/tenancy/context";
import type { AppointmentDTO, BlockedTimeDTO } from "@/lib/types";

import { toAppointment, toBlockedTime } from "./mappers";

/**
 * Appointments for a branch between two date keys (inclusive). Members
 * without view_all_appointments only get appointments containing their own
 * staff record (mirrors firestore.rules).
 */
export async function listAppointments(
  ctx: AppContext,
  branchId: string,
  fromKey: string,
  toKey: string,
): Promise<AppointmentDTO[]> {
  let q = orgCol(ctx.org.id, "appointments")
    .where("branchId", "==", branchId)
    .where("dateKey", ">=", fromKey)
    .where("dateKey", "<=", toKey);
  if (ownAppointmentsOnly(ctx)) {
    if (!ctx.staffId) return [];
    q = q.where("staffIds", "array-contains", ctx.staffId);
  }
  const snap = await q.get();
  return snap.docs.map((d) => toAppointment(d.id, d.data())).sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function listBlockedTimes(
  ctx: AppContext,
  branchId: string,
  fromKey: string,
  toKey: string,
): Promise<BlockedTimeDTO[]> {
  const snap = await orgCol(ctx.org.id, "blockedTimes")
    .where("branchId", "==", branchId)
    .where("dateKey", ">=", fromKey)
    .where("dateKey", "<=", toKey)
    .get();
  return snap.docs.map((d) => toBlockedTime(d.id, d.data()));
}

export async function getAppointment(ctx: AppContext, id: string): Promise<AppointmentDTO | null> {
  const snap = await orgCol(ctx.org.id, "appointments").doc(id).get();
  if (!snap.exists) return null;
  const appt = toAppointment(snap.id, snap.data() ?? {});
  if (!ctx.branches.some((b) => b.id === appt.branchId)) return null;
  if (ownAppointmentsOnly(ctx) && !(ctx.staffId && appt.staffIds.includes(ctx.staffId))) return null;
  return appt;
}
