"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { GiftIcon } from "lucide-react";
import { useMemo } from "react";

import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { formatNumber } from "@/lib/money";

import type { PrepaidReport as Data, PrepaidRow } from "../types";
import { BarList, KpiGrid, Notice, Section, useReportCsv } from "./report-parts";

function Line({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-2.5 text-sm last:border-0">
      <span className="min-w-0">
        {label}
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <span className="shrink-0 font-medium tabular">{value}</span>
    </div>
  );
}

export function PackagesReport({ data, range }: { data: Data; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const csv = useReportCsv("packages", range);
  const name = (r: PrepaidRow) => (r.type === "gift_card" ? t("reports.packages.types.gift_card") : localName(r, locale));
  const sold = data.byType.reduce((s, x) => s + x.valueMinor, 0);
  const soldCount = data.byType.reduce((s, x) => s + x.count, 0);
  const { redemptions: red, liability: li } = data;

  const columns = useMemo<ColumnDef<PrepaidRow, unknown>[]>(
    () => [
      { id: "item", header: t("reports.packages.item"), accessorFn: (r) => (r.type === "gift_card" ? t("reports.packages.types.gift_card") : localName(r, locale)), cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
      { id: "type", header: t("reports.packages.type"), accessorFn: (r) => t(`reports.packages.types.${r.type}`), cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span> },
      { id: "count", header: t("reports.packages.sold"), accessorFn: (r) => r.count, meta: { align: "end" } },
      { id: "refunded", header: t("reports.packages.refunded"), accessorFn: (r) => r.refundedMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.refundedMinor)}</span>, meta: { align: "end" } },
      { id: "value", header: t("reports.packages.value"), accessorFn: (r) => r.valueMinor, cell: ({ row }) => <span className="font-medium">{org.money(row.original.valueMinor)}</span>, meta: { align: "end" } },
    ],
    [t, org, locale],
  );
  const facets = useMemo<FacetFilter<PrepaidRow>[]>(
    () => [
      {
        id: "type",
        label: t("reports.packages.type"),
        options: data.byType.filter((x) => data.rows.some((r) => r.type === x.type)).map((x) => ({ value: x.type, label: t(`reports.packages.types.${x.type}`) })),
        match: (r, v) => r.type === v,
      },
    ],
    [t, data.byType, data.rows],
  );
  const csvColumns = useMemo(
    () => [
      { header: t("reports.packages.item"), value: (r: PrepaidRow) => (r.type === "gift_card" ? t("reports.packages.types.gift_card") : localName(r, locale)) },
      { header: t("reports.packages.type"), value: (r: PrepaidRow) => t(`reports.packages.types.${r.type}`) },
      { header: t("reports.packages.sold"), value: (r: PrepaidRow) => r.count },
      { header: t("reports.packages.refunded"), value: (r: PrepaidRow) => csvMoney(r.refundedMinor) },
      { header: t("reports.packages.value"), value: (r: PrepaidRow) => csvMoney(r.valueMinor) },
    ],
    [t, locale],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <KpiGrid className="mb-0">
        <StatCard label={t("reports.packages.soldValue")} value={org.money(sold)} hint={t("reports.packages.soldCount", { count: formatNumber(soldCount, locale) })} />
        <StatCard label={t("reports.packages.giftRedeemed")} value={org.money(red.giftCardMinor)} />
        <StatCard label={t("reports.packages.creditRedeemed")} value={org.money(red.packageCreditMinor)} hint={t("reports.packages.sessionsHint", { count: formatNumber(red.packageSessions, locale) })} />
        <StatCard label={t("reports.packages.giftLiability")} value={org.money(li.giftCardMinor)} hint={t("reports.packages.liabilityHint", { count: formatNumber(li.giftCards, locale) })} />
      </KpiGrid>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("reports.packages.byType")}>
          <BarList
            items={data.byType.filter((x) => x.count !== 0 || x.valueMinor !== 0).map((x) => ({ key: x.type, label: t(`reports.packages.types.${x.type}`), value: x.valueMinor, display: org.money(x.valueMinor), hint: t("reports.times", { count: formatNumber(x.count, locale) }) }))}
            empty={<p className="text-sm text-muted-foreground">{t("reports.noData")}</p>}
          />
        </Section>
        <Section title={t("reports.packages.outstanding")} description={t("reports.packages.outstandingHint")}>
          <Line label={t("reports.packages.giftLiability")} value={org.money(li.giftCardMinor)} hint={t("reports.packages.liabilityHint", { count: formatNumber(li.giftCards, locale) })} />
          <Line label={t("reports.packages.creditOutstanding")} value={org.money(li.packageCreditMinor)} />
          <Line label={t("reports.packages.sessionsOutstanding")} value={formatNumber(li.packageSessions, locale)} />
          {li.capped ? <Notice tone="warning" className="mt-3">{t("reports.capped")}</Notice> : null}
        </Section>
      </div>
      <DataTable
        data={data.rows}
        columns={columns}
        facets={data.rows.length ? facets : undefined}
        getRowId={(r) => r.key}
        csv={csv(csvColumns)}
        empty={<EmptyState icon={GiftIcon} title={t("reports.packages.empty")} description={t("reports.emptyHint")} />}
        mobileCard={(r) => (
          <div className="grid gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{name(r)}</span>
              <span className="shrink-0 font-semibold tabular">{org.money(r.valueMinor)}</span>
            </div>
            <p className="text-[14px] text-muted-foreground">
              {t(`reports.packages.types.${r.type}`)} · {t("reports.times", { count: formatNumber(r.count, locale) })}
            </p>
          </div>
        )}
      />
      <Notice>{t("reports.packages.note")}</Notice>
    </div>
  );
}
