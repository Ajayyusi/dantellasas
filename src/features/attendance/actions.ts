"use server";

import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";

import { action, fail } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { arr, db, iso, orgCol, str, type Data } from "@/lib/db";
import { todayKey, zonedInstant } from "@/lib/dates";
import { actorName, can, canAccessBranch, type AppContext } from "@/lib/tenancy/context";

import { clockInput, correctAttendanceInput, leaveDecisionInput, leaveInput } from "./schema";
import { workedMinutes } from "./utils";

type Break = { startAt: Timestamp | null; endAt: Timestamp | null };

const isManager = (ctx: AppContext) => can(ctx, "manage_attendance");

/**
 * Loads the staff record a clock action targets. Members may clock only
 * themselves (their linked staffId); managers may clock anyone in their branches.
 */
async function staffForClock(ctx: AppContext, staffId: string) {
  const self = ctx.staffId === staffId;
  if (!self && !isManager(ctx)) fail("errors.forbidden");
  const snap = await orgCol(ctx.org.id, "staff").doc(staffId).get();
  if (!snap.exists) fail("errors.notFound");
  const branchIds = arr<string>(snap.get("branchIds"));
  if (!self && branchIds.length > 0 && !branchIds.some((b) => canAccessBranch(ctx, b))) fail("errors.branchForbidden");
  if (str(snap.get("status"), "active") === "archived") fail("attendance.errors.staffArchived");
  return { name: str(snap.get("displayName")) || `${str(snap.get("firstName"))} ${str(snap.get("lastName"))}`.trim(), branchIds };
}

function pickBranch(ctx: AppContext, staffBranches: string[], requested?: string | null): string | null {
  const works = (b: string) => staffBranches.length === 0 || staffBranches.includes(b);
  if (requested && canAccessBranch(ctx, requested) && works(requested)) return requested;
  if (ctx.branchId && works(ctx.branchId)) return ctx.branchId;
  const shared = ctx.branches.find((b) => works(b.id));
  return shared?.id ?? staffBranches[0] ?? ctx.branchId ?? null;
}

/** The staff member's latest open record (a shift may have started on a previous day). */
async function openRecord(tx: Transaction, ctx: AppContext, staffId: string) {
  const snap = await tx.get(
    orgCol(ctx.org.id, "attendance").where("staffId", "==", staffId).where("status", "==", "open"),
  );
  const docs = [...snap.docs].sort((a, b) => str(b.get("dateKey")).localeCompare(str(a.get("dateKey"))));
  return docs[0] ?? null;
}

const breaksOf = (d: Data): Break[] =>
  arr<Data>(d.breaks).map((b) => ({
    startAt: b.startAt instanceof Timestamp ? b.startAt : null,
    endAt: b.endAt instanceof Timestamp ? b.endAt : null,
  }));

const toSpan = (b: Break) => ({ startAt: b.startAt?.toDate() ?? null, endAt: b.endAt?.toDate() ?? null });

