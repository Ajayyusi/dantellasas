"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { WalletCardsIcon } from "lucide-react";
import { useCallback, useMemo } from "react";

import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { useMethodLabel } from "@/features/sales/components/use-method-label";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";

import type { PaymentMethodRow, PaymentsReport as Data } from "../types";
import { BarList, KpiGrid, Notice, Section, useReportCsv, usePercent } from "./report-parts";

export function PaymentsReport({ data, range }: { data: Data; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const pct = usePercent();
  const methodLabel = useMethodLabel();
  const csv = useReportCsv("payment-methods", range);
  const labelOf = useCallback((r: PaymentMethodRow) => methodLabel({ id: r.methodId, label: r.label }) || r.methodId, [methodLabel]);
  const { totals } = data;
  const count = data.rows.reduce((s, r) => s + r.count, 0);

  const columns = useMemo<ColumnDef<PaymentMethodRow, unknown>[]>(
    () => [
      { id: "method", header: t("reports.payments.method"), accessorFn: labelOf, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
      { id: "count", header: t("reports.payments.count"), accessorFn: (r) => r.count, meta: { align: "end" } },
      { id: "collected", header: t("reports.payments.collected"), accessorFn: (r) => r.collectedMinor, cell: ({ row }) => org.money(row.original.collectedMinor), meta: { align: "end" } },
      { id: "refunded", header: t("reports.payments.refunded"), accessorFn: (r) => r.refundedMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.refundedMinor)}</span>, meta: { align: "end" } },
      { id: "net", header: t("reports.payments.net"), accessorFn: (r) => r.netMinor, cell: ({ row }) => <span className="font-medium">{org.money(row.original.netMinor)}</span>, meta: { align: "end" } },
      { id: "share", header: t("reports.share"), accessorFn: (r) => r.share, cell: ({ row }) => <span className="text-muted-foreground">{pct(row.original.share)}</span>, meta: { align: "end" } },
    ],
    [t, org, labelOf, pct],
  );
  const csvColumns = useMemo(
    () => [
      { header: t("reports.payments.method"), value: labelOf },
      { header: t("reports.payments.count"), value: (r: PaymentMethodRow) => r.count },
      { header: t("reports.payments.collected"), value: (r: PaymentMethodRow) => csvMoney(r.collectedMinor) },
      { header: t("reports.payments.refunded"), value: (r: PaymentMethodRow) => csvMoney(r.refundedMinor) },
      { header: t("reports.payments.net"), value: (r: PaymentMethodRow) => csvMoney(r.netMinor) },
    ],
    [t, labelOf],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <KpiGrid className="mb-0 xl:grid-cols-3">
        <StatCard label={t("reports.payments.net")} value={org.money(totals.netMinor)} />
        <StatCard label={t("reports.payments.collected")} value={org.money(totals.collectedMinor)} hint={t("reports.payments.countHint", { count: formatNumber(count, locale) })} />
        <StatCard label={t("reports.payments.refunded")} value={org.money(totals.refundedMinor)} />
      </KpiGrid>
      <Section title={t("reports.payments.byMethod")}>
        <BarList
          items={data.rows.map((r) => ({ key: r.methodId, label: labelOf(r), value: r.netMinor, display: org.money(r.netMinor) }))}
          empty={<p className="text-sm text-muted-foreground">{t("reports.noData")}</p>}
        />
      </Section>
      <DataTable
        data={data.rows}
        columns={columns}
        getRowId={(r) => r.methodId}
        csv={csv(csvColumns)}
        empty={<EmptyState icon={WalletCardsIcon} title={t("reports.payments.empty")} description={t("reports.emptyHint")} />}
        mobileCard={(r) => (
          <div className="grid gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{labelOf(r)}</span>
              <span className="shrink-0 font-semibold tabular">{org.money(r.netMinor)}</span>
            </div>
            <p className="text-[13px] text-muted-foreground tabular">
              {t("reports.payments.countHint", { count: formatNumber(r.count, locale) })}
              {r.refundedMinor ? ` · ${t("reports.payments.refunded")} ${org.money(r.refundedMinor)}` : ""}
            </p>
          </div>
        )}
      />
      <Notice>{t("reports.payments.note")}</Notice>
    </div>
  );
}
