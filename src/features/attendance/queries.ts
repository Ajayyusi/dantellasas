import "server-only";

import { chunk, orgCol } from "@/lib/db";
import type { AttendanceDTO, LeaveDTO } from "@/lib/types";

import { toAttendance, toLeave } from "./mappers";

const byDateThenIn = (a: AttendanceDTO, b: AttendanceDTO) =>
  b.dateKey.localeCompare(a.dateKey) || (b.clockInAt ?? "").localeCompare(a.clockInAt ?? "");

/**
 * Attendance records for branches in a dateKey range.
 * Index: attendance (branchId asc, dateKey asc) — `in` on branchId + range on dateKey.
 */
export async function attendanceForBranches(
  orgId: string,
  branchIds: string[],
  range: { from: string; to: string },
): Promise<AttendanceDTO[]> {
  if (branchIds.length === 0) return [];
  const snaps = await Promise.all(
    chunk(branchIds).map((ids) =>
      orgCol(orgId, "attendance")
        .where("branchId", "in", ids)
        .where("dateKey", ">=", range.from)
        .where("dateKey", "<=", range.to)
        .get(),
    ),
  );
  return snaps.flatMap((s) => s.docs.map((d) => toAttendance(d.id, d.data()))).sort(byDateThenIn);
}

/**
 * One staff member's recent records (all branches; callers filter by scope).
 * Index: attendance (staffId asc, dateKey desc).
 */
export async function attendanceForStaff(orgId: string, staffId: string, limit = 60): Promise<AttendanceDTO[]> {
  const snap = await orgCol(orgId, "attendance")
    .where("staffId", "==", staffId)
    .orderBy("dateKey", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => toAttendance(d.id, d.data())).sort(byDateThenIn);
}

/** Today's records for one staff member (two equality filters: no composite index needed). */
export async function attendanceForStaffOnDay(orgId: string, staffId: string, dateKey: string): Promise<AttendanceDTO[]> {
  const snap = await orgCol(orgId, "attendance").where("staffId", "==", staffId).where("dateKey", "==", dateKey).get();
  return snap.docs.map((d) => toAttendance(d.id, d.data())).sort(byDateThenIn);
}

/** Leave requests, newest start first. `leave` is small and org-scoped. */
export async function listLeave(orgId: string, opts: { staffId?: string } = {}): Promise<LeaveDTO[]> {
  const base = orgCol(orgId, "leave");
  const snap = opts.staffId ? await base.where("staffId", "==", opts.staffId).get() : await base.get();
  return snap.docs
    .map((d) => toLeave(d.id, d.data()))
    .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.staffName.localeCompare(b.staffName));
}

/** The record the time clock acts on: the open one, else the latest of the day. */
export function currentRecord(records: AttendanceDTO[]): AttendanceDTO | null {
  return records.find((r) => r.status === "open") ?? records[0] ?? null;
}
