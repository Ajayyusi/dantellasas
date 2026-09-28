import type { Metadata } from "next";

import { SalesView } from "@/features/sales/components/sales-view";
import { listTransactions } from "@/features/sales/queries";
import { rangeFromParams } from "@/lib/range-params";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Sales" };

export default async function SalesPage({ searchParams }: PageProps<"/sales">) {
  const ctx = await requirePagePermission("view_sales");
  const { preset, range } = rangeFromParams(await searchParams, ctx.timezone, ctx.settings.locale.weekStartsOn, "today");
  const transactions = await listTransactions(ctx, range.from, range.to);
  return <SalesView key={`${range.from}:${range.to}`} transactions={transactions} preset={preset} range={range} />;
}
