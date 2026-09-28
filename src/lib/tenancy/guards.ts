import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { requireSession, type Session } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

import { paths } from "./paths";
import { can, canAccessBranch, type Permission } from "./roles";
import type { Branch, Membership, Organization } from "./types";

/**
 * Server-side tenancy guards. The Admin SDK bypasses Firestore rules, so every
 * server read/write of tenant data MUST go through one of these first.
 */

export const getMembership = cache(
  async (orgId: string, uid: string): Promise<Membership | null> => {
    const snap = await getAdminDb().doc(paths.member(orgId, uid)).get();
    return snap.exists ? (snap.data() as Membership) : null;
  },
);

export interface OrgContext {
  session: Session;
  org: Organization;
  membership: Membership;
}

/** Resolves the org + caller membership, or 404s (never leaks org existence). */
export async function requireOrg(orgId: string, permission: Permission = "org.read"): Promise<OrgContext> {
  const session = await requireSession();
  const membership = await getMembership(orgId, session.uid);
  if (!membership || !can(membership, permission)) notFound();

  const orgSnap = await getAdminDb().doc(paths.org(orgId)).get();
  if (!orgSnap.exists) notFound();
  const org = { id: orgSnap.id, ...orgSnap.data() } as Organization;
  if (org.status !== "active") notFound();

  return { session, org, membership };
}

export interface BranchContext extends OrgContext {
  branch: Branch;
}

export async function requireBranch(orgId: string, branchId: string): Promise<BranchContext> {
  const ctx = await requireOrg(orgId, "branches.read");
  if (!canAccessBranch(ctx.membership, branchId)) notFound();

  const snap = await getAdminDb().doc(paths.branch(orgId, branchId)).get();
  if (!snap.exists) notFound();
  const branch = { id: snap.id, ...snap.data() } as Branch;
  if (!branch.active) notFound();

  return { ...ctx, branch };
}
