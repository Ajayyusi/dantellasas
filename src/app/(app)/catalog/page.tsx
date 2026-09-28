import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { CatalogView } from "@/features/catalog/components/catalog-view";
import { CommissionsTab } from "@/features/catalog/components/commissions-tab";
import { DiscountsTab } from "@/features/catalog/components/discounts-tab";
import { GiftCardsTab } from "@/features/catalog/components/gift-cards-tab";
import { MembershipsTab } from "@/features/catalog/components/memberships-tab";
import { PackagesTab } from "@/features/catalog/components/packages-tab";
import { CATALOG_TABS, type CatalogService, type CatalogTab } from "@/features/catalog/components/types";
import {
  GIFT_CARD_LIMIT,
  listCommissionRules,
  listDiscounts,
  listGiftCards,
  listMembershipPlans,
  listPackages,
  packageSoldCounts,
  planActiveMemberCounts,
} from "@/features/catalog/queries";
import { listServices } from "@/features/services/queries";
import { listStaff } from "@/features/staff/queries";
import { todayKey } from "@/lib/dates";
import { hasAnyPermission } from "@/lib/permissions";
import { can, getAppContext } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Packages & gift cards" };

async function catalogServices(orgId: string): Promise<CatalogService[]> {
  const services = await listServices(orgId);
  return services.map((s) => ({ id: s.id, name: s.name, nameAr: s.nameAr, priceMinor: s.priceMinor, active: s.active }));
}

export default async function CatalogPage({ searchParams }: PageProps<"/catalog">) {
  const ctx = await getAppContext();
  // manage_catalog opens every tab; commission rules are also visible (read-only
  // unless manage_staff) to members who work with staff pay.
  const canCatalog = can(ctx, "manage_catalog");
  const canSeeCommissions = hasAnyPermission(ctx.permissions, ["manage_catalog", "manage_staff", "view_commissions"]);
  if (!canCatalog && !canSeeCommissions) forbidden();

  const tabs: CatalogTab[] = canCatalog ? [...CATALOG_TABS] : ["commissions"];
  const requested = (await searchParams).tab;
  const tab = tabs.find((k) => k === requested) ?? tabs[0] ?? "commissions";
  const orgId = ctx.org.id;

  let content: React.ReactNode;
  switch (tab) {
    case "packages": {
      const [packages, services] = await Promise.all([listPackages(orgId), catalogServices(orgId)]);
      const soldCounts = await packageSoldCounts(
        orgId,
        packages.map((p) => p.id),
      );
      content = <PackagesTab packages={packages} soldCounts={soldCounts} services={services} />;
      break;
    }
    case "memberships": {
      const [plans, services] = await Promise.all([listMembershipPlans(orgId), catalogServices(orgId)]);
      const activeCounts = await planActiveMemberCounts(
        orgId,
        plans.map((p) => p.id),
      );
      content = <MembershipsTab plans={plans} activeCounts={activeCounts} services={services} />;
      break;
    }
    case "gift-cards":
      content = <GiftCardsTab cards={await listGiftCards(orgId)} limit={GIFT_CARD_LIMIT} />;
      break;
    case "discounts":
      content = <DiscountsTab discounts={await listDiscounts(orgId)} today={todayKey(ctx.timezone)} />;
      break;
    case "commissions": {
      const [rules, staff, services] = await Promise.all([listCommissionRules(orgId), listStaff(orgId), catalogServices(orgId)]);
      content = (
        <CommissionsTab
          rules={rules}
          services={services}
          canEdit={hasAnyPermission(ctx.permissions, ["manage_staff", "manage_catalog"])}
          staff={staff.map((s) => ({
            id: s.id,
            displayName: s.displayName,
            color: s.color,
            photoUrl: s.photoUrl,
            status: s.status,
            commission: s.commission,
          }))}
        />
      );
      break;
    }
  }

  return (
    <CatalogView tab={tab} tabs={tabs}>
      {content}
    </CatalogView>
  );
}
