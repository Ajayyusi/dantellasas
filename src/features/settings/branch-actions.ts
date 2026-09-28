"use server";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";

import { branchInput, reorderInput } from "./schema";

const AUDITED = ["name", "code", "phone", "email", "address", "timezone", "workingHours"];

export const saveBranchAction = action(
  { schema: branchInput, permission: "manage_settings" },
  async (input, ctx) => {
    const col = orgCol(ctx.org.id, "branches");
    const data = {
      name: input.name,
      code: input.code || input.name.replace(/\s+/g, "").slice(0, 3).toUpperCase(),
      phone: input.phone,
      email: input.email,
      address: input.address,
      timezone: input.timezone,
      workingHours: input.workingHours,
      updatedAt: FieldValue.serverTimestamp(),
    };
    const batch = db().batch();
    if (input.id) {
      const ref = col.doc(input.id);
      const before = await ref.get();
      if (!before.exists) fail("errors.notFound");
      batch.update(ref, data);
      audit(
        ctx,
        {
          action: "branch.updated",
          entity: "branch",
          entityId: ref.id,
          branchId: ref.id,
          summary: input.name,
          changes: diff(before.data() ?? {}, data, AUDITED),
        },
        batch,
      );
      await batch.commit();
      return { id: ref.id };
    }
    const last = await col.orderBy("sortOrder", "desc").limit(1).get();
    const sortOrder = (Number(last.docs[0]?.get("sortOrder")) || 0) + (last.empty ? 0 : 1);
    const ref = col.doc();
    batch.set(ref, { ...data, active: true, sortOrder, createdAt: FieldValue.serverTimestamp() });
    audit(ctx, { action: "branch.created", entity: "branch", entityId: ref.id, branchId: ref.id, summary: input.name }, batch);
    await batch.commit();
    return { id: ref.id };
  },
);

export const setBranchActiveAction = action(
  { schema: z.object({ id: z.string().min(1), active: z.boolean() }), permission: "manage_settings" },
  async ({ id, active }, ctx) => {
    const col = orgCol(ctx.org.id, "branches");
    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    if (!active) {
      const all = await col.get();
      const othersActive = all.docs.filter((d) => d.id !== id && d.get("active") !== false).length;
      if (othersActive === 0) fail("settings.errors.lastActiveBranch");
    }
    const batch = db().batch();
    batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
    audit(
      ctx,
      {
        action: active ? "branch.activated" : "branch.deactivated",
        entity: "branch",
        entityId: id,
        branchId: id,
        summary: String(snap.get("name") ?? ""),
      },
      batch,
    );
    await batch.commit();
    return null;
  },
);

export const reorderBranchesAction = action(
  { schema: reorderInput, permission: "manage_settings" },
  async ({ ids }, ctx) => {
    const col = orgCol(ctx.org.id, "branches");
    const existing = new Set((await col.select().get()).docs.map((d) => d.id));
    const batch = db().batch();
    ids.filter((id) => existing.has(id)).forEach((id, i) => batch.update(col.doc(id), { sortOrder: i }));
    await batch.commit();
    return null;
  },
);
