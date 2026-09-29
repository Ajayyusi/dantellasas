"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ScissorsIcon } from "lucide-react";
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

import type { ServiceRow, ServicesReport as Data } from "../types";
import { BarList, KpiGrid, Notice, Section, useReportCsv } from "./report-parts";

export function ServicesReport({ data, range }: { data: Data; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const csv = useReportCsv("services", range);
  const categoryName = useMemo(() => {
    const byId = new Map(data.categories.map((c) => [c.categoryId, c]));
    return (id: string) => {
      const c = byId.get(id);
      return c && c.name ? localName(c, locale) : t("reports.uncategorised");
    };
  }, [data.categories, locale, t]);
  const name = (r: ServiceRow) => localName(r, locale);
  const { totals } = data;

  const columns = useMemo<ColumnDef<ServiceRow, unknown>[]>(
    () => [
      { id: "service", header: t("common.service"), accessorFn: (r) => localName(r, locale), cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
      { id: "category", header: t("common.category"), accessorFn: (r) => categoryName(r.categoryId), cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span> },
      { id: "count", header: t("reports.services.count"), accessorFn: (r) => r.count, meta: { align: "end" } },
      { id: "redeemed", header: t("reports.services.redeemed"), accessorFn: (r) => r.redeemedCount, meta: { align: "end" } },
      { id: "refunded", header: t("reports.services.refunded"), accessorFn: (r) => r.refundedCount, meta: { align: "end" } },
      { id: "revenue", header: t("reports.revenueExVat"), accessorFn: (r) => r.revenueMinor, cell: ({ row }) => <span className="font-medium">{org.money(row.original.revenueMinor)}</span>, meta: { align: "end" } },
      { id: "avg", header: t("reports.services.avgPrice"), accessorFn: (r) => r.avgPriceMinor, cell: ({ row }) => org.money(row.original.avgPriceMinor), meta: { align: "end" } },
    ],
    [t, org, locale, categoryName],
  );
  const facets = useMemo<FacetFilter<ServiceRow>[]>(
    () => [
      {
        id: "category",
        label: t("common.category"),
        options: data.categories.map((c) => ({ value: c.categoryId, label: categoryName(c.categoryId) })),
        match: (r, v) => r.categoryId === v,
      },
    ],
    [t, data.categories, categoryName],
  );
  const csvColumns = useMemo(
    () => [
      { header: t("common.service"), value: (r: ServiceRow) => localName(r, locale) },
      { header: t("common.category"), value: (r: ServiceRow) => categoryName(r.categoryId) },
      { header: t("reports.services.count"), value: (r: ServiceRow) => r.count },
      { header: t("reports.services.redeemed"), value: (r: ServiceRow) => r.redeemedCount },
      { header: t("reports.services.refunded"), value: (r: ServiceRow) => r.refundedCount },
      { header: t("reports.revenueExVat"), value: (r: ServiceRow) => csvMoney(r.revenueMinor) },
      { header: t("reports.refundsExVat"), value: (r: ServiceRow) => csvMoney(r.refundsMinor) },
      { header: t("reports.services.avgPrice"), value: (r: ServiceRow) => csvMoney(r.avgPriceMinor) },
    ],
    [t, locale, categoryName],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <KpiGrid className="mb-0">
        <StatCard label={t("reports.services.count")} value={formatNumber(totals.count, locale)} />
        <StatCard label={t("reports.revenueExVat")} value={org.money(totals.revenueMinor)} hint={totals.refundsMinor ? t("reports.afterRefunds", { amount: org.money(totals.refundsMinor) }) : undefined} />
        <StatCard label={t("reports.services.avgPrice")} value={org.money(totals.count > 0 ? Math.round(totals.revenueMinor / totals.count) : 0)} />
        <StatCard label={t("reports.services.redeemed")} value={formatNumber(totals.redeemedCount, locale)} hint={t("reports.services.redeemedHint")} />
      </KpiGrid>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("reports.services.topCategories")}>
          <BarList
            items={data.categories.slice(0, 8).map((c) => ({ key: c.categoryId || "none", label: categoryName(c.categoryId), value: c.revenueMinor, display: org.money(c.revenueMinor) }))}
            empty={<p className="text-sm text-muted-foreground">{t("reports.noData")}</p>}
          />
        </Section>
        <Section title={t("reports.services.topServices")}>
          <BarList
            items={data.rows.slice(0, 8).map((r) => ({ key: r.serviceId, label: name(r), value: r.revenueMinor, display: org.money(r.revenueMinor), hint: t("reports.times", { count: formatNumber(r.count, locale) }) }))}
            empty={<p className="text-sm text-muted-foreground">{t("reports.noData")}</p>}
          />
        </Section>
      </div>
      <DataTable
        data={data.rows}
        columns={columns}
        facets={facets}
        getRowId={(r) => r.serviceId}
        searchText={(r) => `${r.name} ${r.nameAr}`}
        searchPlaceholder={t("reports.services.search")}
        initialVisibility={{ refunded: false, redeemed: false }}
        csv={csv(csvColumns)}
        empty={<EmptyState icon={ScissorsIcon} title={t("reports.services.empty")} description={t("reports.emptyHint")} />}
        mobileCard={(r) => (
          <div className="grid gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{name(r)}</span>
              <span className="shrink-0 font-semibold tabular">{org.money(r.revenueMinor)}</span>
            </div>
            <div className="flex justify-between gap-2 text-[14px] text-muted-foreground">
              <span className="truncate">{categoryName(r.categoryId)}</span>
              <span className="shrink-0 tabular">
                {t("reports.times", { count: formatNumber(r.count, locale) })} · {org.money(r.avgPriceMinor)}
              </span>
            </div>
          </div>
        )}
      />
      <Notice>{t("reports.lineNote")}</Notice>
    </div>
  );
}
