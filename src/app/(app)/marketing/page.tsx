import type { Metadata } from "next";

import { listDiscounts } from "@/features/catalog/queries";
import { MarketingView } from "@/features/marketing/components/marketing-view";
import { LAPSED_DAYS, loadAudiences } from "@/features/marketing/queries";
import { todayKey } from "@/lib/dates";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const ctx = await requirePagePermission("view_customers");
  const [audiences, discounts] = await Promise.all([loadAudiences(ctx.org.id, ctx.timezone), listDiscounts(ctx.org.id)]);
  return <MarketingView audiences={audiences} discounts={discounts} today={todayKey(ctx.timezone)} lapsedDays={LAPSED_DAYS} />;
}
