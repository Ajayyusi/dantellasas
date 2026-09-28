"use server";

import { z } from "zod";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";
import { searchTermToken } from "@/lib/search";

import { toClient } from "./mappers";
import { clientInput, quickClientInput } from "./schema";
import { assertUniquePhone, derivedClientFields, EMPTY_STATS, serverTime, splitName } from "./service";

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

export const saveClientAction = action(
  { schema: clientInput, permission: "create_customers" },
  async (input, ctx) => {
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
      if (!ctx.permissions.includes("edit_customers")) fail("errors.forbidden");
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
    const batch = db().batch();
    for (const id of ids) {
      const ref = orgCol(ctx.org.id, "clients").doc(id);
      batch.update(ref, { status, updatedAt: serverTime() });
      audit(ctx, { action: status === "archived" ? "client.archived" : "client.restored", entity: "client", entityId: id, summary: id }, batch);
    }
    await batch.commit();
    return null;
  },
);
