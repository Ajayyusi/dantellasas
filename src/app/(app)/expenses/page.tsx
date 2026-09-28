import type { Metadata } from "next";

import { ExpensesView } from "@/features/expenses/components/expenses-view";
import { listExpenseCategories, listExpenses } from "@/features/expenses/queries";
import { rangeFromParams, type SearchParams } from "@/lib/range-params";
import { listSuppliers } from "@/features/inventory/queries";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requirePagePermission("view_expenses");
  const { preset, range } = rangeFromParams(await searchParams, ctx.timezone, ctx.settings.locale.weekStartsOn);
  const [expenses, categories, suppliers] = await Promise.all([
    listExpenses(ctx, range),
    listExpenseCategories(ctx.org.id),
    listSuppliers(ctx.org.id),
  ]);
  return (
    <ExpensesView
      expenses={expenses}
      categories={categories}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, active: s.active }))}
      preset={preset}
      range={range}
    />
  );
}
