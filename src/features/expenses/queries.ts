import "server-only";

import { cache } from "react";

import { chunk, orgCol } from "@/lib/db";
import type { DateRange } from "@/lib/dates";
import type { AppContext } from "@/lib/tenancy/context";
import type { ExpenseCategoryDTO } from "@/lib/types";

import { toExpense, toExpenseCategory } from "./mappers";
import type { ExpenseRow } from "./types";

const MAX_ROWS = 2000;

export const listExpenseCategories = cache(async (orgId: string): Promise<ExpenseCategoryDTO[]> => {
  const snap = await orgCol(orgId, "expenseCategories").get();
  return snap.docs
    .map((d) => toExpenseCategory(d.id, d.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
});

/**
 * Expenses in the member's branch scope for a dateKey range, newest first.
 * Index: expenses (branchId ASC, dateKey ASC).
 */
export async function listExpenses(ctx: AppContext, range: DateRange): Promise<ExpenseRow[]> {
  if (ctx.scopeBranchIds.length === 0) return [];
  const groups = chunk(ctx.scopeBranchIds, 30);
  const snaps = await Promise.all(
    groups.map((ids) =>
      orgCol(ctx.org.id, "expenses")
        .where("branchId", "in", ids)
        .where("dateKey", ">=", range.from)
        .where("dateKey", "<=", range.to)
        .limit(MAX_ROWS)
        .get(),
    ),
  );
  return snaps
    .flatMap((s) => s.docs.map((d) => toExpense(d.id, d.data())))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}
