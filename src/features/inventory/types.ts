import type { InventoryMovementDTO, ProductDTO } from "@/lib/types";

/** ProductDTO plus `taxExempt` (tax behaves like services: default / specific rate / exempt). */
export interface ProductRow extends ProductDTO {
  taxExempt: boolean;
}

/** InventoryMovementDTO plus the transfer link shared by both legs of a transfer. */
export interface MovementRow extends InventoryMovementDTO {
  transferId: string | null;
}

export const STOCK_OPERATIONS = ["receive", "adjust", "internal_use", "return", "transfer"] as const;
export type StockOperation = (typeof STOCK_OPERATIONS)[number];

export const PRODUCT_USAGES = ["retail", "professional", "both"] as const;

export type StockStatus = "in_stock" | "low" | "out" | "untracked";

/**
 * Brand plus product name for tickets and invoices, without repeating the
 * brand when the name already starts with it ("Moroccanoil Treatment 100ml").
 */
export function productDisplayName(brand: string, name: string): string {
  const b = brand.trim();
  const n = name.trim();
  if (!b) return n;
  if (!n) return b;
  return n.toLocaleLowerCase().startsWith(b.toLocaleLowerCase()) ? n : `${b} ${n}`;
}

/** Quantity at one branch, or the sum over `branchIds` when `branchId` is null. */
export function stockIn(product: Pick<ProductDTO, "stock">, branchId: string | null, branchIds: string[]): number {
  if (branchId) return product.stock[branchId] ?? 0;
  return branchIds.reduce((sum, id) => sum + (product.stock[id] ?? 0), 0);
}

/**
 * Stock status for the current view. With "All branches" a product is low
 * when any branch in scope is at or below the minimum.
 */
export function stockStatus(product: Pick<ProductDTO, "stock" | "minStock" | "trackStock">, branchId: string | null, branchIds: string[]): StockStatus {
  if (!product.trackStock) return "untracked";
  const ids = branchId ? [branchId] : branchIds;
  const total = stockIn(product, branchId, branchIds);
  if (total <= 0) return "out";
  if (ids.some((id) => (product.stock[id] ?? 0) <= product.minStock)) return "low";
  return "in_stock";
}
