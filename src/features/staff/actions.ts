"use server";

import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { z } from "zod";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { arr, db, orgCol, str } from "@/lib/db";
import { deleteTenantFile, PHOTO_TYPES, uploadTenantFile } from "@/lib/storage";
import type { AppContext } from "@/lib/tenancy/context";

import { reorderStaffInput, staffIdInput, staffInput, staffStatusInput } from "./schema";

const AUDITED = [
  "firstName",
  "lastName",
  "displayName",
  "phone",
  "email",
  "position",
  "branchIds",
  "status",
  "color",
  "hireDate",
  "bookable",
  "schedule",
  "commission",
  "hr",
];

/** A manager may edit a staff record that works in at least one of their branches. */
function assertCanEditBranches(ctx: AppContext, branchIds: string[]) {
  if (branchIds.length === 0) return;
  if (!branchIds.some((b) => ctx.branches.some((x) => x.id === b))) fail("errors.branchForbidden");
}

function cleanSchedule(schedule: z.output<typeof staffInput>["schedule"]) {
  return Object.fromEntries(
    Object.entries(schedule).map(([k, d]) => {
      const out: Record<string, unknown> = { working: d.working, start: d.start, end: d.end };
      if (d.breakStart && d.breakEnd) {
        out.breakStart = d.breakStart;
        out.breakEnd = d.breakEnd;
      }
      return [k, out];
    }),
  );
}

