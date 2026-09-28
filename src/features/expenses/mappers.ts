import "server-only";

import { bool, iso, num, str, strOrNull, type Data } from "@/lib/db";
import type { ExpenseCategoryDTO } from "@/lib/types";

import type { ExpenseRow } from "./types";

export function toExpenseCategory(id: string, d: Data): ExpenseCategoryDTO {
  return {
    id,
    name: str(d.name),
    nameAr: str(d.nameAr),
    active: bool(d.active, true),
    sortOrder: num(d.sortOrder),
  };
}

export function toExpense(id: string, d: Data): ExpenseRow {
  const a = d.attachment as Data | null | undefined;
  return {
    id,
    branchId: str(d.branchId),
    dateKey: str(d.dateKey),
    categoryId: str(d.categoryId),
    categoryName: str(d.categoryName),
    amountMinor: num(d.amountMinor),
    taxMinor: num(d.taxMinor),
    vendor: str(d.vendor),
    supplierId: strOrNull(d.supplierId),
    paymentMethod: str(d.paymentMethod),
    description: str(d.description),
    attachment:
      a && typeof a === "object" && str(a.path)
        ? {
            name: str(a.name, "receipt"),
            contentType: str(a.contentType),
            size: num(a.size),
            url: strOrNull(a.url),
          }
        : null,
    createdByName: str(d.createdByName),
    createdAt: iso(d.createdAt),
  };
}
