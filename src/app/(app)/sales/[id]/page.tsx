import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SaleDetailView } from "@/features/sales/components/sale-detail-view";
import { getTransaction } from "@/features/sales/queries";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Invoice" };

export default async function SalePage({ params }: PageProps<"/sales/[id]">) {
  const ctx = await requirePagePermission("view_sales");
  const { id } = await params;
  const tx = await getTransaction(ctx, id);
  if (!tx) notFound();
  return <SaleDetailView tx={tx} />;
}
