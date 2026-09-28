"use server";

import { FieldValue, type WriteBatch } from "firebase-admin/firestore";

import { action, fail } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";
import type { AppContext } from "@/lib/tenancy/context";
import { toRole } from "@/lib/tenancy/mappers";

import { createRoleInput, idInput, saveRoleInput } from "./schema";
import { loadRole, normalizePermissions } from "./service";

/** Firestore batches hold 500 writes; leave room for the role and audit writes. */
const BATCH_SIZE = 450;

async function assertUniqueName(ctx: AppContext, name: string, exceptId?: string) {
  const snap = await orgCol(ctx.org.id, "roles").get();
  const taken = snap.docs.some(
    (d) => d.id !== exceptId && String(d.get("name") ?? "").trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (taken) fail("errors.validation", { name: "settings.errors.duplicateName" });
  return snap;
}

export const createRoleAction = action(
  { schema: createRoleInput, permission: "manage_users" },
  async (input, ctx) => {
    const source = await loadRole(ctx, input.cloneFromId);
    const roles = await assertUniqueName(ctx, input.name);
    const sortOrder = Math.max(0, ...roles.docs.map((d) => Number(d.get("sortOrder")) || 0)) + 1;
    const ref = orgCol(ctx.org.id, "roles").doc();
    const now = FieldValue.serverTimestamp();
    const batch = db().batch();
    batch.set(ref, {
      key: "custom",
      name: input.name,
      nameAr: input.nameAr,
      description: "",
      permissions: normalizePermissions(source.permissions),
      system: false,
      locked: false,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    });
    audit(
      ctx,
      { action: "role.created", entity: "role", entityId: ref.id, summary: `${input.name} (from ${source.name})` },
      batch,
    );
    await batch.commit();
    return { id: ref.id };
  },
);

/**
 * Saves a role's name and permissions, and rewrites the denormalised
 * `permissions`/`roleName` on every member holding it (rules and the server
 * read them from the member document). Writes go out in batch chunks; the
 * first chunk carries the role itself and the audit entries.
 */
export const saveRoleAction = action(
  { schema: saveRoleInput, permission: "manage_users" },
  async (input, ctx) => {
    const ref = orgCol(ctx.org.id, "roles").doc(input.id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    const before = toRole(snap.id, snap.data() ?? {});
    if (before.locked || before.key === "owner") fail("errors.cannotEditOwnerRole");
    await assertUniqueName(ctx, input.name, input.id);

    const permissions = normalizePermissions(input.permissions);
    const added = permissions.filter((p) => !before.permissions.includes(p));
    const removed = before.permissions.filter((p) => !permissions.includes(p));
    const renamed = before.name !== input.name || before.nameAr !== input.nameAr || before.description !== input.description;
    if (!added.length && !removed.length && !renamed) return { members: 0 };

    const now = FieldValue.serverTimestamp();
    const members = await orgCol(ctx.org.id, "members").where("roleId", "==", input.id).get();

    const batches: WriteBatch[] = [db().batch()];
    let used = 0;
    const next = () => {
      if (used >= BATCH_SIZE) {
        batches.push(db().batch());
        used = 0;
      }
      used++;
      return batches[batches.length - 1]!;
    };

    next().update(ref, {
      name: input.name,
      nameAr: input.nameAr,
      description: input.description,
      permissions,
      updatedAt: now,
    });
    if (added.length || removed.length) {
      const parts = [...added.map((p) => `+${p}`), ...removed.map((p) => `−${p}`)];
      audit(
        ctx,
        {
          action: "permission.changed",
          entity: "role",
          entityId: input.id,
          summary: `${input.name}: ${parts.join(", ")} (${members.size} ${members.size === 1 ? "user" : "users"})`,
          changes: { added: [[], added], removed: [[], removed] },
        },
        next(),
      );
    }
    if (renamed) {
      audit(
        ctx,
        {
          action: "role.updated",
          entity: "role",
          entityId: input.id,
          summary: input.name,
          changes: { name: [before.name, input.name], nameAr: [before.nameAr, input.nameAr] },
        },
        next(),
      );
    }
    members.docs.forEach((m) => next().update(m.ref, { permissions, roleName: input.name, updatedAt: now }));
    for (const b of batches) await b.commit();
    return { members: members.size };
  },
);

export const deleteRoleAction = action(
  { schema: idInput, permission: "manage_users" },
  async ({ id }, ctx) => {
    const ref = orgCol(ctx.org.id, "roles").doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    const role = toRole(snap.id, snap.data() ?? {});
    if (role.system || role.locked) fail("settings.errors.systemRole");
    const inUse = await orgCol(ctx.org.id, "members").where("roleId", "==", id).limit(1).get();
    if (!inUse.empty) fail("settings.errors.roleInUse");
    const batch = db().batch();
    batch.delete(ref);
    audit(ctx, { action: "role.deleted", entity: "role", entityId: id, summary: role.name }, batch);
    await batch.commit();
    return null;
  },
);
