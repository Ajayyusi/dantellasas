import "server-only";

import type { Transaction } from "firebase-admin/firestore";

import { orgCol } from "@/lib/db";
import type { DiscountDTO } from "@/lib/types";

import { isDiscountUsable } from "./discount-state";
import { toDiscount } from "./mappers";

export { isDiscountUsable };

/** Upper-case code without surrounding spaces, as stored. */
export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Checkout helper: returns the discount for a code if it is active, within its
 * dates and under its usage cap; otherwise null. The caller increments
 * `usedCount` in the sale transaction (FieldValue.increment(1)) — pass `tx` to
 * read it inside that transaction.
 */
export async function validateDiscountCode(
  orgId: string,
  code: string,
  todayKey: string,
  tx?: Transaction,
): Promise<DiscountDTO | null> {
  const normalized = normalizeDiscountCode(code);
  if (!normalized) return null;
  const q = orgCol(orgId, "discounts").where("code", "==", normalized).limit(5);
  const snap = tx ? await tx.get(q) : await q.get();
  for (const doc of snap.docs) {
    const d = toDiscount(doc.id, doc.data());
    if (isDiscountUsable(d, todayKey)) return d;
  }
  return null;
}
