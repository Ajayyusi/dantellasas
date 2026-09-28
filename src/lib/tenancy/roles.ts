import type { Membership, OrgRole } from "./types";

/**
 * Generic platform RBAC. Only tenancy-administration permissions are defined.
 * Feature permissions (appointments, POS, CRM, reports…) will be added once
 * the product scope is verified — do not guess them here.
 */
const ROLE_RANK: Record<OrgRole, number> = {
  staff: 10,
  manager: 20,
  admin: 30,
  owner: 40,
};

export function roleAtLeast(role: OrgRole, min: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export const PERMISSIONS = {
  "org.read": "staff",
  "org.update": "admin",
  "org.delete": "owner",
  "members.read": "manager",
  "members.manage": "admin",
  "branches.read": "staff",
  "branches.manage": "admin",
  "auditLog.read": "admin",
} as const satisfies Record<string, OrgRole>;

export type Permission = keyof typeof PERMISSIONS;

export function can(member: Pick<Membership, "role" | "status">, permission: Permission): boolean {
  return member.status === "active" && roleAtLeast(member.role, PERMISSIONS[permission]);
}

/** Owners and admins are org-wide; others are limited to `branchIds` (empty = all). */
export function canAccessBranch(
  member: Pick<Membership, "role" | "status" | "branchIds">,
  branchId: string,
): boolean {
  if (member.status !== "active") return false;
  if (roleAtLeast(member.role, "admin")) return true;
  return member.branchIds.length === 0 || member.branchIds.includes(branchId);
}
