"use client";

import { LandmarkIcon, ReceiptTextIcon, WalletIcon } from "lucide-react";

import { StatCard } from "@/components/common/stat-card";
import { useOrg } from "@/components/providers/org-provider";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";

export interface CategoryTotal {
  id: string;
  label: string;
  amountMinor: number;
}

/** Summary cards for the selected range: total, VAT, count and top categories. */
export function ExpenseSummary({
  totalMinor,
  taxMinor,
  count,
  byCategory,
}: {
  totalMinor: number;
  taxMinor: number;
  count: number;
  byCategory: CategoryTotal[];
}) {
  const { t, locale, dir } = useI18n();
  const org = useOrg();
  const top = byCategory.slice(0, 3);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={WalletIcon} tone="rose" label={t("expenses.totalSpent")} value={org.money(totalMinor)} />
      <StatCard icon={LandmarkIcon} tone="blue" label={t("expenses.totalVat")} value={org.money(taxMinor)} hint={t("expenses.vatHint")} />
      <StatCard
        icon={ReceiptTextIcon}
        tone="gold"
        label={t("expenses.count")}
        value={formatNumber(count, locale)}
        hint={count > 0 ? t("expenses.average", { amount: org.money(Math.round(totalMinor / count)) }) : undefined}
      />
      <Card className="px-5 py-5 sm:px-6">
        <p className="text-[14px] font-semibold text-muted-foreground">{t("expenses.topCategories")}</p>
        {top.length === 0 ? (
          <p className="mt-2 text-[15px] text-muted-foreground">—</p>
        ) : (
          <ul className="mt-3 grid gap-2.5">
            {top.map((c) => (
              <li key={c.id} className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-[14px]">
                  <span className="truncate font-medium">{c.label}</span>
                  <span className="shrink-0 font-semibold tabular">{org.money(c.amountMinor)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${totalMinor > 0 ? Math.max(3, Math.round((c.amountMinor / totalMinor) * 100)) : 0}%`,
                      background: `linear-gradient(${dir === "rtl" ? "270deg" : "90deg"}, var(--primary), color-mix(in oklch, var(--primary) 55%, var(--gold)))`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