export const clockInAction = action({ schema: clockInput }, async ({ staffId, branchId: requested }, ctx) => {
  const staff = await staffForClock(ctx, staffId);
  const branchId = pickBranch(ctx, staff.branchIds, requested);
  if (!branchId) fail("errors.branchRequired");
  const dateKey = todayKey(ctx.timezone);
  const col = orgCol(ctx.org.id, "attendance");
  const ref = col.doc();
  await db().runTransaction(async (tx) => {
    const open = await tx.get(
      col.where("staffId", "==", staffId).where("dateKey", "==", dateKey).where("status", "==", "open"),
    );
    if (!open.empty) fail("errors.alreadyClockedIn");
    tx.set(ref, {
      staffId,
      staffName: staff.name,
      branchId,
      dateKey,
      clockInAt: Timestamp.now(),
      clockOutAt: null,
      breaks: [],
      workedMinutes: 0,
      status: "open",
      corrections: [],
      clockedInByUid: ctx.session.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(ctx, { action: "attendance.clocked_in", entity: "attendance", entityId: ref.id, summary: staff.name, branchId }, tx);
  });
  return { id: ref.id };
});

export const startBreakAction = action({ schema: clockInput }, async ({ staffId }, ctx) => {
  const staff = await staffForClock(ctx, staffId);
  return db().runTransaction(async (tx) => {
    const rec = await openRecord(tx, ctx, staffId);
    if (!rec) fail("errors.notClockedIn");
    const breaks = breaksOf(rec.data());
    const last = breaks[breaks.length - 1];
    if (last && !last.endAt) fail("attendance.errors.alreadyOnBreak");
    tx.update(rec.ref, { breaks: [...breaks, { startAt: Timestamp.now(), endAt: null }], updatedAt: FieldValue.serverTimestamp() });
    audit(ctx, { action: "attendance.break_started", entity: "attendance", entityId: rec.id, summary: staff.name, branchId: str(rec.get("branchId")) }, tx);
    return { id: rec.id };
  });
});

export const endBreakAction = action({ schema: clockInput }, async ({ staffId }, ctx) => {
  const staff = await staffForClock(ctx, staffId);
  return db().runTransaction(async (tx) => {
    const rec = await openRecord(tx, ctx, staffId);
    if (!rec) fail("errors.notClockedIn");
    const breaks = breaksOf(rec.data());
    const last = breaks[breaks.length - 1];
    if (!last || last.endAt) fail("attendance.errors.notOnBreak");
    last.endAt = Timestamp.now();
    tx.update(rec.ref, { breaks, updatedAt: FieldValue.serverTimestamp() });
    audit(ctx, { action: "attendance.break_ended", entity: "attendance", entityId: rec.id, summary: staff.name, branchId: str(rec.get("branchId")) }, tx);
    return { id: rec.id };
  });
});

export const clockOutAction = action({ schema: clockInput }, async ({ staffId }, ctx) => {
  const staff = await staffForClock(ctx, staffId);
  return db().runTransaction(async (tx) => {
    const rec = await openRecord(tx, ctx, staffId);
    if (!rec) fail("errors.notClockedIn");
    const now = Timestamp.now();
    const breaks = breaksOf(rec.data()).map((b) => (b.endAt ? b : { ...b, endAt: now }));
    const clockInAt = rec.get("clockInAt") as Timestamp | undefined;
    const worked = workedMinutes({ clockInAt: clockInAt?.toDate() ?? null, clockOutAt: now.toDate(), breaks: breaks.map(toSpan) });
    tx.update(rec.ref, { clockOutAt: now, breaks, workedMinutes: worked, status: "closed", updatedAt: FieldValue.serverTimestamp() });
    audit(ctx, { action: "attendance.clocked_out", entity: "attendance", entityId: rec.id, summary: `${staff.name} · ${worked} min`, branchId: str(rec.get("branchId")) }, tx);
    return { id: rec.id, workedMinutes: worked };
  });
});

export const correctAttendanceAction = action(
  { schema: correctAttendanceInput, permission: "manage_attendance" },
  async (input, ctx) => {
    const col = orgCol(ctx.org.id, "attendance");
    const ref = col.doc(input.id);
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail("errors.notFound");
      const d = snap.data() ?? {};
      const branchId = str(d.branchId);
      if (!canAccessBranch(ctx, branchId)) fail("errors.branchForbidden");
      const dateKey = str(d.dateKey);
      const tz = ctx.timezone;

      const clockIn = zonedInstant(dateKey, input.clockIn, tz);
      const clockOut = input.clockOut ? zonedInstant(dateKey, input.clockOut, tz) : null;
      if (clockOut && clockOut <= clockIn) fail("errors.validation", { clockOut: "validation.endAfterStart" });
      const breaks: Break[] = input.breaks.map((b, i) => {
        const s = zonedInstant(dateKey, b.start, tz);
        const e = b.end ? zonedInstant(dateKey, b.end, tz) : null;
        const bound = clockOut ?? new Date(8.64e15);
        if (s < clockIn || s > bound || (e && (e <= s || e > bound))) {
          fail("errors.validation", { [`breaks.${i}.start`]: "attendance.errors.breakOutsideShift" });
        }
        if (!e && (clockOut || i < input.breaks.length - 1)) {
          fail("errors.validation", { [`breaks.${i}.end`]: "validation.required" });
        }
        return { startAt: Timestamp.fromDate(s), endAt: e ? Timestamp.fromDate(e) : null };
      });
      const status = clockOut ? "closed" : "open";
      if (status === "open" && d.status !== "open") {
        const other = await tx.get(
          col.where("staffId", "==", str(d.staffId)).where("dateKey", "==", dateKey).where("status", "==", "open"),
        );
        if (other.docs.some((o) => o.id !== ref.id)) fail("errors.alreadyClockedIn");
      }
      const worked = clockOut
        ? workedMinutes({ clockInAt: clockIn, clockOutAt: clockOut, breaks: breaks.map(toSpan) })
        : 0;

      const snapshotOf = (x: { clockInAt: unknown; clockOutAt: unknown; breaks: { startAt: unknown; endAt: unknown }[] }) => ({
        clockInAt: iso(x.clockInAt),
        clockOutAt: iso(x.clockOutAt),
        breaks: x.breaks.map((b) => ({ startAt: iso(b.startAt), endAt: iso(b.endAt) })),
      });
      const before = snapshotOf({ clockInAt: d.clockInAt, clockOutAt: d.clockOutAt, breaks: breaksOf(d) });
      const after = snapshotOf({ clockInAt: clockIn, clockOutAt: clockOut, breaks });

      tx.update(ref, {
        clockInAt: Timestamp.fromDate(clockIn),
        clockOutAt: clockOut ? Timestamp.fromDate(clockOut) : null,
        breaks,
        workedMinutes: worked,
        status,
        corrections: FieldValue.arrayUnion({
          at: new Date().toISOString(),
          byUid: ctx.session.uid,
          byName: actorName(ctx),
          reason: input.reason,
          before,
          after,
        }),
        updatedAt: FieldValue.serverTimestamp(),
      });
      audit(
        ctx,
        {
          action: "attendance.corrected",
          entity: "attendance",
          entityId: ref.id,
          summary: `${str(d.staffName)} · ${dateKey} · ${input.reason}`,
          branchId,
          changes: {
            clockInAt: [before.clockInAt, after.clockInAt],
            clockOutAt: [before.clockOutAt, after.clockOutAt],
            breaks: [before.breaks, after.breaks],
          },
        },
        tx,
      );
    });
    return { id: input.id };
  },
);

