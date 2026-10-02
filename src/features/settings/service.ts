import "server-only";

import { fail } from "@/lib/actions";
import { ALL_PERMISSIONS, ORG_WIDE_ROLES, type RoleKey } from "@/lib/permissions";
import { orgCol } from "@/lib/db";
import type { AppContext } from "@/lib/tenancy/context";
import { toRole } from "@/lib/tenancy/mappers";
import type { RoleDTO } from "@/lib/types";

export function isOwner(ctx: AppContext): boolean {
  return ctx.member.roleKey === "owner";
}

export async function loadRole(ctx: AppContext, roleId: string): Promise<RoleDTO> {
  const snap = await orgCol(ctx.org.id, "roles").doc(roleId).get();
  if (!snap.exists) fail("errors.validation", { roleId: "validation.invalid" });
  const role = toRole(snap.id, snap.data() ?? {});
  // The owner role always carries every permission, whatever the document says.
  if (role.key === "owner") role.permissions = [...ALL_PERMISSIONS];
  return role;
}

/** The key stored on members: the system key, or "custom". */
export function memberRoleKey(role: RoleDTO): RoleKey {
  return role.system ? role.key : "custom";
}

/** Branch access for a member with `role`; org-wide roles always get every branch. */
export async function resolveBranchAccess(
  ctx: AppContext,
  role: RoleDTO,
  input: { allBranches: boolean; branchIds: string[] },
): Promise<{ allBranches: boolean; branchIds: string[] }> {
  if (ORG_WIDE_ROLES.includes(memberRoleKey(role)) || input.allBranches) {
    return { allBranches: true, branchIds: [] };
  }
  const snap = await orgCol(ctx.org.id, "branches").get();
  const valid = new Set(snap.docs.map((d) => d.id));
  const branchIds = [...new Set(input.branchIds)].filter((id) => valid.has(id));
  if (branchIds.length === 0) fail("errors.validation", { branchIds: "settings.errors.pickBranch" });
  return { allBranches: false, branchIds };
}

/** Rejects a staff record that doesn't exist or is linked to someone else. */
export async function assertStaffLinkable(ctx: AppContext, staffId: string | null, uid: string | null) {
  if (!staffId) return;
  const snap = await orgCol(ctx.org.id, "staff").doc(staffId).get();
  if (!snap.exists) fail("errors.validation", { staffId: "validation.invalid" });
  const linked = snap.get("memberUid") as string | null | undefined;
  if (linked && linked !== uid) fail("errors.validation", { staffId: "settings.errors.staffLinked" });
}

export async function activeOwnerCount(ctx: AppContext): Promise<number> {
  const snap = await orgCol(ctx.org.id, "members").where("roleKey", "==", "owner").get();
  return snap.docs.filter((d) => (d.get("status") ?? "active") === "active").length;
}

export { passwordSetupLink } from "@/lib/auth/accounts";

/** Permissions in catalogue order, de-duplicated. */
export function normalizePermissions(list: readonly string[]): string[] {
  const set = new Set(list);
  return ALL_PERMISSIONS.filter((p) => set.has(p));
}
