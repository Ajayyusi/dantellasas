import type { Metadata } from "next";

import { param, rangeFromParams, type SearchParams } from "@/lib/range-params";
import { InventoryView, type InventoryTab } from "@/features/inventory/components/inventory-view";
import { listMovements, listProductCategories, listProducts, listSuppliers } from "@/features/inventory/queries";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Inventory" };

const TABS: InventoryTab[] = ["products", "movements", "suppliers"];

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requirePagePermission("manage_inventory");
  const sp = await searchParams;
  const rawTab = param(sp, "tab") as InventoryTab | undefined;
  const tab: InventoryTab = rawTab && TABS.includes(rawTab) ? rawTab : "products";
  const { preset, range } = rangeFromParams(sp, ctx.timezone, ctx.settings.locale.weekStartsOn, "this_month");

  const [products, categories, suppliers, movements] = await Promise.all([
    listProducts(ctx.org.id),
    listProductCategories(ctx.org.id),
    listSuppliers(ctx.org.id),
    tab === "movements" ? listMovements(ctx, range) : Promise.resolve(null),
  ]);

  return (
    <InventoryView
      tab={tab}
      products={products}
      categories={categories}
      suppliers={suppliers}
      movements={movements}
      preset={preset}
      range={range}
      openProductId={param(sp, "product") ?? null}
    />
  );
}
