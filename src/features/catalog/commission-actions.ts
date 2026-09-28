"use server";

import { FieldValue } from "firebase-admin/firestore";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";
import { hasAnyPermission } from "@/lib/permissions";
import type { AppContext } from "@/lib/tenancy/context";

import { activeInput, commissionRuleInput, idInput } from "./schema";

const AUDITED = ["name", "itemType", "staffId", "serviceId", "rateBps", "priority", "active"];

/** Commission rules may be edited with either manage_staff or manage_catalog. */
function assertCanEdit(ctx: AppContext) {
  if (!hasAnyPermission(ctx.permissions, ["manage_staff", "manage_catalog"])) fail("errors.forbidden");
}

export const saveCommissionRuleAction = action({ schema: commissionRuleInput }, async (input, ctx) => {
  assertCanEdit(ctx);
  const serviceId = input.itemType === "product" ? null : input.serviceId;
  if (input.staffId) {
    const staff = await orgCol(ctx.org.id, "staff").doc(input.staffId).get();
    if (!staff.exists) fail("errors.validation", { staffId: "validation.invalid" });
  }
  if (serviceId) {
    const service = await orgCol(ctx.org.id, "services").doc(serviceId).get();
    if (!service.exists) fail("errors.validation", { serviceId: "validation.invalid" });
  }
  const data = {
    name: input.name,
    // A service-specific rule only ever applies to services.
    itemType: serviceId ? "service" : input.itemType,
    staffId: input.staffId,
    serviceId,
    rateBps: input.rateBps,
    priority: input.priority,
    active: input.active,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const col = orgCol(ctx.org.id, "commissionRules");
  if (input.id) {
    const ref = col.doc(input.id);
    const before = await ref.get();
    if (!before.exists) fail("errors.notFound");
    const batch = db().batch();
    batch.update(ref, data);
    audit(
      ctx,
      {
        action: "commission_rule.updated",
        entity: "commissionRule",
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
  audit(ctx, { action: "commission_rule.created", entity: "commissionRule", entityId: ref.id, summary: input.name }, batch);
  await batch.commit();
  return { id: ref.id };
});

export const deleteCommissionRuleAction = action({ schema: idInput }, async ({ id }, ctx) => {
  assertCanEdit(ctx);
  const ref = orgCol(ctx.org.id, "commissionRules").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  const batch = db().batch();
  batch.delete(ref);
  audit(
    ctx,
    { action: "commission_rule.deleted", entity: "commissionRule", entityId: id, summary: String(snap.get("name") ?? "") },
    batch,
  );
  await batch.commit();
  return null;
});

export const setCommissionRuleActiveAction = action({ schema: activeInput }, async ({ id, active }, ctx) => {
  assertCanEdit(ctx);
  const ref = orgCol(ctx.org.id, "commissionRules").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  const batch = db().batch();
  batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
  audit(
    ctx,
    {
      action: "commission_rule.updated",
      entity: "commissionRule",
      entityId: id,
      summary: String(snap.get("name") ?? ""),
      changes: { active: [snap.get("active") ?? null, active] },
    },
    batch,
  );
  await batch.commit();
  return null;
});
