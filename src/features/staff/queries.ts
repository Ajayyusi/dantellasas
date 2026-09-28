import "server-only";

import { cache } from "react";

import { listServices } from "@/features/services/queries";
import { orgCol } from "@/lib/db";
import type { StaffDTO } from "@/lib/types";

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
