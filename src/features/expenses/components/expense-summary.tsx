"use client";

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
  const { t, locale } = useI18n();
  const org = useOrg();
  const top = byCategory.slice(0, 3);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label={t("expenses.totalSpent")} value={org.money(totalMinor)} />
      <Stat label={t("expenses.totalVat")} value={org.money(taxMinor)} hint={t("expenses.vatHint")} />
      <Stat label={t("expenses.count")} value={formatNumber(count, locale)} hint={count > 0 ? t("expenses.average", { amount: org.money(Math.round(totalMinor / count)) }) : undefined} />
      <Card className="px-5 py-4">
        <p className="text-[13px] font-medium text-muted-foreground">{t("expenses.topCategories")}</p>
        {top.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">—</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {top.map((c) => (
              <li key={c.id} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="truncate">{c.label}</span>
                  <span className="shrink-0 font-medium tabular">{org.money(c.amountMinor)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${totalMinor > 0 ? Math.max(3, Math.round((c.amountMinor / totalMinor) * 100)) : 0}%` }}
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
