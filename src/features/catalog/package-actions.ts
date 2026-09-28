"use server";

import { FieldValue } from "firebase-admin/firestore";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";

import { activeInput, idInput, packageInput } from "./schema";
import { resolveServiceItems } from "./service";

const AUDITED = ["name", "nameAr", "kind", "priceMinor", "validityDays", "items", "creditMinor", "active"];

export const savePackageAction = action({ schema: packageInput, permission: "manage_catalog" }, async (input, ctx) => {
  const items = input.kind === "services" ? await resolveServiceItems(ctx.org.id, input.items, "items") : [];
  const data = {
    name: input.name,
    nameAr: input.nameAr,
    description: input.description,
    kind: input.kind,
    priceMinor: input.priceMinor,
    validityDays: input.validityDays,
    items,
    creditMinor: input.kind === "credit" ? input.creditMinor : 0,
    active: input.active,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const col = orgCol(ctx.org.id, "packages");
  if (input.id) {
    const ref = col.doc(input.id);
    const before = await ref.get();
    if (!before.exists) fail("errors.notFound");
    const batch = db().batch();
    batch.update(ref, data);
    audit(
      ctx,
      {
        action: "package.updated",
        entity: "package",
        entityId: ref.id,
        summary: input.name,
        changes: diff(before.data() ?? {}, data, AUDITED),
      },
      batch,
    );
    await batch.commit();
    return { id: ref.id };
  }
  const last = await col.orderBy("sortOrder", "desc").limit(1).get();
  const sortOrder = (last.docs[0]?.get("sortOrder") ?? -1) + 1;
  const ref = col.doc();
  const batch = db().batch();
  batch.set(ref, { ...data, sortOrder, createdAt: FieldValue.serverTimestamp() });
  audit(ctx, { action: "package.created", entity: "package", entityId: ref.id, summary: input.name }, batch);
  await batch.commit();
  return { id: ref.id };
});

export const setPackageActiveAction = action(
  { schema: activeInput, permission: "manage_catalog" },
  async ({ id, active }, ctx) => {
    const ref = orgCol(ctx.org.id, "packages").doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    const batch = db().batch();
    batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
    audit(
      ctx,
      {
        action: active ? "package.activated" : "package.deactivated",
        entity: "package",
        entityId: id,
        summary: String(snap.get("name") ?? ""),
      },
      batch,
    );
    await batch.commit();
    return null;
  },
);

/** Deletes a package definition that was never sold; sold ones can only be deactivated. */
export const deletePackageAction = action({ schema: idInput, permission: "manage_catalog" }, async ({ id }, ctx) => {
  const ref = orgCol(ctx.org.id, "packages").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  const sold = await orgCol(ctx.org.id, "clientPackages").where("packageId", "==", id).limit(1).get();
  if (!sold.empty) fail("errors.cannotDeleteInUse");
  const batch = db().batch();
  batch.delete(ref);
  audit(ctx, { action: "package.deleted", entity: "package", entityId: id, summary: String(snap.get("name") ?? "") }, batch);
  await batch.commit();
  return null;
});
