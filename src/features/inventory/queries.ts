import "server-only";

import { cache } from "react";

import { chunk, orgCol, ts } from "@/lib/db";
import { addDaysToKey, startOfDayInstant, type DateRange } from "@/lib/dates";
import type { AppContext } from "@/lib/tenancy/context";
import type { ProductCategoryDTO, SupplierDTO } from "@/lib/types";

import { toMovement, toProduct, toProductCategory, toSupplier } from "./mappers";
import type { MovementRow, ProductRow } from "./types";

const MAX_MOVEMENTS = 2000;

/** Catalog reads are org-wide and small; cached per request. */
export const listProducts = cache(async (orgId: string): Promise<ProductRow[]> => {
  const snap = await orgCol(orgId, "products").get();
  return snap.docs.map((d) => toProduct(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name));
});

export const listProductCategories = cache(async (orgId: string): Promise<ProductCategoryDTO[]> => {
  const snap = await orgCol(orgId, "productCategories").get();
  return snap.docs
    .map((d) => toProductCategory(d.id, d.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
});

export const listSuppliers = cache(async (orgId: string): Promise<SupplierDTO[]> => {
  const snap = await orgCol(orgId, "suppliers").get();
  return snap.docs.map((d) => toSupplier(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name));
});

/**
 * Stock ledger for the member's branch scope and a date range, newest first.
 * Index: inventoryMovements (branchId ASC, createdAt DESC).
 */
export async function listMovements(ctx: AppContext, range: DateRange): Promise<MovementRow[]> {
  if (ctx.scopeBranchIds.length === 0) return [];
  const start = ts(startOfDayInstant(range.from, ctx.timezone));
  const end = ts(startOfDayInstant(addDaysToKey(range.to, 1), ctx.timezone));
  const snaps = await Promise.all(
    chunk(ctx.scopeBranchIds, 30).map((ids) =>
      orgCol(ctx.org.id, "inventoryMovements")
        .where("branchId", "in", ids)
        .where("createdAt", ">=", start)
        .where("createdAt", "<", end)
        .orderBy("createdAt", "desc")
        .limit(MAX_MOVEMENTS)
        .get(),
    ),
  );
  return snaps
    .flatMap((s) => s.docs.map((d) => toMovement(d.id, d.data())))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/**
 * Latest movements of one product in branches the member can access.
 * Index: inventoryMovements (productId ASC, createdAt DESC).
 */
export async function listProductMovements(ctx: AppContext, productId: string, limit = 30): Promise<MovementRow[]> {
  const allowed = new Set(ctx.branches.map((b) => b.id));
  const snap = await orgCol(ctx.org.id, "inventoryMovements")
    .where("productId", "==", productId)
    .orderBy("createdAt", "desc")
    .limit(limit * 2)
    .get();
  return snap.docs
    .map((d) => toMovement(d.id, d.data()))
    .filter((m) => allowed.has(m.branchId))
    .slice(0, limit);
}
