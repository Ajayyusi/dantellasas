import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { cache } from "react";

import { listStaff } from "@/features/staff/queries";
import { orgCol } from "@/lib/db";
import { toBranch, toMember, toRole } from "@/lib/tenancy/mappers";
import type { BranchDTO, MemberDTO, RoleDTO } from "@/lib/types";

import { toAuditEntry } from "./mappers";
import type { AuditEntryDTO, StaffOption } from "./types";

export const AUDIT_LIMIT = 500;

/** Every branch, including inactive ones (the tenancy context only has active ones). */
export const listAllBranches = cache(async (orgId: string): Promise<BranchDTO[]> => {
  const snap = await orgCol(orgId, "branches").get();
  return snap.docs
    .map((d) => toBranch(d.id, d.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
});

export const listMembers = cache(async (orgId: string): Promise<MemberDTO[]> => {
  const snap = await orgCol(orgId, "members").get();
  return snap.docs
    .map((d) => toMember(d.id, d.data()))
    .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
});

/** Roles in display order, with how many members hold each. */
export const listRoles = cache(async (orgId: string): Promise<RoleDTO[]> => {
  const [snap, members] = await Promise.all([orgCol(orgId, "roles").get(), listMembers(orgId)]);
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.roleId, (counts.get(m.roleId) ?? 0) + 1);
  return snap.docs
    .map((d) => ({ ...toRole(d.id, d.data()), memberCount: counts.get(d.id) ?? 0 }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
});

export const listStaffOptions = cache(async (orgId: string): Promise<StaffOption[]> => {
  const staff = await listStaff(orgId);
  return staff
    .filter((s) => s.status !== "archived")
    .map((s) => ({ id: s.id, displayName: s.displayName, color: s.color, photoUrl: s.photoUrl, memberUid: s.memberUid }));
});

/**
 * Newest audit entries, optionally within [from, to). A range and orderBy on
 * the same field (`at`) need only the automatic single-field index.
 */
export async function listAuditLogs(
  orgId: string,
  range: { from: Date | null; to: Date | null },
): Promise<AuditEntryDTO[]> {
  let q = orgCol(orgId, "auditLogs").orderBy("at", "desc");
  if (range.from) q = q.where("at", ">=", Timestamp.fromDate(range.from));
  if (range.to) q = q.where("at", "<", Timestamp.fromDate(range.to));
  const snap = await q.limit(AUDIT_LIMIT).get();
  return snap.docs.map((d) => toAuditEntry(d.id, d.data()));
}
