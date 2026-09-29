"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { WalletIcon } from "lucide-react";
import { useMemo } from "react";

import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { formatNumber } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { ExpenseCategoryRow, ProfitReport } from "../types";
import { BarList, KpiGrid, Notice, Section, useReportCsv, usePercent } from "./report-parts";

function StatementLine({ label, value, strong, sign }: { label: string; value: string; strong?: boolean; sign?: "−" | "=" }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-2 text-sm", strong && "border-t font-semibold")}>
      <span className="min-w-0">
        {sign ? <span className="me-1.5 inline-block w-3 text-muted-foreground">{sign}</span> : <span className="me-1.5 inline-block w-3" />}
        {label}
      </span>
      <span className="shrink-0 tabular">{value}</span>
    </div>
  );
}

export function ExpensesReport({ data, range }: { data: ProfitReport; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const pct = usePercent();
  const csv = useReportCsv("expenses", range);
  const name = (r: ExpenseCategoryRow) => (r.name ? localName(r, locale) : t("reports.uncategorised"));

  const columns = useMemo<ColumnDef<ExpenseCategoryRow, unknown>[]>(
    () => [
      { id: "category", header: t("common.category"), accessorFn: (r) => (r.name ? localName(r, locale) : t("reports.uncategorised")), cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
      { id: "count", header: t("reports.expenses.count"), accessorFn: (r) => r.count, meta: { align: "end" } },
      { id: "net", header: t("reports.expenses.exVat"), accessorFn: (r) => r.netMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.netMinor)}</span>, meta: { align: "end" } },
      { id: "vat", header: t("common.tax"), accessorFn: (r) => r.taxMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.taxMinor)}</span>, meta: { align: "end" } },
      { id: "amount", header: t("reports.expenses.total"), accessorFn: (r) => r.amountMinor, cell: ({ row }) => <span className="font-medium">{org.money(row.original.amountMinor)}</span>, meta: { align: "end" } },
      { id: "share", header: t("reports.share"), accessorFn: (r) => r.share, cell: ({ row }) => <span className="text-muted-foreground">{pct(row.original.share)}</span>, meta: { align: "end" } },
    ],
    [t, org, locale, pct],
  );
  const csvColumns = useMemo(
    () => [
      { header: t("common.category"), value: (r: ExpenseCategoryRow) => (r.name ? localName(r, locale) : t("reports.uncategorised")) },
      { header: t("reports.expenses.count"), value: (r: ExpenseCategoryRow) => r.count },
      { header: t("reports.expenses.exVat"), value: (r: ExpenseCategoryRow) => csvMoney(r.netMinor) },
      { header: t("common.tax"), value: (r: ExpenseCategoryRow) => csvMoney(r.taxMinor) },
      { header: t("reports.expenses.total"), value: (r: ExpenseCategoryRow) => csvMoney(r.amountMinor) },
    ],
    [t, locale],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <KpiGrid className="mb-0">
        <StatCard label={t("reports.expenses.profit")} value={org.money(data.profitMinor)} hint={t("reports.expenses.marginHint", { pct: pct(data.margin) })} />
        <StatCard label={t("reports.revenueExVat")} value={org.money(data.revenueExVatMinor)} />
        <StatCard label={t("reports.expenses.expenses")} value={org.money(data.expensesMinor)} hint={t("reports.expenses.vatHint", { amount: org.money(data.expenseVatMinor) })} />
        <StatCard label={t("reports.expenses.cogs")} value={org.money(data.cogsMinor)} />
      </KpiGrid>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("reports.expenses.statement")} description={t("reports.expenses.statementHint")}>
          <StatementLine label={t("reports.revenueExVat")} value={org.money(data.revenueExVatMinor)} />
          <StatementLine sign="−" label={t("reports.expenses.cogs")} value={org.money(data.cogsMinor)} />
          <StatementLine sign="=" strong label={t("reports.expenses.grossProfit")} value={org.money(data.grossProfitMinor)} />
          <StatementLine sign="−" label={t("reports.expenses.expensesExVat")} value={org.money(data.expensesExVatMinor)} />
          <StatementLine sign="=" strong label={t("reports.expenses.profit")} value={org.money(data.profitMinor)} />
          {data.unitsWithoutCost > 0 ? (
            <Notice tone="warning" className="mt-3">
              {t("reports.expenses.missingCost", { count: formatNumber(data.unitsWithoutCost, locale) })}
            </Notice>
          ) : null}
        </Section>
        <Section title={t("reports.expenses.byCategory")}>
          <BarList
            items={data.categories.slice(0, 8).map((c) => ({ key: c.categoryId || "none", label: name(c), value: c.amountMinor, display: org.money(c.amountMinor) }))}
            empty={<p className="text-sm text-muted-foreground">{t("reports.noData")}</p>}
          />
        </Section>
      </div>
      <DataTable
        data={data.categories}
        columns={columns}
        getRowId={(r) => r.categoryId || "none"}
        csv={csv(csvColumns)}
        empty={<EmptyState icon={WalletIcon} title={t("reports.expenses.empty")} description={t("reports.expenses.emptyHint")} />}
        mobileCard={(r) => (
          <div className="grid gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{name(r)}</span>
              <span className="shrink-0 font-semibold tabular">{org.money(r.amountMinor)}</span>
            </div>
            <p className="text-[14px] text-muted-foreground tabular">
              {t("reports.expenses.countHint", { count: formatNumber(r.count, locale) })} · {pct(r.share)}
            </p>
          </div>
        )}
      />
      <Notice>{t("reports.expenses.note")}</Notice>
    </div>
  );
}
