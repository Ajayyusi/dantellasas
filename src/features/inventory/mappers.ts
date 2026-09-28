import "server-only";

import { bool, iso, num, str, strOrNull, type Data } from "@/lib/db";
import type { MovementType, ProductCategoryDTO, SupplierDTO } from "@/lib/types";

import type { MovementRow, ProductRow } from "./types";

const USAGES = ["retail", "professional", "both"] as const;
const MOVEMENT_TYPES: MovementType[] = ["purchase", "sale", "adjustment", "transfer_in", "transfer_out", "return", "internal_use"];

export function toProductCategory(id: string, d: Data): ProductCategoryDTO {
  return {
    id,
    name: str(d.name),
    nameAr: str(d.nameAr),
    sortOrder: num(d.sortOrder),
    active: bool(d.active, true),
  };
}

function toStock(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === "object") {
    for (const [k, q] of Object.entries(v as Record<string, unknown>)) out[k] = num(q);
  }
  return out;
}

export function toProduct(id: string, d: Data): ProductRow {
  const usage = str(d.usage, "retail");
  return {
    id,
    sku: str(d.sku),
    barcode: str(d.barcode),
    name: str(d.name),
    nameAr: str(d.nameAr),
    brand: str(d.brand),
    categoryId: str(d.categoryId),
    supplierId: strOrNull(d.supplierId),
    costMinor: num(d.costMinor),
    priceMinor: num(d.priceMinor),
    taxRateId: strOrNull(d.taxRateId),
    taxExempt: bool(d.taxExempt),
    minStock: num(d.minStock),
    trackStock: bool(d.trackStock, true),
    usage: (USAGES as readonly string[]).includes(usage) ? (usage as ProductRow["usage"]) : "retail",
    active: bool(d.active, true),
    stock: toStock(d.stock),
  };
}

export function toMovement(id: string, d: Data): MovementRow {
  const type = str(d.type) as MovementType;
  return {
    id,
    productId: str(d.productId),
    productName: str(d.productName),
    branchId: str(d.branchId),
    type: MOVEMENT_TYPES.includes(type) ? type : "adjustment",
    quantity: num(d.quantity),
    balanceAfter: num(d.balanceAfter),
    unitCostMinor: num(d.unitCostMinor),
    note: str(d.note),
    transactionId: strOrNull(d.transactionId),
    transferId: strOrNull(d.transferId),
    createdByName: str(d.createdByName),
    createdAt: iso(d.createdAt),
  };
}

export function toSupplier(id: string, d: Data): SupplierDTO {
  return {
    id,
    name: str(d.name),
    contactName: str(d.contactName),
    phone: str(d.phone),
    email: str(d.email),
    trn: str(d.trn),
    notes: str(d.notes),
    active: bool(d.active, true),
  };
}
