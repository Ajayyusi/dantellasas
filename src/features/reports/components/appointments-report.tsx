"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarDaysIcon } from "lucide-react";
import { useCallback, useMemo } from "react";

import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { AppointmentStatusBadge } from "@/features/appointments/components/status-badge";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/types";

import type { AppointmentRow, AppointmentsReport as Data } from "../types";
import { AppointmentHeat } from "./appointment-heat";
import { BarList, KpiGrid, Notice, Section, useReportCsv, usePercent } from "./report-parts";

/** Default cancellation reasons are stored in English; translate those, keep custom ones as typed. */
const DEFAULT_REASONS: Record<string, "clientRequest" | "clientUnwell" | "staffUnavailable" | "rescheduled" | "mistake"> = {
  "Client request": "clientRequest",
  "Client unwell": "clientUnwell",
  "Staff unavailable": "staffUnavailable",
  Rescheduled: "rescheduled",
  "Booked by mistake": "mistake",
};

export function AppointmentsReport({ data, range }: { data: Data; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const pct = usePercent();
  const csv = useReportCsv("appointments", range);
  const multiBranch = org.branches.length > 1 && !org.branchId;
  const reasonLabel = useCallback(
    (reason: string) => {
      if (!reason) return t("reports.appointments.noReason");
      const key = DEFAULT_REASONS[reason];
      return key ? t(`reports.appointments.reasons.${key}`) : reason;
    },
    [t],
  );
  const status = (s: AppointmentStatus) => t(`appointments.status.${s}`);

  const columns = useMemo<ColumnDef<AppointmentRow, unknown>[]>(() => {
    const cols: ColumnDef<AppointmentRow, unknown>[] = [
      { id: "date", header: t("common.date"), accessorFn: (r) => r.startAt, cell: ({ row }) => <span className="whitespace-nowrap tabular">{org.date(row.original.startAt, "datetime")}</span> },
      { id: "client", header: t("common.client"), accessorFn: (r) => r.clientName, cell: ({ row }) => <span className="font-medium">{row.original.clientName || t("common.walkIn")}</span> },
      { id: "services", header: t("common.services"), accessorFn: (r) => r.services, cell: ({ getValue }) => <span className="block max-w-56 truncate text-muted-foreground">{getValue() as string}</span> },
      { id: "staff", header: t("common.staff"), accessorFn: (r) => r.staff, cell: ({ getValue }) => <span className="block max-w-40 truncate text-muted-foreground">{getValue() as string}</span> },
    ];
    if (multiBranch) cols.push({ id: "branch", header: t("common.branch"), accessorFn: (r) => org.branchName(r.branchId) });
    cols.push(
      { id: "source", header: t("reports.appointments.source"), accessorFn: (r) => t(`appointments.source.${r.source}`) },
      { id: "status", header: t("common.status"), accessorFn: (r) => r.status, cell: ({ row }) => <AppointmentStatusBadge status={row.original.status} /> },
      { id: "reason", header: t("reports.appointments.reason"), accessorFn: (r) => (r.status === "cancelled" ? reasonLabel(r.reason) : ""), cell: ({ getValue }) => <span className="text-muted-foreground">{(getValue() as string) || "—"}</span> },
      { id: "value", header: t("reports.appointments.value"), accessorFn: (r) => r.valueMinor, cell: ({ row }) => org.money(row.original.valueMinor), meta: { align: "end" } },
    );
    return cols;
  }, [t, org, multiBranch, reasonLabel]);
  const facets = useMemo<FacetFilter<AppointmentRow>[]>(
    () => [
      {
        id: "status",
        label: t("common.status"),
        options: APPOINTMENT_STATUSES.filter((s) => data.byStatus[s] > 0).map((s) => ({ value: s, label: t(`appointments.status.${s}`) })),
        match: (r, v) => r.status === v,
      },
      {
        id: "source",
        label: t("reports.appointments.source"),
        options: data.sources.map((s) => ({ value: s.source, label: t(`appointments.source.${s.source}`) })),
        match: (r, v) => r.source === v,
      },
    ],
    [t, data.byStatus, data.sources],
  );
  const csvColumns = useMemo(
    () => [
      { header: t("common.date"), value: (r: AppointmentRow) => org.date(r.startAt, "datetime") },
      { header: t("common.client"), value: (r: AppointmentRow) => r.clientName },
      { header: t("common.services"), value: (r: AppointmentRow) => r.services },
      { header: t("common.staff"), value: (r: AppointmentRow) => r.staff },
      { header: t("common.branch"), value: (r: AppointmentRow) => org.branchName(r.branchId) },
      { header: t("reports.appointments.source"), value: (r: AppointmentRow) => t(`appointments.source.${r.source}`) },
      { header: t("common.status"), value: (r: AppointmentRow) => t(`appointments.status.${r.status}`) },
      { header: t("reports.appointments.reason"), value: (r: AppointmentRow) => (r.status === "cancelled" ? reasonLabel(r.reason) : "") },
      { header: t("reports.appointments.value"), value: (r: AppointmentRow) => csvMoney(r.valueMinor) },
    ],
    [t, org, reasonLabel],
  );
  const noData = <p className="text-sm text-muted-foreground">{t("reports.noData")}</p>;

  return (
    <div className="grid grid-cols-1 gap-6">
      <KpiGrid className="mb-0">
        <StatCard label={t("reports.appointments.total")} value={formatNumber(data.total, locale)} hint={t("reports.appointments.completedHint", { count: formatNumber(data.byStatus.completed, locale) })} />
        <StatCard label={t("reports.appointments.completionRate")} value={pct(data.completionRate)} />
        <StatCard label={t("reports.appointments.cancelRate")} value={pct(data.cancelRate)} hint={t("reports.appointments.countHint", { count: formatNumber(data.byStatus.cancelled, locale) })} />
        <StatCard label={t("reports.appointments.noShowRate")} value={pct(data.noShowRate)} hint={t("reports.appointments.countHint", { count: formatNumber(data.byStatus.no_show, locale) })} />
      </KpiGrid>
      <div className="grid gap-6 xl:grid-cols-3">
        <Section title={t("reports.appointments.byStatus")}>
          <BarList items={APPOINTMENT_STATUSES.filter((s) => data.byStatus[s] > 0).map((s) => ({ key: s, label: status(s), value: data.byStatus[s], display: formatNumber(data.byStatus[s], locale) }))} empty={noData} />
        </Section>
        <Section title={t("reports.appointments.reasonsTitle")}>
          <BarList items={data.reasons.map((r) => ({ key: r.reason || "none", label: reasonLabel(r.reason), value: r.count, display: formatNumber(r.count, locale) }))} empty={noData} />
        </Section>
        <Section title={t("reports.appointments.bySource")} description={t("reports.appointments.bySourceHint")}>
          <BarList
            items={data.sources.map((s) => ({ key: s.source, label: t(`appointments.source.${s.source}`), value: s.count, display: formatNumber(s.count, locale), hint: org.money(s.valueMinor) }))}
            empty={noData}
          />
        </Section>
      </div>
      <Section title={t("reports.appointments.heat")} description={t("reports.appointments.heatHint")}>
        <AppointmentHeat heat={data.heat} hours={data.hours} />
      </Section>
      <DataTable
        data={data.rows}
        columns={columns}
        facets={facets}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.clientName} ${r.services} ${r.staff}`}
        searchPlaceholder={t("reports.appointments.search")}
        initialVisibility={{ source: false, reason: false }}
        csv={csv(csvColumns)}
        empty={<EmptyState icon={CalendarDaysIcon} title={t("reports.appointments.empty")} description={t("reports.emptyHint")} />}
        mobileCard={(r) => (
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{r.clientName || t("common.walkIn")}</span>
              <AppointmentStatusBadge status={r.status} />
            </div>
            <p className="truncate text-[13px] text-muted-foreground">
              {org.date(r.startAt, "datetime")} · {r.services}
            </p>
          </div>
        )}
      />
      <Notice>{t("reports.appointments.note")}</Notice>
    </div>
  );
}
