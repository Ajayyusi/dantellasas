"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { action, fail } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";
import { addDaysToKey, minutesOfDay, minutesToTime, timeToMinutes, zonedInstant } from "@/lib/dates";
import { can, canAccessBranch, writeBranchId } from "@/lib/tenancy/context";
import type { AppointmentStatus } from "@/lib/types";

import { toAppointment } from "./mappers";
import { listAppointments, listBlockedTimes } from "./queries";
import { appointmentInput, blockedTimeInput, rescheduleInput, statusInput } from "./schema";
import {
  assertNoConflicts,
  buildLines,
  describeAppointment,
  refreshClientNextAppointment,
  resolveClient,
} from "./service";
import { canTransition, isEditableStatus, permissionForStatus } from "./status";

const WALK_IN = "Walk-in";

/** Create or edit an appointment (multi-service, each line with its own staff/time/price). */
export const saveAppointmentAction = action(
  { schema: appointmentInput, permission: "create_appointments" },
  async (input, ctx) => {
    if (input.id && !can(ctx, "edit_appointments")) fail("errors.forbidden");
    const branchId = writeBranchId(ctx, input.branchId);
    if (!branchId) fail("errors.branchRequired");
    if (input.branchId && !canAccessBranch(ctx, input.branchId)) fail("errors.branchForbidden");

    const ref = input.id ? orgCol(ctx.org.id, "appointments").doc(input.id) : orgCol(ctx.org.id, "appointments").doc();
    let previousClientId: string | null = null;

    const result = await db().runTransaction(async (tx) => {
      if (input.id) {
        const snap = await tx.get(ref);
        if (!snap.exists) fail("errors.notFound");
        const existing = toAppointment(snap.id, snap.data() ?? {});
        if (!canAccessBranch(ctx, existing.branchId)) fail("errors.branchForbidden");
        if (!isEditableStatus(existing.status)) fail("errors.invalidStatusChange");
        previousClientId = existing.clientId;
      }
      const built = await buildLines(tx, ctx, branchId, input.date, input.items);
      const client = await resolveClient(tx, ctx, input.clientId, input.walkInName, WALK_IN);
      await assertNoConflicts(tx, ctx, { branchId, dateKey: input.date, items: built.items, excludeId: input.id });

      const data = {
        branchId,
        dateKey: input.date,
        ...client,
        source: input.source,
        notes: input.notes,
        ...built,
        updatedAt: FieldValue.serverTimestamp(),
      };
      const when = `${input.date} ${input.items[0]?.start ?? ""}`;
      if (input.id) {
        tx.update(ref, data);
        audit(ctx, { action: "appointment.updated", entity: "appointment", entityId: ref.id, branchId, summary: describeAppointment(client.clientName, built.items, when) }, tx);
      } else {
        tx.set(ref, {
          ...data,
          status: "booked" as AppointmentStatus,
          cancellation: null,
          transactionId: null,
          createdByUid: ctx.session.uid,
          createdAt: FieldValue.serverTimestamp(),
        });
        audit(ctx, { action: "appointment.created", entity: "appointment", entityId: ref.id, branchId, summary: describeAppointment(client.clientName, built.items, when) }, tx);
      }
      return { id: ref.id, clientId: client.clientId };
    });

    await refreshClientNextAppointment(ctx.org.id, result.clientId);
    if (previousClientId && previousClientId !== result.clientId) {
      await refreshClientNextAppointment(ctx.org.id, previousClientId);
    }
    return { id: result.id };
  },
);

/** Drag-and-drop move: shifts every line by the same delta, optionally to another staff member. */
export const rescheduleAppointmentAction = action(
  { schema: rescheduleInput, permission: "edit_appointments" },
  async (input, ctx) => {
    const ref = orgCol(ctx.org.id, "appointments").doc(input.id);
    const clientId = await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail("errors.notFound");
      const appt = toAppointment(snap.id, snap.data() ?? {});
      if (!canAccessBranch(ctx, appt.branchId)) fail("errors.branchForbidden");
      if (!isEditableStatus(appt.status)) fail("errors.invalidStatusChange");

      const tz = ctx.timezone;
      const earliest = Math.min(...appt.items.map((i) => minutesOfDay(new Date(i.startAt), tz)));
      const delta = timeToMinutes(input.start) - earliest;
      const singleStaff = new Set(appt.items.map((i) => i.staffId)).size === 1;
      if (input.staffId && !singleStaff) fail("errors.invalidStatusChange");

      const lines = appt.items.map((i) => ({
        id: i.id,
        serviceId: i.serviceId,
        staffId: input.staffId ?? i.staffId,
        start: minutesToTime(minutesOfDay(new Date(i.startAt), tz) + delta),
        durationMin: i.durationMin,
        priceMinor: i.priceMinor,
        discountMinor: i.discountMinor,
      }));
      const built = await buildLines(tx, ctx, appt.branchId, input.date, lines);
      await assertNoConflicts(tx, ctx, { branchId: appt.branchId, dateKey: input.date, items: built.items, excludeId: appt.id });
      tx.update(ref, { dateKey: input.date, ...built, updatedAt: FieldValue.serverTimestamp() });
      audit(
        ctx,
        {
          action: "appointment.rescheduled",
          entity: "appointment",
          entityId: appt.id,
          branchId: appt.branchId,
          summary: describeAppointment(appt.clientName, built.items, `${input.date} ${input.start}`),
          changes: { when: [`${appt.dateKey} ${minutesToTime(earliest)}`, `${input.date} ${input.start}`] },
        },
        tx,
      );
      return appt.clientId;
    });
    await refreshClientNextAppointment(ctx.org.id, clientId);
    return null;
  },
);

