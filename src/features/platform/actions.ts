"use server";

import { FieldValue, type WriteBatch } from "firebase-admin/firestore";

import { provisionOrganization } from "@/features/org/provision";
import type { SetupLinkResult } from "@/features/settings/member-actions";
import { fail } from "@/lib/actions";
import { findOrCreateAuthUser, passwordSetupLink } from "@/lib/auth/accounts";
import { db, orgCol, orgRef } from "@/lib/db";
import { getServerEnv } from "@/lib/env.server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { platformAction, type PlatformAdmin } from "@/lib/platform/guard";

import { createSalonInput, salonIdInput, salonStatusInput } from "./schema";

/** How platform changes appear in a salon's own audit log (no admin email is exposed). */
const PLATFORM_ACTOR = "Dantella team";

function platformAudit(
  writer: WriteBatch,
  orgId: string,
  admin: PlatformAdmin,
  entry: { action: string; summary: string },
) {
  writer.set(orgCol(orgId, "auditLogs").doc(), {
    action: entry.action,
    entity: "organization",
    entityId: orgId,
    summary: entry.summary.slice(0, 500),
    branchId: null,
    changes: null,
    actorUid: admin.uid,
    actorName: PLATFORM_ACTOR,
    at: FieldValue.serverTimestamp(),
  });
}

export type CreatedSalon = SetupLinkResult & { orgId: string; name: string };

/** Creates a business with its first branch and an owner login, and returns the owner's setup link. */
export const createSalonAction = platformAction({ schema: createSalonInput }, async (input, admin): Promise<CreatedSalon> => {
  const { uid, created } = await findOrCreateAuthUser(input.ownerEmail, input.ownerName);
  const { orgId, branchId } = await provisionOrganization({
    ownerUid: uid,
    ownerEmail: input.ownerEmail,
    ownerName: input.ownerName,
    businessName: input.businessName,
    branchName: input.branchName,
    phone: input.phone,
    defaultLocale: input.defaultLocale,
    actor: { uid: admin.uid, name: PLATFORM_ACTOR },
  });
  if (input.demoData && getServerEnv().ALLOW_DEMO_DATA) {
    const { seedDemoData } = await import("@/features/demo/seed-demo");
    await seedDemoData({ orgId, branchId, actorUid: uid, actorName: input.ownerName });
  }
  const link = await passwordSetupLink(input.ownerEmail);
  return { orgId, name: input.businessName, uid, email: input.ownerEmail, displayName: input.ownerName, created, link };
});

/** Suspends or reactivates a business. Its members are refused on their next request. */
export const setSalonStatusAction = platformAction({ schema: salonStatusInput }, async ({ orgId, status }, admin) => {
  const ref = orgRef(orgId);
  const snap = await ref.get();
  if (!snap.exists) fail("platform.errors.notFound");
  const current = snap.get("status") === "active" ? "active" : "suspended";
  if (current === status) return null;
  const batch = db().batch();
  batch.update(ref, { status, updatedAt: FieldValue.serverTimestamp() });
  platformAudit(batch, orgId, admin, {
    action: status === "suspended" ? "organization.suspended" : "organization.reactivated",
    summary: `${String(snap.get("name") ?? orgId)} ${status === "suspended" ? "suspended" : "reactivated"} by the Dantella team`,
  });
  await batch.commit();
  return null;
});

/**
 * A fresh password-setup link for a salon's owner, only while they have never
 * used their login (e.g. the first link was lost). Owners who already use it
 * reset it themselves, so the admin can't take over a working account.
 */
export const ownerSetupLinkAction = platformAction({ schema: salonIdInput, revalidate: false }, async ({ orgId }): Promise<SetupLinkResult> => {
  const snap = await orgRef(orgId).get();
  if (!snap.exists) fail("platform.errors.notFound");
  const ownerUid = String(snap.get("ownerUid") ?? "");
  if (!ownerUid) fail("platform.errors.noOwner");
  const user = await getAdminAuth()
    .getUser(ownerUid)
    .catch(() => null);
  const email = user?.email;
  if (!user || !email) fail("platform.errors.noOwner");
  // lastRefreshTime is set once the account is really used; a sign-in other than the
  // account's own creation counts too (the Auth emulator stamps one at creation).
  const m = user.metadata;
  if (m.lastRefreshTime || (m.lastSignInTime && m.lastSignInTime !== m.creationTime)) fail("platform.errors.ownerActive");
  const link = await passwordSetupLink(email);
  return { uid: user.uid, email, displayName: user.displayName ?? "", created: true, link };
});
