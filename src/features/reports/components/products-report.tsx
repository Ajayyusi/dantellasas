"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { PackageIcon } from "lucide-react";
import { useMemo } from "react";

import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { formatNumber } from "@/lib/money";

import type { ProductReportRow, ProductsReport as Data, StockState } from "../types";
import { KpiGrid, Notice, useReportCsv, usePercent } from "./report-parts";

const STATES: StockState[] = ["in_stock", "low", "out", "untracked"];

function StockBadge({ status, label }: { status: StockState; label: string }) {
  const variant = status === "out" ? "danger" : status === "low" ? "warning" : status === "in_stock" ? "success" : "neutral";
  return <Badge variant={variant}>{label}</Badge>;
}

export function ProductsReport({ data, range }: { data: Data; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const pct = usePercent();
  const csv = useReportCsv("products", range);
  const { totals } = data;
  const margin = totals.revenueMinor ? (totals.revenueMinor - totals.cogsMinor) / totals.revenueMinor : null;

  const columns = useMemo<ColumnDef<ProductReportRow, unknown>[]>(
    () => [
      {
        id: "product",
        header: t("reports.products.product"),
        accessorFn: (r) => localName(r, locale),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{localName(row.original, locale)}</p>
            {row.original.sku ? <p className="text-xs text-muted-foreground tabular">{row.original.sku}</p> : null}
          </div>
        ),
      },
      { id: "units", header: t("reports.products.units"), accessorFn: (r) => r.units, meta: { align: "end" } },
      { id: "revenue", header: t("reports.revenueExVat"), accessorFn: (r) => r.revenueMinor, cell: ({ row }) => <span className="font-medium">{org.money(row.original.revenueMinor)}</span>, meta: { align: "end" } },
      { id: "cogs", header: t("reports.products.cogs"), accessorFn: (r) => r.cogsMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.cogsMinor)}</span>, meta: { align: "end" } },
      { id: "margin", header: t("reports.products.margin"), accessorFn: (r) => r.marginMinor, cell: ({ row }) => org.money(row.original.marginMinor), meta: { align: "end" } },
      { id: "stock", header: t("reports.products.stock"), accessorFn: (r) => r.stock, cell: ({ row }) => <span className="tabular">{row.original.status === "untracked" ? "—" : formatNumber(row.original.stock, locale)}</span>, meta: { align: "end" } },
      { id: "status", header: t("common.status"), accessorFn: (r) => r.status, cell: ({ row }) => <StockBadge status={row.original.status} label={t(`reports.products.states.${row.original.status}`)} /> },
    ],
    [t, org, locale],
  );
  const facets = useMemo<FacetFilter<ProductReportRow>[]>(
    () => [
      {
        id: "status",
        label: t("common.status"),
        options: STATES.filter((s) => data.rows.some((r) => r.status === s)).map((s) => ({ value: s, label: t(`reports.products.states.${s}`) })),
        match: (r, v) => r.status === v,
      },
      {
        id: "sold",
        label: t("reports.products.sales"),
        options: [
          { value: "sold", label: t("reports.products.withSales") },
          { value: "none", label: t("reports.products.noSales") },
        ],
        match: (r, v) => (v === "sold" ? r.units !== 0 || r.refundedUnits !== 0 : r.units === 0 && r.refundedUnits === 0),
      },
    ],
    [t, data.rows],
  );
  const csvColumns = useMemo(
    () => [
      { header: t("reports.products.product"), value: (r: ProductReportRow) => localName(r, locale) },
      { header: "SKU", value: (r: ProductReportRow) => r.sku },
      { header: t("reports.products.units"), value: (r: ProductReportRow) => r.units },
      { header: t("reports.products.refundedUnits"), value: (r: ProductReportRow) => r.refundedUnits },
      { header: t("reports.revenueExVat"), value: (r: ProductReportRow) => csvMoney(r.revenueMinor) },
      { header: t("reports.products.cogs"), value: (r: ProductReportRow) => csvMoney(r.cogsMinor) },
      { header: t("reports.products.margin"), value: (r: ProductReportRow) => csvMoney(r.marginMinor) },
      { header: t("reports.products.stock"), value: (r: ProductReportRow) => (r.status === "untracked" ? "" : r.stock) },
      { header: t("reports.products.minStock"), value: (r: ProductReportRow) => r.minStock },
      { header: t("common.status"), value: (r: ProductReportRow) => t(`reports.products.states.${r.status}`) },
    ],
    [t, locale],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <KpiGrid className="mb-0">
        <StatCard label={t("reports.products.units")} value={formatNumber(totals.units, locale)} />
        <StatCard label={t("reports.revenueExVat")} value={org.money(totals.revenueMinor)} />
        <StatCard label={t("reports.products.margin")} value={org.money(totals.revenueMinor - totals.cogsMinor)} hint={t("reports.products.marginHint", { pct: pct(margin) })} />
        <StatCard label={t("reports.products.lowStock")} value={formatNumber(totals.low + totals.out, locale)} hint={t("reports.products.lowHint", { low: totals.low, out: totals.out })} />
      </KpiGrid>
      <DataTable
        data={data.rows}
        columns={columns}
        facets={facets}
        getRowId={(r) => r.productId}
        searchText={(r) => `${r.name} ${r.nameAr} ${r.sku}`}
        searchPlaceholder={t("reports.products.search")}
        initialVisibility={{ cogs: false }}
        csv={csv(csvColumns)}
        empty={<EmptyState icon={PackageIcon} title={t("reports.products.empty")} description={t("reports.emptyHint")} />}
        mobileCard={(r) => (
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{localName(r, locale)}</span>
              <span className="shrink-0 font-semibold tabular">{org.money(r.revenueMinor)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
              <span className="tabular">
                {t("reports.products.unitsCount", { count: formatNumber(r.units, locale) })}
                {r.status !== "untracked" ? ` · ${t("reports.products.inStock", { count: formatNumber(r.stock, locale) })}` : ""}
              </span>
              <StockBadge status={r.status} label={t(`reports.products.states.${r.status}`)} />
            </div>
          </div>
        )}
      />
      <Notice>{t("reports.products.note")}</Notice>
    </div>
  );
}