/** Lifecycle changes: confirm, check in, start, complete, no-show, cancel, restore. */
export const setAppointmentStatusAction = action(
  { schema: statusInput, permission: "view_appointments" },
  async (input, ctx) => {
    if (!can(ctx, permissionForStatus(input.status))) fail("errors.forbidden");
    const ref = orgCol(ctx.org.id, "appointments").doc(input.id);
    const clientId = await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail("errors.notFound");
      const appt = toAppointment(snap.id, snap.data() ?? {});
      if (!canAccessBranch(ctx, appt.branchId)) fail("errors.branchForbidden");
      if (!canTransition(appt.status, input.status)) fail("errors.invalidStatusChange");

      const now = FieldValue.serverTimestamp();
      const patch: Record<string, unknown> = { status: input.status, updatedAt: now };
      if (input.status === "checked_in") patch.checkedInAt = now;
      if (input.status === "in_service") patch.startedAt = now;
      if (input.status === "completed") patch.completedAt = now;
      if (input.status === "cancelled") {
        patch.cancellation = { reason: input.reason, note: input.note, at: Timestamp.now(), byUid: ctx.session.uid };
      }
      if (input.status === "booked") patch.cancellation = null;
      tx.update(ref, patch);

      if (appt.clientId) {
        const clientRef = orgCol(ctx.org.id, "clients").doc(appt.clientId);
        if (input.status === "cancelled") tx.update(clientRef, { "stats.cancellations": FieldValue.increment(1) });
        if (input.status === "no_show") tx.update(clientRef, { "stats.noShows": FieldValue.increment(1) });
        if (input.status === "booked" && appt.status === "cancelled") tx.update(clientRef, { "stats.cancellations": FieldValue.increment(-1) });
        if (input.status === "booked" && appt.status === "no_show") tx.update(clientRef, { "stats.noShows": FieldValue.increment(-1) });
      }
      audit(
        ctx,
        {
          action: input.status === "cancelled" ? "appointment.cancelled" : "appointment.status_changed",
          entity: "appointment",
          entityId: appt.id,
          branchId: appt.branchId,
          summary: `${appt.clientName}: ${appt.status} → ${input.status}${input.reason ? ` (${input.reason})` : ""}`,
          changes: { status: [appt.status, input.status] },
        },
        tx,
      );
      return appt.clientId;
    });
    await refreshClientNextAppointment(ctx.org.id, clientId);
    return null;
  },
);

export const createBlockedTimeAction = action(
  { schema: blockedTimeInput, permission: "edit_appointments" },
  async (input, ctx) => {
    const branchId = writeBranchId(ctx);
    if (!branchId) fail("errors.branchRequired");
    if (timeToMinutes(input.end) <= timeToMinutes(input.start)) fail("errors.validation", { end: "validation.endAfterStart" });
    const staff = await orgCol(ctx.org.id, "staff").doc(input.staffId).get();
    if (!staff.exists) fail("errors.notFound");
    const ref = orgCol(ctx.org.id, "blockedTimes").doc();
    const batch = db().batch();
    batch.set(ref, {
      branchId,
      staffId: input.staffId,
      dateKey: input.date,
      startAt: Timestamp.fromDate(zonedInstant(input.date, input.start, ctx.timezone)),
      endAt: Timestamp.fromDate(zonedInstant(input.date, input.end, ctx.timezone)),
      reason: input.reason,
      createdByUid: ctx.session.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    audit(ctx, { action: "blocked_time.created", entity: "blockedTime", entityId: ref.id, branchId, summary: `${staff.get("displayName")} ${input.date} ${input.start}–${input.end} ${input.reason}` }, batch);
    await batch.commit();
    return { id: ref.id };
  },
);

export const deleteBlockedTimeAction = action(
  { schema: z.object({ id: z.string().min(1) }), permission: "edit_appointments" },
  async ({ id }, ctx) => {
    const ref = orgCol(ctx.org.id, "blockedTimes").doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    if (!canAccessBranch(ctx, snap.get("branchId"))) fail("errors.branchForbidden");
    const batch = db().batch();
    batch.delete(ref);
    audit(ctx, { action: "blocked_time.deleted", entity: "blockedTime", entityId: id, branchId: snap.get("branchId"), summary: String(snap.get("reason") ?? "") }, batch);
    await batch.commit();
    return null;
  },
);

/** Calendar data for a date range (used by client-side navigation without a full page load). */
export const loadCalendarAction = action(
  {
    schema: z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
    permission: "view_appointments",
    revalidate: false,
  },
  async ({ from, to }, ctx) => {
    if (!ctx.branchId) fail("errors.branchRequired");
    if (to < from || to > addDaysToKey(from, 42)) fail("errors.validation");
    const [appointments, blocked] = await Promise.all([
      listAppointments(ctx, ctx.branchId, from, to),
      listBlockedTimes(ctx, ctx.branchId, from, to),
    ]);
    return { appointments, blocked };
  },
);
