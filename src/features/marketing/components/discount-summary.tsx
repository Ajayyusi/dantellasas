"use client";

import { ArrowRightIcon, BadgePercentIcon } from "lucide-react";
import Link from "next/link";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { discountState } from "@/features/catalog/discount-state";
import { useI18n } from "@/lib/i18n/client";
import { formatPercent } from "@/lib/money";
import type { DiscountDTO } from "@/lib/types";

/** Live discount codes, to quote in campaigns. */
export function DiscountSummary({ discounts, today }: { discounts: DiscountDTO[]; today: string }) {
  const { t, tp, locale } = useI18n();
  const org = useOrg();
  const live = discounts.filter((d) => d.code && discountState(d, today) === "live");
  const scheduled = discounts.filter((d) => d.code && discountState(d, today) === "scheduled").length;

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgePercentIcon className="size-4 text-primary" />
          {t("marketing.discounts.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {live.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("marketing.discounts.empty")}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-1">
            {live.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[14px] font-semibold tracking-wide" dir="ltr">
                    {d.code}
                  </div>
                  <div className="truncate text-[14px] text-muted-foreground">
                    {d.name}
                    {d.endsAt ? ` · ${t("marketing.discounts.until", { date: org.dateKey(d.endsAt, "monthDay") })}` : ""}
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-sm font-semibold tabular">
                    {d.kind === "percent" ? formatPercent(d.valueBps / 10000, locale, 2) : org.money(d.valueMinor)}
                  </div>
                  <div className="text-[13px] text-muted-foreground tabular">
                    {d.maxUses !== null
                      ? t("marketing.discounts.usedOf", { used: d.usedCount, max: d.maxUses })
                      : t("marketing.discounts.used", { used: d.usedCount })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {scheduled > 0 ? (
          <p className="text-[14px] text-muted-foreground">{tp("marketing.discounts.scheduled", scheduled)}</p>
        ) : null}
        {org.can("manage_catalog") ? (
          <Button variant="outline" size="sm" className="justify-self-start" asChild>
            <Link href="/catalog?tab=discounts">
              {live.length === 0 ? t("marketing.discounts.create") : t("marketing.discounts.manage")}
              <ArrowRightIcon className="rtl-flip" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