// ── Leave ──────────────────────────────────────────────────────────────

const canManageLeave = (ctx: AppContext) => can(ctx, "manage_staff") || can(ctx, "manage_attendance");

/** Members request leave for themselves; managers can record it for anyone in their branches. */
export const createLeaveAction = action({ schema: leaveInput }, async (input, ctx) => {
  const self = ctx.staffId === input.staffId;
  if (!self && !canManageLeave(ctx)) fail("errors.forbidden");
  const staffSnap = await orgCol(ctx.org.id, "staff").doc(input.staffId).get();
  if (!staffSnap.exists) fail("errors.notFound");
  const branchIds = arr<string>(staffSnap.get("branchIds"));
  if (!self && branchIds.length > 0 && !branchIds.some((b) => canAccessBranch(ctx, b))) fail("errors.branchForbidden");
  const staffName = str(staffSnap.get("displayName"));

  const existing = await orgCol(ctx.org.id, "leave").where("staffId", "==", input.staffId).get();
  const overlaps = existing.docs.some(
    (d) =>
      d.get("status") !== "rejected" &&
      str(d.get("startDate")) <= input.endDate &&
      str(d.get("endDate")) >= input.startDate,
  );
  if (overlaps) fail("attendance.errors.leaveOverlap");

  const ref = orgCol(ctx.org.id, "leave").doc();
  const batch = db().batch();
  batch.set(ref, {
    staffId: input.staffId,
    staffName,
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    status: "requested",
    note: input.note,
    requestedByUid: ctx.session.uid,
    requestedByName: actorName(ctx),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  audit(
    ctx,
    { action: "leave.requested", entity: "leave", entityId: ref.id, summary: `${staffName} · ${input.type} · ${input.startDate} → ${input.endDate}` },
    batch,
  );
  await batch.commit();
  return { id: ref.id };
});

export const decideLeaveAction = action({ schema: leaveDecisionInput }, async ({ id, status }, ctx) => {
  if (!canManageLeave(ctx)) fail("errors.forbidden");
  const ref = orgCol(ctx.org.id, "leave").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  if (snap.get("status") !== "requested") fail("errors.invalidStatusChange");
  const staffSnap = await orgCol(ctx.org.id, "staff").doc(str(snap.get("staffId"))).get();
  const branchIds = arr<string>(staffSnap.get("branchIds"));
  if (branchIds.length > 0 && !branchIds.some((b) => canAccessBranch(ctx, b))) fail("errors.branchForbidden");
  const batch = db().batch();
  batch.update(ref, {
    status,
    decidedByUid: ctx.session.uid,
    decidedByName: actorName(ctx),
    decidedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  audit(
    ctx,
    {
      action: `leave.${status}`,
      entity: "leave",
      entityId: id,
      summary: `${str(snap.get("staffName"))} · ${str(snap.get("startDate"))} → ${str(snap.get("endDate"))}`,
      changes: { status: ["requested", status] },
    },
    batch,
  );
  await batch.commit();
  return null;
});
