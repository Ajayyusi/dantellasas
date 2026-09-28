import "server-only";

import { cache } from "react";

import { orgCol } from "@/lib/db";
import type { ServiceCategoryDTO, ServiceDTO } from "@/lib/types";

import { toCategory, toService } from "./mappers";

const byOrder = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

/** Catalog reads are org-wide and small; cached per request. */
export const listCategories = cache(async (orgId: string): Promise<ServiceCategoryDTO[]> => {
  const snap = await orgCol(orgId, "serviceCategories").get();
  return snap.docs.map((d) => toCategory(d.id, d.data())).sort(byOrder);
});

export const listServices = cache(async (orgId: string): Promise<ServiceDTO[]> => {
  const snap = await orgCol(orgId, "services").get();
  return snap.docs.map((d) => toService(d.id, d.data())).sort(byOrder);
});

/** Services offered at a branch ([] branchIds = all branches). */
export function servicesForBranch(services: ServiceDTO[], branchId: string | null): ServiceDTO[] {
  if (!branchId) return services;
  return services.filter((s) => s.branchIds.length === 0 || s.branchIds.includes(branchId));
}
