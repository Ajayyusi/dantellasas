import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import type { Session } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

import { paths } from "./paths";
import type { Branch, Membership, OrgRole, UserOrgRef } from "./types";

export const createOrganizationInput = z.object({
  name: z.string().trim().min(2).max(120),
  defaultTimezone: z.string().min(1).default("Asia/Dubai"),
  defaultCurrency: z.string().length(3).default("AED"),
  defaultLocale: z.enum(["ar", "en"]).default("ar"),
  firstBranchName: z.string().trim().min(1).max(120).default("Main branch"),
});
export type CreateOrganizationInput = z.input<typeof createOrganizationInput>;

function slugify(name: string) {
  const base = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "org";
}

/**
 * Atomically creates: organization, owner membership, first branch,
 * user→org index entry, and an audit entry.
 */
export async function createOrganization(session: Session, raw: CreateOrganizationInput) {
  const input = createOrganizationInput.parse(raw);
  const db = getAdminDb();
  const orgRef = db.collection(paths.orgs()).doc();
  const branchRef = db.collection(paths.branches(orgRef.id)).doc();
  const now = FieldValue.serverTimestamp();
  const role: OrgRole = "owner";

  const batch = db.batch();
  batch.set(orgRef, {
    name: input.name,
    slug: `${slugify(input.name)}-${orgRef.id.slice(0, 6).toLowerCase()}`,
    ownerUid: session.uid,
    defaultTimezone: input.defaultTimezone,
    defaultCurrency: input.defaultCurrency,
    defaultLocale: input.defaultLocale,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  batch.set(db.doc(paths.member(orgRef.id, session.uid)), {
    uid: session.uid,
    orgId: orgRef.id,
    role,
    branchIds: [],
    status: "active",
    email: session.email,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(branchRef, {
    orgId: orgRef.id,
    name: input.firstBranchName,
    timezone: input.defaultTimezone,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(db.doc(paths.userOrg(session.uid, orgRef.id)), {
    orgId: orgRef.id,
    orgName: input.name,
    role,
    createdAt: now,
  });
  batch.set(
    db.doc(paths.user(session.uid)),
    { uid: session.uid, email: session.email, lastActiveOrgId: orgRef.id, updatedAt: now },
    { merge: true },
  );
  batch.set(db.collection(paths.auditLog(orgRef.id)).doc(), {
    action: "org.created",
    actorUid: session.uid,
    at: now,
  });
  await batch.commit();

  return { orgId: orgRef.id, branchId: branchRef.id };
}

export async function listUserOrgs(uid: string): Promise<UserOrgRef[]> {
  const snap = await getAdminDb().collection(paths.userOrgs(uid)).orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => d.data() as UserOrgRef);
}

export async function listAccessibleBranches(orgId: string, membership: Membership): Promise<Branch[]> {
  const snap = await getAdminDb().collection(paths.branches(orgId)).where("active", "==", true).get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Branch);
  const orgWide =
    membership.role === "owner" || membership.role === "admin" || membership.branchIds.length === 0;
  return orgWide ? all : all.filter((b) => membership.branchIds.includes(b.id));
}
