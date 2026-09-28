"use server";

import { cookies } from "next/headers";

import { ALL_BRANCHES, BRANCH_COOKIE, ORG_COOKIE, SIDEBAR_COOKIE } from "@/lib/cookies";
import { orgCol, userRef } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

import { resolveContext } from "./context";

const YEAR = 60 * 60 * 24 * 365;

/** Switches the active branch (or "all") after checking access. */
export async function setBranchAction(branchId: string): Promise<{ ok: boolean }> {
  const res = await resolveContext();
  if (!res.ok) return { ok: false };
  const allowed =
    (branchId === ALL_BRANCHES && res.ctx.branches.length > 1) ||
    res.ctx.branches.some((b) => b.id === branchId);
  if (!allowed) return { ok: false };
  (await cookies()).set(BRANCH_COOKIE, branchId, { path: "/", sameSite: "lax", maxAge: YEAR });
  return { ok: true };
}

/** Switches the active organization for users who belong to several. */
export async function setOrganizationAction(orgId: string): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };
  const member = await orgCol(orgId, "members").doc(session.uid).get();
  if (!member.exists || member.get("status") !== "active") return { ok: false };
  const jar = await cookies();
  jar.set(ORG_COOKIE, orgId, { path: "/", sameSite: "lax", maxAge: YEAR });
  jar.delete(BRANCH_COOKIE);
  await userRef(session.uid).set({ lastOrgId: orgId }, { merge: true });
  return { ok: true };
}

export async function setSidebarCollapsedAction(collapsed: boolean): Promise<void> {
  (await cookies()).set(SIDEBAR_COOKIE, collapsed ? "1" : "0", { path: "/", sameSite: "lax", maxAge: YEAR });
}
