"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { LandmarkIcon } from "lucide-react";
import { useCallback, useMemo } from "react";

import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatPercent } from "@/lib/money";

import type { VatReport as Data, VatRow } from "../types";
import { KpiGrid, Notice, useReportCsv } from "./report-parts";

export function VatReport({ data, range }: { data: Data; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const csv = useReportCsv("vat", range);
  const trn = org.settings.business.trn;
  const describe = useCallback(
    (r: VatRow) => {
      const rate = formatPercent((r.rateBps ?? 0) / 10000, locale, 2);
      if (r.kind === "input") return t("reports.vat.rows.input");
      if (r.kind === "credit") return t("reports.vat.rows.credit", { rate });
      return r.rateBps ? t("reports.vat.rows.output", { rate }) : t("reports.vat.rows.zero");
    },
    [t, locale],
  );

  const columns = useMemo<ColumnDef<VatRow, unknown>[]>(
    () => [
      { id: "line", header: t("reports.vat.line"), accessorFn: describe, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>, enableSorting: false },
      {
        id: "taxable",
        header: t("reports.vat.taxable"),
        accessorFn: (r) => r.taxableMinor,
        cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.kind === "credit" ? -row.original.taxableMinor : row.original.taxableMinor)}</span>,
        meta: { align: "end" },
      },
      {
        id: "vat",
        header: t("common.tax"),
        accessorFn: (r) => r.vatMinor,
        cell: ({ row }) => <span className="font-medium">{org.money(row.original.kind === "output" ? row.original.vatMinor : -row.original.vatMinor)}</span>,
        meta: { align: "end" },
      },
    ],
    [t, org, describe],
  );
  const csvColumns = useMemo(
    () => [
      { header: t("reports.vat.line"), value: describe },
      { header: t("reports.vat.taxable"), value: (r: VatRow) => csvMoney(r.kind === "credit" ? -r.taxableMinor : r.taxableMinor) },
      { header: t("common.tax"), value: (r: VatRow) => csvMoney(r.kind === "output" ? r.vatMinor : -r.vatMinor) },
    ],
    [t, describe],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <Notice tone="warning">{t("reports.vat.disclaimer")}</Notice>
      <KpiGrid className="mb-0">
        <StatCard label={t("reports.vat.net")} value={org.money(data.netMinor)} hint={data.netMinor < 0 ? t("reports.vat.refundable") : t("reports.vat.payable")} />
        <StatCard label={t("reports.vat.output")} value={org.money(data.outputMinor)} />
        <StatCard label={t("reports.vat.credit")} value={org.money(data.creditMinor)} />
        <StatCard label={t("reports.vat.input")} value={org.money(data.inputMinor)} />
      </KpiGrid>
      <DataTable
        data={data.rows}
        columns={columns}
        getRowId={(r) => r.key}
        pageSize={25}
        csv={csv(csvColumns)}
        empty={<EmptyState icon={LandmarkIcon} title={t("reports.vat.empty")} description={t("reports.emptyHint")} />}
        footer={
          data.rows.length ? (
            <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 text-sm font-semibold">
              <span>{t("reports.vat.net")}</span>
              <span className="tabular">{org.money(data.netMinor)}</span>
            </div>
          ) : null
        }
        mobileCard={(r) => (
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="block truncate font-medium">{describe(r)}</span>
              <span className="text-[13px] text-muted-foreground tabular">
                {t("reports.vat.taxable")} {org.money(r.kind === "credit" ? -r.taxableMinor : r.taxableMinor)}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular">{org.money(r.kind === "output" ? r.vatMinor : -r.vatMinor)}</span>
          </div>
        )}
      />
      <Notice>
        {t("reports.vat.note")}
        {trn ? ` ${t("reports.vat.trn", { label: org.settings.tax.registrationLabel, trn })}` : ""}
      </Notice>
    </div>
  );
}
