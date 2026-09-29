"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { UsersIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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

import type { ClientRow, ClientsReport as Data } from "../types";
import { BarList, KpiGrid, Notice, Section, useReportCsv, usePercent } from "./report-parts";

export function ClientsReport({ data, range }: { data: Data; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const pct = usePercent();
  const csv = useReportCsv("clients", range);
  const { summary: s } = data;
  const canOpen = org.can("view_customers");
  const kind = (r: ClientRow) => (r.isNew ? t("reports.clients.new") : t("reports.clients.returning"));

  const columns = useMemo<ColumnDef<ClientRow, unknown>[]>(
    () => [
      {
        id: "client",
        header: t("common.client"),
        accessorFn: (r) => r.name,
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{row.original.name || "—"}</span>
            {row.original.isNew ? <Badge variant="primary">{t("reports.clients.new")}</Badge> : null}
          </span>
        ),
      },
      { id: "visits", header: t("reports.clients.visits"), accessorFn: (r) => r.visits, meta: { align: "end" } },
      { id: "invoices", header: t("reports.clients.invoices"), accessorFn: (r) => r.invoices, meta: { align: "end" } },
      { id: "spend", header: t("reports.clients.spend"), accessorFn: (r) => r.spendMinor, cell: ({ row }) => <span className="font-medium">{org.money(row.original.spendMinor)}</span>, meta: { align: "end" } },
      { id: "avg", header: t("reports.clients.avgTicket"), accessorFn: (r) => r.avgTicketMinor, cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.avgTicketMinor)}</span>, meta: { align: "end" } },
      { id: "first", header: t("reports.clients.firstVisit"), accessorFn: (r) => r.firstVisitKey ?? "", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground tabular">{row.original.firstVisitKey ? org.dateKey(row.original.firstVisitKey) : "—"}</span> },
      { id: "last", header: t("reports.clients.lastVisit"), accessorFn: (r) => r.lastVisitKey ?? "", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground tabular">{row.original.lastVisitKey ? org.dateKey(row.original.lastVisitKey) : "—"}</span> },
    ],
    [t, org],
  );
  const facets = useMemo<FacetFilter<ClientRow>[]>(
    () => [
      {
        id: "kind",
        label: t("reports.clients.kind"),
        options: [
          { value: "new", label: t("reports.clients.new") },
          { value: "returning", label: t("reports.clients.returning") },
        ],
        match: (r, v) => (v === "new") === r.isNew,
      },
    ],
    [t],
  );
  const csvColumns = useMemo(
    () => [
      { header: t("common.client"), value: (r: ClientRow) => r.name },
      { header: t("reports.clients.kind"), value: (r: ClientRow) => (r.isNew ? t("reports.clients.new") : t("reports.clients.returning")) },
      { header: t("reports.clients.visits"), value: (r: ClientRow) => r.visits },
      { header: t("reports.clients.invoices"), value: (r: ClientRow) => r.invoices },
      { header: t("reports.clients.spend"), value: (r: ClientRow) => csvMoney(r.spendMinor) },
      { header: t("reports.clients.avgTicket"), value: (r: ClientRow) => csvMoney(r.avgTicketMinor) },
      { header: t("reports.clients.firstVisit"), value: (r: ClientRow) => r.firstVisitKey ?? "" },
      { header: t("reports.clients.lastVisit"), value: (r: ClientRow) => r.lastVisitKey ?? "" },
    ],
    [t],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <KpiGrid className="mb-0">
        <StatCard label={t("reports.clients.served")} value={formatNumber(s.served, locale)} hint={s.walkInInvoices ? t("reports.clients.walkInHint", { count: formatNumber(s.walkInInvoices, locale) }) : undefined} />
        <StatCard label={t("reports.clients.new")} value={formatNumber(s.newCount, locale)} hint={pct(s.served ? s.newCount / s.served : null, 0)} />
        <StatCard label={t("reports.clients.returning")} value={formatNumber(s.returningCount, locale)} hint={pct(s.served ? s.returningCount / s.served : null, 0)} />
        <StatCard label={t("reports.clients.avgSpend")} value={org.money(s.served ? Math.round(s.spendMinor / s.served) : 0)} />
      </KpiGrid>
      <Section title={t("reports.clients.split")}>
        <BarList
          items={[
            { key: "new", label: t("reports.clients.new"), value: s.newCount, display: formatNumber(s.newCount, locale) },
            { key: "returning", label: t("reports.clients.returning"), value: s.returningCount, display: formatNumber(s.returningCount, locale) },
          ]}
        />
      </Section>
      <DataTable
        data={data.rows}
        columns={columns}
        facets={facets}
        getRowId={(r) => r.clientId}
        searchText={(r) => r.name}
        searchPlaceholder={t("reports.clients.search")}
        onRowClick={canOpen ? (r) => router.push(`/clients/${r.clientId}`) : undefined}
        initialVisibility={{ invoices: false }}
        csv={csv(csvColumns)}
        empty={<EmptyState icon={UsersIcon} title={t("reports.clients.empty")} description={t("reports.emptyHint")} />}
        mobileCard={(r) => (
          <div className="grid gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{r.name || "—"}</span>
              <span className="shrink-0 font-semibold tabular">{org.money(r.spendMinor)}</span>
            </div>
            <p className="text-[14px] text-muted-foreground">
              {kind(r)} · {t("reports.clients.visitsCount", { count: formatNumber(r.visits, locale) })}
            </p>
          </div>
        )}
      />
      <Notice>{t("reports.clients.note")}</Notice>
    </div>
  );
}
