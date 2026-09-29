"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarDaysIcon } from "lucide-react";
import { useMemo } from "react";

import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";
import { APPOINTMENT_STATUSES, type AppointmentDTO } from "@/lib/types";

import { AppointmentStatusBadge } from "./status-badge";

export function AppointmentListView({ appointments, onOpen }: { appointments: AppointmentDTO[]; onOpen: (a: AppointmentDTO) => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const staffNames = (a: AppointmentDTO) => [...new Set(a.items.map((i) => i.staffName))].join(", ");
  const serviceNames = (a: AppointmentDTO) => a.items.map((i) => i.serviceName).join(", ");

  const columns = useMemo<ColumnDef<AppointmentDTO, unknown>[]>(
    () => [
      {
        id: "time",
        header: t("appointments.list.time"),
        accessorFn: (a) => a.startAt,
        cell: ({ row }) => (
          <span className="tabular">
            {org.date(row.original.startAt, "time")}–{org.date(row.original.endAt, "time")}
          </span>
        ),
      },
      {
        id: "client",
        header: t("appointments.list.client"),
        accessorFn: (a) => a.clientName,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.clientName}</div>
            {row.original.clientPhone ? (
              <div className="text-xs text-muted-foreground" dir="ltr">
                {row.original.clientPhone}
              </div>
            ) : null}
          </div>
        ),
      },
      { id: "services", header: t("appointments.list.services"), accessorFn: serviceNames, cell: ({ getValue }) => <span className="block max-w-72 truncate">{String(getValue())}</span> },
      { id: "staff", header: t("appointments.list.staff"), accessorFn: staffNames },
      {
        id: "status",
        header: t("appointments.list.status"),
        accessorFn: (a) => a.status,
        cell: ({ row }) => <AppointmentStatusBadge status={row.original.status} />,
      },
      {
        id: "total",
        header: t("appointments.list.total"),
        accessorFn: (a) => a.totalMinor,
        meta: { align: "end" },
        cell: ({ row }) => org.money(row.original.totalMinor),
      },
    ],
    [t, org],
  );

  return (
    <DataTable
      data={appointments}
      columns={columns}
      getRowId={(a) => a.id}
      onRowClick={onOpen}
      initialSort={[{ id: "time", desc: false }]}
      searchText={(a) => `${a.clientName} ${a.clientPhone} ${serviceNames(a)} ${staffNames(a)}`}
      facets={[
        {
          id: "status",
          label: t("appointments.list.status"),
          options: APPOINTMENT_STATUSES.map((s) => ({ value: s, label: t(`appointments.status.${s}`) })),
          match: (a, v) => a.status === v,
        },
      ]}
      csv={{
        filename: "appointments",
        columns: [
          { header: "Date", value: (a) => a.dateKey },
          { header: "Start", value: (a) => org.date(a.startAt, "time") },
          { header: "Client", value: (a) => a.clientName },
          { header: "Phone", value: (a) => a.clientPhone },
          { header: "Services", value: serviceNames },
          { header: "Staff", value: staffNames },
          { header: "Status", value: (a) => a.status },
          { header: "Total", value: (a) => csvMoney(a.totalMinor) },
        ],
      }}
      empty={<EmptyState compact icon={CalendarDaysIcon} title={t("appointments.emptyList")} />}
      mobileCard={(a) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">{a.clientName}</div>
            <div className="truncate text-[14px] text-muted-foreground">{serviceNames(a)}</div>
            <div className="text-xs tabular text-muted-foreground">
              {org.date(a.startAt, "time")} · {staffNames(a)}
            </div>
          </div>
          <AppointmentStatusBadge status={a.status} />
        </div>
      )}
    />
  );
}