export const saveStaffAction = action({ schema: staffInput, permission: "manage_staff" }, async (input, ctx) => {
  const col = orgCol(ctx.org.id, "staff");
  const accessible = new Set(ctx.branches.map((b) => b.id));
  const requested = input.branchIds.filter((b) => accessible.has(b));
  if (requested.length === 0) fail("errors.validation", { branchIds: "staff.errors.branchRequired" });

  const ref = input.id ? col.doc(input.id) : col.doc();
  const beforeSnap = input.id ? await ref.get() : null;
  if (input.id && !beforeSnap?.exists) fail("errors.notFound");
  const before = beforeSnap?.data() ?? {};
  if (input.id) assertCanEditBranches(ctx, arr<string>(before.branchIds));

  // Keep branches the editor can't see (a branch manager must not drop another branch's assignment).
  const hidden = arr<string>(before.branchIds).filter((b) => !accessible.has(b));
  const displayName = input.displayName || `${input.firstName} ${input.lastName}`.trim();
  const data = {
    firstName: input.firstName,
    lastName: input.lastName,
    displayName,
    phone: input.phone,
    email: input.email.toLowerCase(),
    position: input.position,
    branchIds: [...new Set([...requested, ...hidden])],
    status: input.status,
    color: input.color,
    hireDate: input.hireDate,
    bookable: input.bookable,
    schedule: cleanSchedule(input.schedule),
    commission: input.commission,
    hr: input.hr,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // "Services performed" lives on services.staffIds ([] = everyone).
  const [servicesSnap, staffSnap] = await Promise.all([orgCol(ctx.org.id, "services").get(), col.get()]);
  const otherActive = staffSnap.docs
    .filter((d) => d.id !== ref.id && str(d.get("status"), "active") === "active")
    .map((d) => d.id);
  const wanted = new Set(input.serviceIds);
  const serviceUpdates: { ref: DocumentReference; staffIds: string[] }[] = [];
  const beforeServices: string[] = [];
  for (const s of servicesSnap.docs) {
    const staffIds = arr<string>(s.get("staffIds"));
    const current = staffIds.length === 0 || staffIds.includes(ref.id);
    if (current) beforeServices.push(s.id);
    const want = wanted.has(s.id);
    if (want && !current) serviceUpdates.push({ ref: s.ref, staffIds: [...staffIds, ref.id] });
    if (!want && current) {
      // Everyone → everyone else. With no other active staff "[]" can't express "nobody but …", so it stays as is.
      if (staffIds.length === 0) {
        if (otherActive.length > 0) serviceUpdates.push({ ref: s.ref, staffIds: otherActive });
      } else serviceUpdates.push({ ref: s.ref, staffIds: staffIds.filter((id) => id !== ref.id) });
    }
  }
  const afterServices = servicesSnap.docs
    .filter((s) => {
      const upd = serviceUpdates.find((u) => u.ref.id === s.id);
      const ids = upd ? upd.staffIds : arr<string>(s.get("staffIds"));
      return ids.length === 0 || ids.includes(ref.id);
    })
    .map((s) => s.id);

  const batch = db().batch();
  if (input.id) {
    batch.update(ref, data);
  } else {
    const last = staffSnap.docs.reduce((m, d) => Math.max(m, Number(d.get("sortOrder") ?? -1)), -1);
    batch.set(ref, { ...data, photoUrl: null, photoPath: null, memberUid: null, sortOrder: last + 1, createdAt: FieldValue.serverTimestamp() });
  }
  for (const u of serviceUpdates) batch.update(u.ref, { staffIds: u.staffIds, updatedAt: FieldValue.serverTimestamp() });

  const changes = input.id ? diff(before, data, AUDITED) : {};
  if (input.id && JSON.stringify([...beforeServices].sort()) !== JSON.stringify([...afterServices].sort())) {
    changes.services = [beforeServices, afterServices];
  }
  audit(
    ctx,
    {
      action: input.id ? "employee.updated" : "employee.created",
      entity: "employee",
      entityId: ref.id,
      summary: [displayName, input.position].filter(Boolean).join(" · "),
      changes: input.id ? changes : undefined,
    },
    batch,
  );
  await batch.commit();
  return { id: ref.id };
});

export const setStaffStatusAction = action(
  { schema: staffStatusInput, permission: "manage_staff" },
  async ({ id, status }, ctx) => {
    const ref = orgCol(ctx.org.id, "staff").doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    assertCanEditBranches(ctx, arr<string>(snap.get("branchIds")));
    const prev = str(snap.get("status"), "active");
    if (prev === status) return null;
    const verb =
      status === "archived" ? "archived" : prev === "archived" ? "restored" : status === "active" ? "activated" : "deactivated";
    const batch = db().batch();
    batch.update(ref, { status, updatedAt: FieldValue.serverTimestamp() });
    audit(
      ctx,
      {
        action: `employee.${verb}`,
        entity: "employee",
        entityId: id,
        summary: str(snap.get("displayName")),
        changes: { status: [prev, status] },
      },
      batch,
    );
    await batch.commit();
    return null;
  },
);

export const reorderStaffAction = action({ schema: reorderStaffInput, permission: "manage_staff" }, async ({ ids }, ctx) => {
  const col = orgCol(ctx.org.id, "staff");
  const snaps = await db().getAll(...ids.map((id) => col.doc(id)));
  if (snaps.some((s) => !s.exists)) fail("errors.notFound");
  const batch = db().batch();
  ids.forEach((id, i) => batch.update(col.doc(id), { sortOrder: i }));
  audit(ctx, { action: "employee.reordered", entity: "employee", entityId: ids[0] ?? "", summary: `${ids.length}` }, batch);
  await batch.commit();
  return null;
});

const photoForm = z.instanceof(FormData);

export const uploadStaffPhotoAction = action({ schema: photoForm, permission: "manage_staff" }, async (form, ctx) => {
  const staffId = form.get("staffId");
  const file = form.get("file");
  if (typeof staffId !== "string" || !staffId) fail("errors.validation");
  if (!(file instanceof File) || file.size === 0) fail("errors.validation", { file: "validation.required" });
  const ref = orgCol(ctx.org.id, "staff").doc(staffId);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  assertCanEditBranches(ctx, arr<string>(snap.get("branchIds")));
  const stored = await uploadTenantFile(ctx, "staff", file, { maxMB: 3, types: PHOTO_TYPES });
  const batch = db().batch();
  batch.update(ref, { photoUrl: stored.url, photoPath: stored.path, updatedAt: FieldValue.serverTimestamp() });
  audit(ctx, { action: "employee.photo_updated", entity: "employee", entityId: staffId, summary: str(snap.get("displayName")) }, batch);
  try {
    await batch.commit();
  } catch (err) {
    await deleteTenantFile(ctx, stored.path);
    throw err;
  }
  await deleteTenantFile(ctx, str(snap.get("photoPath")));
  return { photoUrl: stored.url };
});

export const removeStaffPhotoAction = action({ schema: staffIdInput, permission: "manage_staff" }, async ({ id }, ctx) => {
  const ref = orgCol(ctx.org.id, "staff").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  assertCanEditBranches(ctx, arr<string>(snap.get("branchIds")));
  const batch = db().batch();
  batch.update(ref, { photoUrl: null, photoPath: null, updatedAt: FieldValue.serverTimestamp() });
  audit(ctx, { action: "employee.photo_removed", entity: "employee", entityId: id, summary: str(snap.get("displayName")) }, batch);
  await batch.commit();
  await deleteTenantFile(ctx, str(snap.get("photoPath")));
  return null;
});
