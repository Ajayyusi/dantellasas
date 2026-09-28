"use server";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { seedDemoData } from "@/features/demo/seed-demo";
import { action, fail } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { db, iso, num, orgCol, orgRef, str, userRef } from "@/lib/db";
import { getServerEnv } from "@/lib/env.server";
import { DEFAULT_SETTINGS, type PaymentMethod } from "@/lib/settings";
import { deleteTenantFile, PHOTO_TYPES, uploadTenantFile } from "@/lib/storage";
import { actorName, writeBranchId } from "@/lib/tenancy/context";

import { BUILT_IN_METHOD_TYPES, updateSettingsInput } from "./schema";
import { isOwner } from "./service";

type Values = Record<string, unknown>;

/** Built-ins keep their fixed id/type and can't be removed (only disabled); custom methods are "other". */
function normalizeMethods(methods: PaymentMethod[]): PaymentMethod[] {
  const builtIns = new Set<string>(BUILT_IN_METHOD_TYPES);
  const out = methods.map((m) => {
    if (m.type !== "other" && m.id !== m.type) fail("errors.validation", { methods: "validation.invalid" });
    if (m.type === "other" && builtIns.has(m.id)) fail("errors.validation", { methods: "validation.invalid" });
    return { id: m.id, label: m.label, type: m.type, enabled: m.enabled };
  });
  for (const d of DEFAULT_SETTINGS.payments.methods) {
    if (!out.some((m) => m.id === d.id)) out.push({ ...d, enabled: false });
  }
  return out;
}

/**
 * Saves one settings section. Only the keys that changed are written, each
 * with a dot path (`settings.<section>.<key>`), so other sections — and keys
 * this form doesn't know about — are never overwritten.
 */
export const updateSettingsAction = action(
  { schema: updateSettingsInput, permission: "manage_settings" },
  async (input, ctx) => {
    const { section } = input;
    const values: Values = { ...input.values };
    if (input.section === "payments") values.methods = normalizeMethods(input.values.methods);

    const before = ctx.settings[section] as unknown as Values;
    const changed = Object.keys(values).filter(
      (k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(values[k] ?? null),
    );
    if (changed.length === 0) return { changed };

    const update: Values = { updatedAt: FieldValue.serverTimestamp() };
    for (const k of changed) update[`settings.${section}.${k}`] = values[k];

    const batch = db().batch();
    if (input.section === "business" && changed.includes("displayName")) {
      update.name = input.values.displayName;
      // Keep the "my organizations" index (org switcher) in step with the new name.
      const members = await orgCol(ctx.org.id, "members").select().get();
      members.docs.forEach((m) =>
        batch.set(userRef(m.id).collection("orgs").doc(ctx.org.id), { orgName: input.values.displayName }, { merge: true }),
      );
    }
    batch.update(orgRef(ctx.org.id), update);
    audit(
      ctx,
      {
        action: "settings.updated",
        entity: "settings",
        entityId: section,
        summary: `${section}: ${changed.join(", ")}`,
        changes: Object.fromEntries(changed.map((k) => [`${section}.${k}`, [before[k] ?? null, values[k] ?? null]])),
      },
      batch,
    );
    await batch.commit();
    return { changed };
  },
);

// ── Logo ───────────────────────────────────────────────────────────────

function currentLogoPath(settings: unknown): string {
  return str((settings as { business?: { logoPath?: unknown } }).business?.logoPath);
}

export const uploadLogoAction = action(
  { schema: z.instanceof(FormData), permission: "manage_settings" },
  async (form, ctx) => {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) fail("errors.validation", { file: "validation.required" });
    const stored = await uploadTenantFile(ctx, "branding", file, { maxMB: 2, types: PHOTO_TYPES });
    const previous = currentLogoPath(ctx.settings);
    const batch = db().batch();
    batch.update(orgRef(ctx.org.id), {
      "settings.business.logoPath": stored.path,
      "settings.business.logoUrl": stored.url,
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(
      ctx,
      { action: "settings.updated", entity: "settings", entityId: "business", summary: "business: logo" },
      batch,
    );
    await batch.commit();
    if (previous && previous !== stored.path) await deleteTenantFile(ctx, previous);
    return { url: stored.url };
  },
);

export const removeLogoAction = action(
  { schema: z.object({}), permission: "manage_settings" },
  async (_input, ctx) => {
    const previous = currentLogoPath(ctx.settings);
    const batch = db().batch();
    batch.update(orgRef(ctx.org.id), {
      "settings.business.logoPath": "",
      "settings.business.logoUrl": "",
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(
      ctx,
      { action: "settings.updated", entity: "settings", entityId: "business", summary: "business: logo removed" },
      batch,
    );
    await batch.commit();
    await deleteTenantFile(ctx, previous);
    return null;
  },
);

// ── Data ───────────────────────────────────────────────────────────────

export const loadDemoDataAction = action(
  { schema: z.object({}), permission: "manage_settings" },
  async (_input, ctx) => {
    if (!isOwner(ctx)) fail("settings.errors.ownerOnly");
    if (!getServerEnv().ALLOW_DEMO_DATA) fail("errors.demoDataDisabled");
    const branchId = writeBranchId(ctx);
    if (!branchId) fail("errors.branchRequired");
    await seedDemoData({ orgId: ctx.org.id, branchId, actorUid: ctx.session.uid, actorName: actorName(ctx) });
    await audit(ctx, {
      action: "demo.seeded",
      entity: "demo",
      entityId: branchId,
      branchId,
      summary: `Demo data loaded into ${ctx.branches.find((b) => b.id === branchId)?.name ?? branchId}`,
    });
    return null;
  },
);

export interface ClientExportRow {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  gender: string;
  birthday: string;
  source: string;
  tags: string;
  visits: number;
  totalSpendMinor: number;
  lastVisitAt: string | null;
  status: string;
  createdAt: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const exportClientsAction = action(
  { schema: z.object({}), permission: "manage_settings", revalidate: false },
  async (_input, ctx): Promise<ClientExportRow[]> => {
    const snap = await orgCol(ctx.org.id, "clients")
      .select("firstName", "lastName", "fullName", "phone", "email", "gender", "birthday", "source", "tags", "stats", "status", "createdAt")
      .get();
    const rows = snap.docs.map((d) => {
      const x = d.data();
      const b = (x.birthday ?? null) as { year?: number; month?: number; day?: number } | null;
      const stats = (x.stats ?? {}) as Record<string, unknown>;
      return {
        firstName: str(x.firstName) || str(x.fullName),
        lastName: str(x.lastName),
        phone: str(x.phone),
        email: str(x.email),
        gender: str(x.gender),
        birthday: b?.month && b?.day ? `${b.year ? `${b.year}-` : ""}${pad(b.month)}-${pad(b.day)}` : "",
        source: str(x.source),
        tags: Array.isArray(x.tags) ? (x.tags as unknown[]).map(String).join("; ") : "",
        visits: num(stats.visits),
        totalSpendMinor: num(stats.totalSpendMinor),
        lastVisitAt: iso(stats.lastVisitAt),
        status: str(x.status, "active"),
        createdAt: iso(x.createdAt),
      };
    });
    rows.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    await audit(ctx, { action: "clients.exported", entity: "clients", entityId: "all", summary: `${rows.length} clients exported` });
    return rows;
  },
);
