import "server-only";

import { cache } from "react";

import { toAppointment } from "@/features/appointments/mappers";
import { toTransaction } from "@/features/sales/mappers";
import { listServices } from "@/features/services/queries";
import { orgCol } from "@/lib/db";
import type { AppContext } from "@/lib/tenancy/context";
import type { AppointmentDTO, StaffDTO, TransactionDTO } from "@/lib/types";

import { toStaff } from "./mappers";

/** All staff records with the services each performs (from services.staffIds; [] = everyone). */
export const listStaff = cache(async (orgId: string): Promise<StaffDTO[]> => {
  const [snap, services] = await Promise.all([orgCol(orgId, "staff").get(), listServices(orgId)]);
  return snap.docs
    .map((d) => {
      const serviceIds = services
        .filter((s) => s.staffIds.length === 0 || s.staffIds.includes(d.id))
        .map((s) => s.id);
      return toStaff(d.id, d.data(), serviceIds);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
});

export function staffForBranch(staff: StaffDTO[], branchId: string | null): StaffDTO[] {
  return staff.filter(
    (s) => s.status !== "archived" && (!branchId || s.branchIds.length === 0 || s.branchIds.includes(branchId)),
  );
}

/** Whether a staff record works in one of the given branches ([] = every branch). */
export function staffInBranches(staff: StaffDTO, branchIds: string[]): boolean {
  return staff.branchIds.length === 0 || staff.branchIds.some((b) => branchIds.includes(b));
}

export const getStaffMember = cache(async (orgId: string, staffId: string): Promise<StaffDTO | null> => {
  const all = await listStaff(orgId);
  return all.find((s) => s.id === staffId) ?? null;
});

/**
 * Appointments containing a line for this staff member in a dateKey range,
 * restricted to the member's branch scope.
 * Index: appointments (staffIds array-contains, dateKey asc).
 */
export async function staffAppointments(
  ctx: AppContext,
  staffId: string,
  range: { from: string; to: string },
): Promise<AppointmentDTO[]> {
  const snap = await orgCol(ctx.org.id, "appointments")
    .where("staffIds", "array-contains", staffId)
    .where("dateKey", ">=", range.from)
    .where("dateKey", "<=", range.to)
    .orderBy("dateKey")
    .get();
  const scope = new Set(ctx.scopeBranchIds);
  return snap.docs.map((d) => toAppointment(d.id, d.data())).filter((a) => scope.has(a.branchId));
}

/**
 * Invoices with a line for this staff member in a dateKey range (branch-scoped).
 * Index: transactions (staffIds array-contains, dateKey asc).
 */
export async function staffTransactions(
  ctx: AppContext,
  staffId: string,
  range: { from: string; to: string },
): Promise<TransactionDTO[]> {
  const snap = await orgCol(ctx.org.id, "transactions")
    .where("staffIds", "array-contains", staffId)
    .where("dateKey", ">=", range.from)
    .where("dateKey", "<=", range.to)
    .orderBy("dateKey")
    .get();
  const scope = new Set(ctx.scopeBranchIds);
  return snap.docs.map((d) => toTransaction(d.id, d.data())).filter((t) => scope.has(t.branchId));
}
