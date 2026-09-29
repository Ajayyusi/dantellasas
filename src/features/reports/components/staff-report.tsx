"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { UserRoundIcon } from "lucide-react";
import { useMemo } from "react";

import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";

import type { StaffReport as Data, StaffRow } from "../types";
import { BarList, KpiGrid, Notice, Section, useReportCsv, usePercent } from "./report-parts";

const money = (v: number | null) => v ?? 0;

export function StaffReport({ data, range }: { data: Data; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const pct = usePercent();
  const csv = useReportCsv("staff", range);
  const { rows, showCommission } = data;
  const sum = (f: (r: StaffRow) => number) => rows.reduce((s, r) => s + f(r), 0);
  const noShowRate = (r: StaffRow) => (r.appointments ? r.noShows / r.appointments : null);

  const columns = useMemo<ColumnDef<StaffRow, unknown>[]>(() => {
    const cols: ColumnDef<StaffRow, unknown>[] = [
      { id: "staff", header: t("common.staff"), accessorFn: (r) => r.name, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
      { id: "services", header: t("reports.staff.services"), accessorFn: (r) => r.services, meta: { align: "end" } },
      { id: "serviceRevenue", header: t("reports.staff.serviceRevenue"), accessorFn: (r) => r.serviceRevenueMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.serviceRevenueMinor)}</span>, meta: { align: "end" } },
      { id: "productRevenue", header: t("reports.staff.productRevenue"), accessorFn: (r) => r.productRevenueMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.productRevenueMinor)}</span>, meta: { align: "end" } },
      { id: "revenue", header: t("reports.revenueExVat"), accessorFn: (r) => r.revenueMinor, cell: ({ row }) => <span className="font-medium">{org.money(row.original.revenueMinor)}</span>, meta: { align: "end" } },
    ];
    if (showCommission) {
      cols.push({ id: "commission", header: t("reports.staff.commission"), accessorFn: (r) => money(r.commissionMinor), cell: ({ row }) => org.money(money(row.original.commissionMinor)), meta: { align: "end" } });
    }
    cols.push(
      { id: "tips", header: t("reports.staff.tips"), accessorFn: (r) => r.tipsMinor, cell: ({ row }) => org.money(row.original.tipsMinor), meta: { align: "end" } },
      { id: "appointments", header: t("reports.staff.appointments"), accessorFn: (r) => r.appointments, meta: { align: "end" } },
      { id: "completed", header: t("reports.staff.completed"), accessorFn: (r) => r.completed, meta: { align: "end" } },
      {
        id: "noShows",
        header: t("reports.staff.noShows"),
        accessorFn: (r) => r.noShows,
        cell: ({ row }) => (
          <span className="tabular">
            {row.original.noShows}
            {row.original.appointments ? <span className="ms-1 text-xs text-muted-foreground">({pct(noShowRate(row.original), 0)})</span> : null}
          </span>
        ),
        meta: { align: "end" },
      },
    );
    return cols;
  }, [t, org, showCommission, pct]);

  const csvColumns = useMemo(() => {
    const cols = [
      { header: t("common.staff"), value: (r: StaffRow) => r.name },
      { header: t("reports.staff.services"), value: (r: StaffRow) => r.services },
      { header: t("reports.staff.serviceRevenue"), value: (r: StaffRow) => csvMoney(r.serviceRevenueMinor) },
      { header: t("reports.staff.productRevenue"), value: (r: StaffRow) => csvMoney(r.productRevenueMinor) },
      { header: t("reports.revenueExVat"), value: (r: StaffRow) => csvMoney(r.revenueMinor) },
    ];
    if (showCommission) {
      cols.push(
        { header: t("reports.staff.commission"), value: (r: StaffRow) => csvMoney(money(r.commissionMinor)) },
        { header: t("reports.staff.reversed"), value: (r: StaffRow) => csvMoney(money(r.commissionReversedMinor)) },
      );
    }
    cols.push(
      { header: t("reports.staff.tips"), value: (r: StaffRow) => csvMoney(r.tipsMinor) },
      { header: t("reports.staff.appointments"), value: (r: StaffRow) => r.appointments },
      { header: t("reports.staff.completed"), value: (r: StaffRow) => r.completed },
      { header: t("reports.staff.noShows"), value: (r: StaffRow) => r.noShows },
    );
    return cols;
  }, [t, showCommission]);

  return (
    <div className="grid grid-cols-1 gap-6">
      <KpiGrid className="mb-0">
        <StatCard label={t("reports.revenueExVat")} value={org.money(sum((r) => r.revenueMinor))} />
        <StatCard label={t("reports.staff.services")} value={formatNumber(sum((r) => r.services), locale)} />
        {showCommission ? (
          <StatCard label={t("reports.staff.commission")} value={org.money(sum((r) => money(r.commissionMinor)))} hint={t("reports.staff.reversedHint", { amount: org.money(sum((r) => money(r.commissionReversedMinor))) })} />
        ) : (
          <StatCard label={t("reports.staff.appointments")} value={formatNumber(sum((r) => r.appointments), locale)} />
        )}
        <StatCard label={t("reports.staff.tips")} value={org.money(sum((r) => r.tipsMinor))} />
      </KpiGrid>
      <Section title={t("reports.staff.revenueByStaff")}>
        <BarList
          items={rows.filter((r) => r.revenueMinor > 0).slice(0, 10).map((r) => ({ key: r.staffId, label: r.name, value: r.revenueMinor, display: org.money(r.revenueMinor) }))}
          empty={<p className="text-sm text-muted-foreground">{t("reports.noData")}</p>}
        />
      </Section>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.staffId}
        searchText={(r) => r.name}
        searchPlaceholder={t("reports.staff.search")}
        initialVisibility={{ serviceRevenue: false, productRevenue: false, completed: false }}
        csv={csv(csvColumns)}
        empty={<EmptyState icon={UserRoundIcon} title={t("reports.staff.empty")} description={t("reports.emptyHint")} />}
        mobileCard={(r) => (
          <div className="grid gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{r.name}</span>
              <span className="shrink-0 font-semibold tabular">{org.money(r.revenueMinor)}</span>
            </div>
            <p className="text-[14px] text-muted-foreground tabular">
              {t("reports.staff.servicesCount", { count: formatNumber(r.services, locale) })}
              {showCommission ? ` · ${t("reports.staff.commission")} ${org.money(money(r.commissionMinor))}` : ""}
              {` · ${t("reports.staff.noShows")} ${r.noShows}`}
            </p>
          </div>
        )}
      />
      <Notice>{t("reports.staff.note")}</Notice>
    </div>
  );
}
