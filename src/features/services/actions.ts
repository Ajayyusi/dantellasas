"use server";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";

import { toService } from "./mappers";
import { categoryInput, reorderInput, serviceInput } from "./schema";

const idInput = z.object({ id: z.string().min(1) });

export const saveCategoryAction = action(
  { schema: categoryInput, permission: "manage_services" },
  async (input, ctx) => {
    const col = orgCol(ctx.org.id, "serviceCategories");
    const data = { name: input.name, nameAr: input.nameAr, color: input.color, updatedAt: FieldValue.serverTimestamp() };
    if (input.id) {
      const ref = col.doc(input.id);
      if (!(await ref.get()).exists) fail("errors.notFound");
      const batch = db().batch();
      batch.update(ref, data);
      audit(ctx, { action: "service_category.updated", entity: "serviceCategory", entityId: ref.id, summary: input.name }, batch);
      await batch.commit();
      return { id: ref.id };
    }
    const count = (await col.count().get()).data().count;
    const ref = col.doc();
    const batch = db().batch();
    batch.set(ref, { ...data, active: true, sortOrder: count, createdAt: FieldValue.serverTimestamp() });
    audit(ctx, { action: "service_category.created", entity: "serviceCategory", entityId: ref.id, summary: input.name }, batch);
    await batch.commit();
    return { id: ref.id };
  },
);

export const deleteCategoryAction = action(
  { schema: idInput, permission: "manage_services" },
  async ({ id }, ctx) => {
    const ref = orgCol(ctx.org.id, "serviceCategories").doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    const services = await orgCol(ctx.org.id, "services").where("categoryId", "==", id).get();
    const batch = db().batch();
    services.docs.forEach((d) => batch.update(d.ref, { categoryId: "", updatedAt: FieldValue.serverTimestamp() }));
    batch.delete(ref);
    audit(ctx, { action: "service_category.deleted", entity: "serviceCategory", entityId: id, summary: String(snap.get("name")) }, batch);
    await batch.commit();
    return null;
  },
);

export const reorderCategoriesAction = action(
  { schema: reorderInput, permission: "manage_services" },
  async ({ ids }, ctx) => {
    const batch = db().batch();
    ids.forEach((id, i) => batch.update(orgCol(ctx.org.id, "serviceCategories").doc(id), { sortOrder: i }));
    await batch.commit();
    return null;
  },
);

export const reorderServicesAction = action(
  { schema: reorderInput, permission: "manage_services" },
  async ({ ids }, ctx) => {
    const batch = db().batch();
    ids.forEach((id, i) => batch.update(orgCol(ctx.org.id, "services").doc(id), { sortOrder: i }));
    await batch.commit();
    return null;
  },
);

const AUDITED = ["name", "nameAr", "categoryId", "durationMin", "priceMinor", "taxRateId", "taxExempt", "branchIds", "staffIds", "active"];

export const saveServiceAction = action(
  { schema: serviceInput, permission: "manage_services" },
  async (input, ctx) => {
    const validBranch = new Set(ctx.branches.map((b) => b.id));
    const data = {
      categoryId: input.categoryId,
      name: input.name,
      nameAr: input.nameAr,
      description: input.description,
      durationMin: input.durationMin,
      bufferMin: input.bufferMin,
      priceMinor: input.priceMinor,
      taxExempt: input.taxMode === "exempt",
      taxRateId: input.taxMode === "rate" ? input.taxRateId : null,
      branchIds: input.branchIds.filter((b) => validBranch.has(b)),
      staffIds: input.staffIds,
      onlineBookable: input.onlineBookable,
      active: input.active,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (data.taxRateId && !ctx.settings.tax.rates.some((r) => r.id === data.taxRateId)) {
      fail("errors.validation", { taxRateId: "validation.invalid" });
    }
    const col = orgCol(ctx.org.id, "services");
    if (input.id) {
      const ref = col.doc(input.id);
      const before = await ref.get();
      if (!before.exists) fail("errors.notFound");
      const batch = db().batch();
      batch.update(ref, data);
      audit(
        ctx,
        {
          action: "service.updated",
          entity: "service",
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
    audit(ctx, { action: "service.created", entity: "service", entityId: ref.id, summary: input.name }, batch);
    await batch.commit();
    return { id: ref.id };
  },
);

export const setServiceActiveAction = action(
  { schema: z.object({ id: z.string(), active: z.boolean() }), permission: "manage_services" },
  async ({ id, active }, ctx) => {
    const ref = orgCol(ctx.org.id, "services").doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    const batch = db().batch();
    batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
    audit(ctx, { action: active ? "service.activated" : "service.deactivated", entity: "service", entityId: id, summary: String(snap.get("name")) }, batch);
    await batch.commit();
    return null;
  },
);

export const duplicateServiceAction = action(
  { schema: z.object({ id: z.string(), name: z.string().trim().min(1).max(80) }), permission: "manage_services" },
  async ({ id, name }, ctx) => {
    const snap = await orgCol(ctx.org.id, "services").doc(id).get();
    if (!snap.exists) fail("errors.notFound");
    const src = toService(snap.id, snap.data() ?? {});
    const ref = orgCol(ctx.org.id, "services").doc();
    const { id: _omit, ...rest } = src;
    void _omit;
    const batch = db().batch();
    batch.set(ref, {
      ...rest,
      name,
      sortOrder: src.sortOrder + 0.5,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(ctx, { action: "service.created", entity: "service", entityId: ref.id, summary: name }, batch);
    await batch.commit();
    return { id: ref.id };
  },
);
