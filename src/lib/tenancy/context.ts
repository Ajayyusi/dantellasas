import "server-only";

import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";

import { getSession, type Session } from "@/lib/auth/session";
import { ALL_BRANCHES, BRANCH_COOKIE, ORG_COOKIE } from "@/lib/cookies";
import { orgCol, orgRef, userRef } from "@/lib/db";
import { hasPermission, ORG_WIDE_ROLES, type Permission } from "@/lib/permissions";
import type { OrgSettings } from "@/lib/settings";
import type { BranchDTO, MemberDTO, OrganizationDTO } from "@/lib/types";

import { toBranch, toMember, toOrganization } from "./mappers";

/**
 * The request's tenant context. Every page and Server Action that touches
 * tenant data goes through `getAppContext()` (pages) or `resolveContext()`
 * (actions) — the Admin SDK bypasses Firestore rules, so this is where
 * tenant isolation and permissions are enforced on the server.
 */
export interface AppContext {
  session: Session;
  org: OrganizationDTO;
  settings: OrgSettings;
  member: MemberDTO;
  permissions: string[];
  /** Branches this member may access (active only), in display order. */
  branches: BranchDTO[];
  /** Selected branch, or null for "all accessible branches". */
  branchId: string | null;
  /** Branch ids to query: the selected one, or every accessible one. */
  scopeBranchIds: string[];
  /** The member's linked staff record, if any. */
  staffId: string | null;
  timezone: string;
  currency: string;
}

export type ContextFailure = "unauthenticated" | "no_organization" | "suspended";

export type ContextResult =
  | { ok: true; ctx: AppContext }
  | { ok: false; reason: ContextFailure };

async function candidateOrgIds(uid: string, preferred: string | undefined): Promise<string[]> {
  const ids: string[] = [];
  if (preferred) ids.push(preferred);
  const userSnap = await userRef(uid).get();
  const last = userSnap.get("lastOrgId") as string | undefined;
  if (last && !ids.includes(last)) ids.push(last);
  const index = await userRef(uid).collection("orgs").limit(20).get();
  for (const d of index.docs) if (!ids.includes(d.id)) ids.push(d.id);
  return ids;
}

export const resolveContext = cache(async (): Promise<ContextResult> => {
  const session = await getSession();
  if (!session) return { ok: false, reason: "unauthenticated" };

  const cookieStore = await cookies();
  const orgIds = await candidateOrgIds(session.uid, cookieStore.get(ORG_COOKIE)?.value);

  let suspended = false;
  for (const orgId of orgIds) {
    const [memberSnap, orgSnap] = await Promise.all([
      orgCol(orgId, "members").doc(session.uid).get(),
      orgRef(orgId).get(),
    ]);
    if (!memberSnap.exists || !orgSnap.exists) continue;
    const member = toMember(memberSnap.id, memberSnap.data() ?? {});
    if (member.status !== "active") continue;
    const org = toOrganization(orgSnap.id, orgSnap.data() ?? {});
    if (org.status !== "active") {
      suspended = true;
      continue;
    }

    const branchSnap = await orgCol(orgId, "branches").get();
    const allBranches = branchSnap.docs
      .map((d) => toBranch(d.id, d.data()))
      .filter((b) => b.active)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const orgWide = member.allBranches || ORG_WIDE_ROLES.includes(member.roleKey);
    const branches = orgWide
      ? allBranches
      : allBranches.filter((b) => member.branchIds.includes(b.id));

    const requested = cookieStore.get(BRANCH_COOKIE)?.value;
    let branchId: string | null;
    if (requested === ALL_BRANCHES && branches.length > 1) branchId = null;
    else if (requested && branches.some((b) => b.id === requested)) branchId = requested;
    else branchId = branches[0]?.id ?? null;

    const scopeBranchIds = branchId ? [branchId] : branches.map((b) => b.id);

    return {
      ok: true,
      ctx: {
        session,
        org,
        settings: org.settings,
        member,
        permissions: member.permissions,
        branches,
        branchId,
        scopeBranchIds,
        staffId: member.staffId,
        timezone: org.settings.locale.timezone,
        currency: org.settings.locale.currency,
      },
    };
  }
  return { ok: false, reason: suspended ? "suspended" : "no_organization" };
});

/** For pages/layouts: redirects when there is no usable context. */
export async function getAppContext(): Promise<AppContext> {
  const res = await resolveContext();
  if (res.ok) return res.ctx;
  if (res.reason === "unauthenticated") redirect("/login");
  if (res.reason === "no_organization") redirect("/onboarding");
  redirect("/login?reason=suspended");
}

export function can(ctx: Pick<AppContext, "permissions">, permission: Permission | Permission[]) {
  return hasPermission(ctx.permissions, permission);
}

/** For pages: renders the 403 page when the permission is missing. */
export async function requirePagePermission(
  permission: Permission | Permission[],
): Promise<AppContext> {
  const ctx = await getAppContext();
  if (!can(ctx, permission)) forbidden();
  return ctx;
}

export function canAccessBranch(ctx: AppContext, branchId: string | null | undefined): boolean {
  if (!branchId) return false;
  return ctx.branches.some((b) => b.id === branchId);
}

/** Branch to write new branch-scoped records into. */
export function writeBranchId(ctx: AppContext, requested?: string | null): string | null {
  if (requested && canAccessBranch(ctx, requested)) return requested;
  return ctx.branchId ?? ctx.branches[0]?.id ?? null;
}

/**
 * Whether the member may see every staff member's appointments, or only lines
 * assigned to their own staff record.
 */
export function ownAppointmentsOnly(ctx: AppContext): boolean {
  return !can(ctx, "view_all_appointments");
}

export function actorName(ctx: AppContext): string {
  return ctx.member.displayName || ctx.session.name || ctx.session.email;
}
