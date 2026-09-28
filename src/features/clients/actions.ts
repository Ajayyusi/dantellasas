"use server";

import { z } from "zod";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";
import { searchTermToken } from "@/lib/search";
import { actorName, can } from "@/lib/tenancy/context";

import { toClient } from "./mappers";
import { addClientTagsInput, clientInput, clientNoteInput, clientNoteRefInput, quickClientInput } from "./schema";
import { assertUniquePhone, canDeleteNote, derivedClientFields, EMPTY_STATS, serverTime, splitName } from "./service";

/** Client lookup used by booking, checkout and pickers (name, phone or email). */
export const searchClientsAction = action(
  { schema: z.object({ term: z.string().trim().min(1).max(60), limit: z.number().int().min(1).max(25).default(8) }), permission: "view_customers", revalidate: false },
  async ({ term, limit }, ctx) => {
    const snap = await orgCol(ctx.org.id, "clients")
      .where("searchTokens", "array-contains", searchTermToken(term))
      .limit(limit + 5)
      .get();
    return snap.docs
      .map((d) => toClient(d.id, d.data()))
      .filter((c) => c.status === "active")
      .slice(0, limit);
  },
);

export const getClientAction = action(
  { schema: z.object({ id: z.string().min(1) }), permission: "view_customers", revalidate: false },
  async ({ id }, ctx) => {
    const snap = await orgCol(ctx.org.id, "clients").doc(id).get();
    if (!snap.exists) fail("errors.notFound");
    return toClient(snap.id, snap.data() ?? {});
  },
);

export const quickCreateClientAction = action(
  { schema: quickClientInput, permission: "create_customers" },
  async (input, ctx) => {
    const { firstName, lastName } = splitName(input.fullName);
    const derived = derivedClientFields({ firstName, lastName, phone: input.phone, email: input.email }, ctx.settings.locale.phoneCountryCode);
    await assertUniquePhone(ctx.org.id, derived.phoneNormalized);
    const ref = orgCol(ctx.org.id, "clients").doc();
    const data = {
      firstName,
      lastName,
      phone: input.phone,
      email: input.email,
      birthday: null,
      gender: "",
      nationality: "",
      source: "",
      tags: [],
      notes: "",
      preferredStaffId: null,
      marketingConsent: false,
      status: "active",
      ...derived,
      stats: EMPTY_STATS,
      createdAt: serverTime(),
      updatedAt: serverTime(),
    };
    const batch = db().batch();
    batch.set(ref, data);
    audit(ctx, { action: "client.created", entity: "client", entityId: ref.id, summary: derived.fullName }, batch);
    await batch.commit();
    return toClient(ref.id, { ...data, createdAt: new Date() });
  },
);

const AUDITED = ["firstName", "lastName", "phone", "email", "birthday", "gender", "nationality", "source", "tags", "notes", "preferredStaffId", "marketingConsent"];

/** Create needs `create_customers`; update needs `edit_customers` (checked in the handler). */
export const saveClientAction = action(
  { schema: clientInput, permission: "view_customers" },
  async (input, ctx) => {
    if (!can(ctx, input.id ? "edit_customers" : "create_customers")) fail("errors.forbidden");
    const derived = derivedClientFields(input, ctx.settings.locale.phoneCountryCode);
    const fields = {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
      birthday: input.birthday,
      gender: input.gender,
      nationality: input.nationality,
      source: input.source,
      tags: [...new Set(input.tags)],
      notes: input.notes,
      preferredStaffId: input.preferredStaffId,
      marketingConsent: input.marketingConsent,
      ...derived,
      updatedAt: serverTime(),
    };
    const col = orgCol(ctx.org.id, "clients");
    if (input.id) {
      const ref = col.doc(input.id);
      const before = await ref.get();
      if (!before.exists) fail("errors.notFound");
      await assertUniquePhone(ctx.org.id, derived.phoneNormalized, input.id);
      const batch = db().batch();
      batch.update(ref, fields);
      audit(ctx, { action: "client.updated", entity: "client", entityId: ref.id, summary: derived.fullName, changes: diff(before.data() ?? {}, fields, AUDITED) }, batch);
      await batch.commit();
      return { id: ref.id };
    }
    await assertUniquePhone(ctx.org.id, derived.phoneNormalized);
    const ref = col.doc();
    const batch = db().batch();
    batch.set(ref, { ...fields, status: "active", stats: EMPTY_STATS, createdAt: serverTime() });
    audit(ctx, { action: "client.created", entity: "client", entityId: ref.id, summary: derived.fullName }, batch);
    await batch.commit();
    return { id: ref.id };
  },
);

