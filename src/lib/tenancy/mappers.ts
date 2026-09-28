import "server-only";

import { arr, bool, iso, num, str, strOrNull, type Data } from "@/lib/db";
import type { RoleKey } from "@/lib/permissions";
import { resolveSettings } from "@/lib/settings";
import type { BranchDTO, MemberDTO, OrganizationDTO, RoleDTO } from "@/lib/types";

export function toOrganization(id: string, d: Data): OrganizationDTO {
  const sub = (d.subscription ?? {}) as Data;
  return {
    id,
    name: str(d.name),
    slug: str(d.slug),
    status: d.status === "suspended" ? "suspended" : "active",
    settings: resolveSettings(d.settings),
    subscription: {
      plan: (sub.plan as OrganizationDTO["subscription"]["plan"]) ?? "trial",
      status: (sub.status as OrganizationDTO["subscription"]["status"]) ?? "trialing",
      trialEndsAt: iso(sub.trialEndsAt),
    },
  };
}

export function toBranch(id: string, d: Data): BranchDTO {
  return {
    id,
    name: str(d.name),
    code: str(d.code),
    phone: str(d.phone),
    email: str(d.email),
    address: str(d.address),
    timezone: str(d.timezone, "Asia/Dubai"),
    active: bool(d.active, true),
    sortOrder: num(d.sortOrder),
    workingHours: (d.workingHours ?? {}) as BranchDTO["workingHours"],
  };
}

export function toMember(uid: string, d: Data, roleName = ""): MemberDTO {
  return {
    uid,
    email: str(d.email),
    displayName: str(d.displayName),
    roleId: str(d.roleId),
    roleKey: (str(d.roleKey, "custom") as RoleKey) ?? "custom",
    roleName: roleName || str(d.roleName),
    permissions: arr<string>(d.permissions),
    allBranches: bool(d.allBranches, true),
    branchIds: arr<string>(d.branchIds),
    staffId: strOrNull(d.staffId),
    status: (d.status as MemberDTO["status"]) ?? "active",
    createdAt: iso(d.createdAt),
  };
}

export function toRole(id: string, d: Data): RoleDTO {
  return {
    id,
    key: (str(d.key, "custom") as RoleKey) ?? "custom",
    name: str(d.name),
    nameAr: str(d.nameAr),
    description: str(d.description),
    permissions: arr<string>(d.permissions),
    system: bool(d.system),
    locked: bool(d.locked),
    sortOrder: num(d.sortOrder),
  };
}
