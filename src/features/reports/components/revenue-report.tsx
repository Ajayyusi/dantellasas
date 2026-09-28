"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import { change, StatCard } from "@/components/common/stat-card";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";

import type { RevenueDay, RevenueReport as Data } from "../types";
import { DailyChart } from "./daily-chart";
import { KpiGrid, Notice, Section, useReportCsv } from "./report-parts";

const MONEY_COLS = ["grossMinor", "discountMinor", "refundsMinor", "netMinor", "vatMinor", "netExVatMinor", "tipsMinor"] as const;
type MoneyCol = (typeof MONEY_COLS)[number];

export function RevenueReport({ data, range }: { data: Data; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const csv = useReportCsv("revenue", range);
  const { totals, previous } = data;
  const vs = t("reports.vsPrevious", { from: org.dateKey(data.previousRange.from), to: org.dateKey(data.previousRange.to) });
  const label = (c: MoneyCol) => t(`reports.revenue.${c}`);

  const columns = useMemo<ColumnDef<RevenueDay, unknown>[]>(
    () => [
      {
        id: "date",
        header: t("common.date"),
        accessorFn: (r) => r.dateKey,
        cell: ({ row }) => <span className="whitespace-nowrap tabular">{org.dateKey(row.original.dateKey, "weekdayDate")}</span>,
      },
      { id: "invoices", header: t("reports.revenue.invoices"), accessorFn: (r) => r.invoices, meta: { align: "end" } },
      ...MONEY_COLS.map(
        (c): ColumnDef<RevenueDay, unknown> => ({
          id: c,
          header: t(`reports.revenue.${c}`),
          accessorFn: (r) => r[c],
          cell: ({ row }) => <span className={c === "netMinor" ? "font-medium" : "text-muted-foreground"}>{org.money(row.original[c])}</span>,
          meta: { align: "end" },
        }),
      ),
    ],
    [t, org],
  );
  const csvColumns = useMemo(
    () => [
      { header: t("common.date"), value: (r: RevenueDay) => r.dateKey },
      { header: t("reports.revenue.invoices"), value: (r: RevenueDay) => r.invoices },
      ...MONEY_COLS.map((c) => ({ header: t(`reports.revenue.${c}`), value: (r: RevenueDay) => csvMoney(r[c]) })),
    ],
    [t],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <KpiGrid className="mb-0">
        <StatCard label={label("netMinor")} value={org.money(totals.netMinor)} delta={change(totals.netMinor, previous.netMinor)} deltaLabel={vs} />
        <StatCard
          label={label("netExVatMinor")}
          value={org.money(totals.netExVatMinor)}
          delta={change(totals.netExVatMinor, previous.netExVatMinor)}
          hint={t("reports.revenue.vatHint", { amount: org.money(totals.vatMinor) })}
        />
        <StatCard
          label={t("reports.revenue.invoices")}
          value={formatNumber(totals.invoices, locale)}
          delta={change(totals.invoices, previous.invoices)}
          hint={totals.invoices ? t("reports.revenue.avgTicket", { amount: org.money(Math.round(totals.grossMinor / totals.invoices)) }) : undefined}
        />
        <StatCard
          label={label("refundsMinor")}
          value={org.money(totals.refundsMinor)}
          delta={change(totals.refundsMinor, previous.refundsMinor)}
          invert
          hint={t("reports.revenue.discountsHint", { amount: org.money(totals.discountMinor) })}
        />
      </KpiGrid>
      <Section title={t("reports.revenue.chartTitle")} description={t("reports.revenue.chartHint", { tips: org.money(totals.tipsMinor) })}>
        <DailyChart data={data.days.map((d) => ({ dateKey: d.dateKey, value: d.netMinor }))} label={label("netMinor")} />
      </Section>
      <DataTable
        data={data.days}
        columns={columns}
        initialSort={[{ id: "date", desc: true }]}
        initialVisibility={{ discountMinor: false, tipsMinor: false }}
        getRowId={(r) => r.dateKey}
        pageSize={10}
        csv={csv(csvColumns)}
        mobileCard={(r) => (
          <div className="grid gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium tabular">{org.dateKey(r.dateKey, "weekdayDate")}</span>
              <span className="font-semibold tabular">{org.money(r.netMinor)}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-x-3 text-[13px] text-muted-foreground">
              <span>{t("reports.revenue.invoicesCount", { count: formatNumber(r.invoices, locale) })}</span>
              <span className="tabular">
                {label("vatMinor")} {org.money(r.vatMinor)}
                {r.refundsMinor ? ` · ${label("refundsMinor")} ${org.money(r.refundsMinor)}` : ""}
              </span>
            </div>
          </div>
        )}
      />
      <Notice>{t("reports.revenue.note")}</Notice>
    </div>
  );
}