export const setClientStatusAction = action(
  { schema: z.object({ ids: z.array(z.string()).min(1).max(200), status: z.enum(["active", "archived"]) }), permission: "edit_customers" },
  async ({ ids, status }, ctx) => {
    const unique = [...new Set(ids)];
    const refs = unique.map((id) => orgCol(ctx.org.id, "clients").doc(id));
    const snaps = await db().getAll(...refs);
    const existing = snaps.filter((s) => s.exists);
    if (existing.length === 0) fail("errors.notFound");
    if (status === "active") {
      // Restoring must not create a second active client with the same phone.
      for (const snap of existing) {
        await assertUniquePhone(ctx.org.id, String(snap.get("phoneNormalized") ?? ""), snap.id);
      }
    }
    const batch = db().batch();
    for (const snap of existing) {
      if (snap.get("status") === status) continue;
      batch.update(snap.ref, { status, updatedAt: serverTime() });
      audit(
        ctx,
        {
          action: status === "archived" ? "client.archived" : "client.restored",
          entity: "client",
          entityId: snap.id,
          summary: String(snap.get("fullName") ?? snap.id),
        },
        batch,
      );
    }
    await batch.commit();
    return null;
  },
);

/** Bulk "add tag" from the directory: merges tags into each selected client. */
export const addClientTagsAction = action(
  { schema: addClientTagsInput, permission: "edit_customers" },
  async ({ ids, tags }, ctx) => {
    const unique = [...new Set(ids)];
    const cleanTags = [...new Set(tags)];
    const snaps = await db().getAll(...unique.map((id) => orgCol(ctx.org.id, "clients").doc(id)));
    const batch = db().batch();
    let changed = 0;
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const before = toClient(snap.id, snap.data() ?? {}).tags;
      const after = [...new Set([...before, ...cleanTags])].slice(0, 20);
      if (after.length === before.length) continue;
      changed++;
      batch.update(snap.ref, { tags: after, updatedAt: serverTime() });
      audit(
        ctx,
        {
          action: "client.updated",
          entity: "client",
          entityId: snap.id,
          summary: String(snap.get("fullName") ?? snap.id),
          changes: { tags: [before, after] },
        },
        batch,
      );
    }
    if (changed > 0) await batch.commit();
    return { changed };
  },
);

// ── Notes (subcollection clients/{id}/notes) ──────────────────────────

async function clientForNote(orgId: string, clientId: string) {
  const ref = orgCol(orgId, "clients").doc(clientId);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  return { ref, name: String(snap.get("fullName") ?? clientId) };
}

export const addClientNoteAction = action(
  { schema: clientNoteInput, permission: "edit_customers" },
  async ({ clientId, body, pinned }, ctx) => {
    const client = await clientForNote(ctx.org.id, clientId);
    const noteRef = client.ref.collection("notes").doc();
    const batch = db().batch();
    batch.set(noteRef, {
      body,
      pinned,
      authorUid: ctx.session.uid,
      authorName: actorName(ctx),
      createdAt: serverTime(),
    });
    batch.update(client.ref, { updatedAt: serverTime() });
    audit(ctx, { action: "client.note_added", entity: "client", entityId: clientId, summary: `${client.name}: ${body.slice(0, 120)}` }, batch);
    await batch.commit();
    return { id: noteRef.id };
  },
);

export const setClientNotePinnedAction = action(
  { schema: clientNoteRefInput.extend({ pinned: z.boolean() }), permission: "edit_customers" },
  async ({ clientId, noteId, pinned }, ctx) => {
    const client = await clientForNote(ctx.org.id, clientId);
    const noteRef = client.ref.collection("notes").doc(noteId);
    const note = await noteRef.get();
    if (!note.exists) fail("errors.notFound");
    const batch = db().batch();
    batch.update(noteRef, { pinned });
    audit(
      ctx,
      {
        action: pinned ? "client.note_pinned" : "client.note_unpinned",
        entity: "client",
        entityId: clientId,
        summary: `${client.name}: ${String(note.get("body") ?? "").slice(0, 120)}`,
      },
      batch,
    );
    await batch.commit();
    return null;
  },
);

export const deleteClientNoteAction = action(
  { schema: clientNoteRefInput, permission: "edit_customers" },
  async ({ clientId, noteId }, ctx) => {
    const client = await clientForNote(ctx.org.id, clientId);
    const noteRef = client.ref.collection("notes").doc(noteId);
    const note = await noteRef.get();
    if (!note.exists) fail("errors.notFound");
    if (!canDeleteNote(ctx, String(note.get("authorUid") ?? ""))) fail("errors.forbidden");
    const batch = db().batch();
    batch.delete(noteRef);
    audit(
      ctx,
      { action: "client.note_deleted", entity: "client", entityId: clientId, summary: `${client.name}: ${String(note.get("body") ?? "").slice(0, 120)}` },
      batch,
    );
    await batch.commit();
    return null;
  },
);
