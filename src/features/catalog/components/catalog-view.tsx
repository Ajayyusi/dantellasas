"use client";

import { BadgePercentIcon, CreditCardIcon, GiftIcon, HandCoinsIcon, PackageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { PageContainer, PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n/client";

import type { CatalogTab } from "./types";

const ICONS: Record<CatalogTab, typeof PackageIcon> = {
  packages: PackageIcon,
  memberships: CreditCardIcon,
  "gift-cards": GiftIcon,
  discounts: BadgePercentIcon,
  commissions: HandCoinsIcon,
};

const LABELS = {
  packages: "catalog.tabs.packages",
  memberships: "catalog.tabs.memberships",
  "gift-cards": "catalog.tabs.giftCards",
  discounts: "catalog.tabs.discounts",
  commissions: "catalog.tabs.commissions",
} as const;

/**
 * Page shell with URL-driven tabs (`?tab=`). The server renders only the
 * active tab's data (passed as children); switching tabs navigates and shows
 * a skeleton until the new tab arrives.
 */
export function CatalogView({ tab, tabs, children }: { tab: CatalogTab; tabs: CatalogTab[]; children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(tab);

  return (
    <PageContainer>
      <PageHeader title={t("catalog.title")} description={t("catalog.description")} />
      <Tabs
        value={current}
        onValueChange={(v) =>
          startTransition(() => {
            setCurrent(v as CatalogTab);
            router.push(`/catalog?tab=${v}`, { scroll: false });
          })
        }
        className="gap-5"
      >
        <TabsList aria-label={t("catalog.title")}>
          {tabs.map((k) => {
            const Icon = ICONS[k];
            return (
              <TabsTrigger key={k} value={k}>
                <Icon />
                {t(LABELS[k])}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {tabs.map((k) => (
          <TabsContent key={k} value={k}>
            {k === tab ? children : <TabSkeleton />}
          </TabsContent>
        ))}
      </Tabs>
    </PageContainer>
  );
}

function TabSkeleton() {
  return (
    <div className="grid gap-4" aria-busy>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Row above a tab's content: a sentence of context and the tab's actions. */
export function TabToolbar({ description, actions }: { description: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
