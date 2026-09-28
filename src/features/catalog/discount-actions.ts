"use server";

import { FieldValue } from "firebase-admin/firestore";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";

import { activeInput, discountInput, idInput } from "./schema";

const AUDITED = ["name", "code", "kind", "valueBps", "valueMinor", "appliesTo", "startsAt", "endsAt", "maxUses", "active"];

export const saveDiscountAction = action({ schema: discountInput, permission: "manage_catalog" }, async (input, ctx) => {
  const data = {
    name: input.name,
    code: input.code,
    kind: input.kind,
    valueBps: input.kind === "percent" ? input.valueBps : 0,
    valueMinor: input.kind === "fixed" ? input.valueMinor : 0,
    appliesTo: input.appliesTo,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    maxUses: input.maxUses,
    active: input.active,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const col = orgCol(ctx.org.id, "discounts");
  const ref = input.id ? col.doc(input.id) : col.doc();
  await db().runTransaction(async (tx) => {
    const before = input.id ? await tx.get(ref) : null;
    if (before && !before.exists) fail("errors.notFound");
    if (input.code) {
      const clash = await tx.get(col.where("code", "==", input.code).limit(2));
      if (clash.docs.some((d) => d.id !== ref.id)) fail("errors.duplicateCode", { code: "errors.duplicateCode" });
    }
    if (before) {
      tx.update(ref, data);
      audit(
        ctx,
        {
          action: "discount.updated",
          entity: "discount",
          entityId: ref.id,
          summary: input.code ? `${input.name} (${input.code})` : input.name,
          changes: diff(before.data() ?? {}, data, AUDITED),
        },
        tx,
      );
    } else {
      tx.set(ref, { ...data, usedCount: 0, createdAt: FieldValue.serverTimestamp() });
      audit(
        ctx,
        {
          action: "discount.created",
          entity: "discount",
          entityId: ref.id,
          summary: input.code ? `${input.name} (${input.code})` : input.name,
        },
        tx,
      );
    }
  });
  return { id: ref.id };
});

export const setDiscountActiveAction = action(
  { schema: activeInput, permission: "manage_catalog" },
  async ({ id, active }, ctx) => {
    const ref = orgCol(ctx.org.id, "discounts").doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    const batch = db().batch();
    batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
    audit(
      ctx,
      {
        action: active ? "discount.activated" : "discount.deactivated",
        entity: "discount",
        entityId: id,
        summary: String(snap.get("name") ?? ""),
      },
      batch,
    );
    await batch.commit();
    return null;
  },
);

/** Unused discounts can be deleted; used ones are deactivated to keep invoice history readable. */
export const deleteDiscountAction = action({ schema: idInput, permission: "manage_catalog" }, async ({ id }, ctx) => {
  const ref = orgCol(ctx.org.id, "discounts").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  if (Number(snap.get("usedCount") ?? 0) > 0) fail("errors.cannotDeleteInUse");
  const batch = db().batch();
  batch.delete(ref);
  audit(ctx, { action: "discount.deleted", entity: "discount", entityId: id, summary: String(snap.get("name") ?? "") }, batch);
  await batch.commit();
  return null;
});
