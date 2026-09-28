"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";

import { toMembershipPlan } from "./mappers";
import { addPeriod, type MembershipPeriod } from "./periods";
import { listPlanMembers } from "./queries";
import { activeInput, idInput, planInput } from "./schema";
import { resolveServiceItems } from "./service";

const AUDITED = [
  "name",
  "nameAr",
  "priceMinor",
  "period",
  "serviceDiscountBps",
  "productDiscountBps",
  "includedServices",
  "active",
];

export const savePlanAction = action({ schema: planInput, permission: "manage_catalog" }, async (input, ctx) => {
  const includedServices = await resolveServiceItems(ctx.org.id, input.includedServices, "includedServices");
  const data = {
    name: input.name,
    nameAr: input.nameAr,
    description: input.description,
    priceMinor: input.priceMinor,
    period: input.period,
    serviceDiscountBps: input.serviceDiscountBps,
    productDiscountBps: input.productDiscountBps,
    includedServices,
    active: input.active,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const col = orgCol(ctx.org.id, "membershipPlans");
  if (input.id) {
    const ref = col.doc(input.id);
    const before = await ref.get();
    if (!before.exists) fail("errors.notFound");
    const batch = db().batch();
    batch.update(ref, data);
    audit(
      ctx,
      {
        action: "membership_plan.updated",
        entity: "membershipPlan",
        entityId: ref.id,
        summary: input.name,
        changes: diff(before.data() ?? {}, data, AUDITED),
      },
      batch,
    );
    await batch.commit();
    return { id: ref.id };
  }
  const ref = col.doc();
  const batch = db().batch();
  batch.set(ref, { ...data, createdAt: FieldValue.serverTimestamp() });
  audit(ctx, { action: "membership_plan.created", entity: "membershipPlan", entityId: ref.id, summary: input.name }, batch);
  await batch.commit();
  return { id: ref.id };
});

export const setPlanActiveAction = action({ schema: activeInput, permission: "manage_catalog" }, async ({ id, active }, ctx) => {
  const ref = orgCol(ctx.org.id, "membershipPlans").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  const batch = db().batch();
  batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
  audit(
    ctx,
    {
      action: active ? "membership_plan.activated" : "membership_plan.deactivated",
      entity: "membershipPlan",
      entityId: id,
      summary: String(snap.get("name") ?? ""),
    },
    batch,
  );
  await batch.commit();
  return null;
});

export const deletePlanAction = action({ schema: idInput, permission: "manage_catalog" }, async ({ id }, ctx) => {
  const ref = orgCol(ctx.org.id, "membershipPlans").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  const used = await orgCol(ctx.org.id, "clientMemberships").where("planId", "==", id).limit(1).get();
  if (!used.empty) fail("errors.cannotDeleteInUse");
  const batch = db().batch();
  batch.delete(ref);
  audit(
    ctx,
    { action: "membership_plan.deleted", entity: "membershipPlan", entityId: id, summary: String(snap.get("name") ?? "") },
    batch,
  );
  await batch.commit();
  return null;
});

export const listPlanMembersAction = action(
  { schema: idInput, permission: "manage_catalog", revalidate: false },
  async ({ id }, ctx) => listPlanMembers(ctx.org.id, id),
);

export const cancelMembershipAction = action({ schema: idInput, permission: "manage_catalog" }, async ({ id }, ctx) => {
  const ref = orgCol(ctx.org.id, "clientMemberships").doc(id);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) fail("errors.notFound");
    if (snap.get("status") === "cancelled") fail("errors.invalidStatusChange");
    tx.update(ref, {
      status: "cancelled",
      autoRenew: false,
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledByUid: ctx.session.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(
      ctx,
      {
        action: "membership.cancelled",
        entity: "clientMembership",
        entityId: id,
        summary: `${String(snap.get("clientName") ?? "")} · ${String(snap.get("planName") ?? "")}`,
        changes: { status: [snap.get("status") ?? null, "cancelled"] },
      },
      tx,
    );
  });
  return null;
});

/**
 * Extends a membership by one period of its plan. A lapsed membership is
 * extended from today so the member gets a full period.
 */
export const renewMembershipAction = action({ schema: idInput, permission: "manage_catalog" }, async ({ id }, ctx) => {
  const ref = orgCol(ctx.org.id, "clientMemberships").doc(id);
  const endAt = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) fail("errors.notFound");
    if (snap.get("status") === "cancelled") fail("errors.invalidStatusChange");
    const planId = String(snap.get("planId") ?? "");
    const planSnap = planId ? await tx.get(orgCol(ctx.org.id, "membershipPlans").doc(planId)) : null;
    const period: MembershipPeriod =
      (snap.get("period") as MembershipPeriod | undefined) ??
      (planSnap?.exists ? toMembershipPlan(planSnap.id, planSnap.data() ?? {}).period : "monthly");
    const currentEnd = snap.get("endAt") instanceof Timestamp ? (snap.get("endAt") as Timestamp).toDate() : null;
    const base = currentEnd && currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    const next = addPeriod(base, period);
    tx.update(ref, {
      status: "active",
      endAt: Timestamp.fromDate(next),
      renewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(
      ctx,
      {
        action: "membership.renewed",
        entity: "clientMembership",
        entityId: id,
        summary: `${String(snap.get("clientName") ?? "")} · ${String(snap.get("planName") ?? "")}`,
        changes: { endAt: [currentEnd?.toISOString() ?? null, next.toISOString()] },
      },
      tx,
    );
    return next.toISOString();
  });
  return { endAt };
});
