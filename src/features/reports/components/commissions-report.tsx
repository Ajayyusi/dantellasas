"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HandCoinsIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";

import type { CommissionLine, CommissionsReport as Data, CommissionStaffRow } from "../types";
import { KpiGrid, Notice, SubHeading, useReportCsv } from "./report-parts";

export function CommissionsReport({ data, range }: { data: Data; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const csv = useReportCsv("commissions", range);
  const canOpenSale = org.can("view_sales");
  const earned = data.staff.reduce((s, r) => s + r.earnedMinor, 0);
  const reversed = data.staff.reduce((s, r) => s + r.reversedMinor, 0);

  const staffColumns = useMemo<ColumnDef<CommissionStaffRow, unknown>[]>(
    () => [
      { id: "staff", header: t("common.staff"), accessorFn: (r) => r.name, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
      { id: "lines", header: t("reports.commissions.lines"), accessorFn: (r) => r.lines, meta: { align: "end" } },
      { id: "base", header: t("reports.commissions.base"), accessorFn: (r) => r.baseMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.baseMinor)}</span>, meta: { align: "end" } },
      { id: "earned", header: t("reports.commissions.earned"), accessorFn: (r) => r.earnedMinor, cell: ({ row }) => org.money(row.original.earnedMinor), meta: { align: "end" } },
      { id: "reversed", header: t("reports.commissions.reversed"), accessorFn: (r) => r.reversedMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.reversedMinor)}</span>, meta: { align: "end" } },
      { id: "net", header: t("reports.commissions.net"), accessorFn: (r) => r.netMinor, cell: ({ row }) => <span className="font-semibold">{org.money(row.original.netMinor)}</span>, meta: { align: "end" } },
    ],
    [t, org],
  );
  const staffCsv = useMemo(
    () => [
      { header: t("common.staff"), value: (r: CommissionStaffRow) => r.name },
      { header: t("reports.commissions.lines"), value: (r: CommissionStaffRow) => r.lines },
      { header: t("reports.commissions.base"), value: (r: CommissionStaffRow) => csvMoney(r.baseMinor) },
      { header: t("reports.commissions.earned"), value: (r: CommissionStaffRow) => csvMoney(r.earnedMinor) },
      { header: t("reports.commissions.reversed"), value: (r: CommissionStaffRow) => csvMoney(r.reversedMinor) },
      { header: t("reports.commissions.net"), value: (r: CommissionStaffRow) => csvMoney(r.netMinor) },
    ],
    [t],
  );

  const lineColumns = useMemo<ColumnDef<CommissionLine, unknown>[]>(
    () => [
      { id: "date", header: t("common.date"), accessorFn: (r) => r.dateKey, cell: ({ row }) => <span className="whitespace-nowrap tabular text-muted-foreground">{org.dateKey(row.original.dateKey)}</span> },
      {
        id: "document",
        header: t("reports.commissions.document"),
        accessorFn: (r) => r.creditNumber || r.invoiceNumber,
        cell: ({ row }) => {
          const r = row.original;
          const text = r.creditNumber ? `${r.creditNumber} (${r.invoiceNumber})` : r.invoiceNumber;
          return canOpenSale ? (
            <Link href={`/sales/${r.txId}`} className="tabular underline-offset-2 hover:underline">
              {text}
            </Link>
          ) : (
            <span className="tabular">{text}</span>
          );
        },
      },
      { id: "staff", header: t("common.staff"), accessorFn: (r) => r.staffName },
      {
        id: "item",
        header: t("reports.commissions.item"),
        accessorFn: (r) => r.itemName,
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="truncate">{row.original.itemName}</span>
            {row.original.kind === "reversal" ? <Badge variant="danger">{t("reports.commissions.reversal")}</Badge> : null}
          </span>
        ),
      },
      { id: "qty", header: t("common.quantity"), accessorFn: (r) => r.quantity, meta: { align: "end" } },
      { id: "base", header: t("reports.commissions.base"), accessorFn: (r) => r.baseMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.baseMinor)}</span>, meta: { align: "end" } },
      { id: "commission", header: t("reports.commissions.commission"), accessorFn: (r) => r.commissionMinor, cell: ({ row }) => <span className="font-medium">{org.money(row.original.commissionMinor)}</span>, meta: { align: "end" } },
    ],
    [t, org, canOpenSale],
  );
  const lineFacets = useMemo<FacetFilter<CommissionLine>[]>(
    () => [
      { id: "staff", label: t("common.staff"), options: data.staff.map((s) => ({ value: s.staffId, label: s.name })), match: (r, v) => r.staffId === v },
      {
        id: "kind",
        label: t("reports.commissions.kind"),
        options: [
          { value: "sale", label: t("reports.commissions.sale") },
          { value: "reversal", label: t("reports.commissions.reversal") },
        ],
        match: (r, v) => r.kind === v,
      },
    ],
    [t, data.staff],
  );
  const lineCsv = useMemo(
    () => [
      { header: t("common.date"), value: (r: CommissionLine) => r.dateKey },
      { header: t("reports.commissions.invoice"), value: (r: CommissionLine) => r.invoiceNumber },
      { header: t("reports.commissions.creditNote"), value: (r: CommissionLine) => r.creditNumber },
      { header: t("common.staff"), value: (r: CommissionLine) => r.staffName },
      { header: t("reports.commissions.item"), value: (r: CommissionLine) => r.itemName },
      { header: t("reports.commissions.itemType"), value: (r: CommissionLine) => t(`reports.itemTypes.${r.itemType}`) },
      { header: t("common.quantity"), value: (r: CommissionLine) => r.quantity },
      { header: t("reports.commissions.base"), value: (r: CommissionLine) => csvMoney(r.baseMinor) },
      { header: t("reports.commissions.commission"), value: (r: CommissionLine) => csvMoney(r.commissionMinor) },
    ],
    [t],
  );
  const empty = <EmptyState icon={HandCoinsIcon} title={t("reports.commissions.empty")} description={t("reports.emptyHint")} />;

  return (
    <div className="grid grid-cols-1 gap-6">
      <KpiGrid className="mb-0 xl:grid-cols-3">
        <StatCard label={t("reports.commissions.net")} value={org.money(earned - reversed)} hint={t("reports.commissions.staffCount", { count: formatNumber(data.staff.length, locale) })} />
        <StatCard label={t("reports.commissions.earned")} value={org.money(earned)} />
        <StatCard label={t("reports.commissions.reversed")} value={org.money(reversed)} />
      </KpiGrid>
      <div>
        <SubHeading title={t("reports.commissions.summary")} description={t("reports.commissions.summaryHint")} />
        <DataTable
          data={data.staff}
          columns={staffColumns}
          getRowId={(r) => r.staffId}
          pageSize={10}
          csv={csv(staffCsv, "summary")}
          empty={empty}
          mobileCard={(r) => (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.name}</span>
                <span className="text-[14px] text-muted-foreground tabular">
                  {t("reports.commissions.earned")} {org.money(r.earnedMinor)}
                  {r.reversedMinor ? ` · ${t("reports.commissions.reversed")} ${org.money(r.reversedMinor)}` : ""}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular">{org.money(r.netMinor)}</span>
            </div>
          )}
        />
      </div>
      <div>
        <SubHeading title={t("reports.commissions.detail")} />
        <DataTable
          data={data.lines}
          columns={lineColumns}
          facets={lineFacets}
          getRowId={(r) => r.id}
          searchText={(r) => `${r.invoiceNumber} ${r.creditNumber} ${r.staffName} ${r.itemName}`}
          searchPlaceholder={t("reports.commissions.search")}
          initialSort={[{ id: "date", desc: true }]}
          csv={csv(lineCsv, "lines")}
          empty={empty}
          mobileCard={(r) => (
            <div className="grid gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{r.itemName}</span>
                <span className="shrink-0 font-semibold tabular">{org.money(r.commissionMinor)}</span>
              </div>
              <p className="truncate text-[14px] text-muted-foreground tabular">
                {r.staffName} · {r.creditNumber || r.invoiceNumber} · {org.dateKey(r.dateKey)}
              </p>
            </div>
          )}
        />
      </div>
      <Notice>{t("reports.commissions.note")}</Notice>
    </div>
  );
}
