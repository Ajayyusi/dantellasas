"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ClockIcon, PencilLineIcon } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/states";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import type { AttendanceDTO } from "@/lib/types";

import { formatMinutes, workedMinutes } from "../utils";
import { CorrectionDialog } from "./correction-dialog";

function breakMinutes(r: AttendanceDTO, now: number): number {
  return r.breaks.reduce((sum, b) => {
    if (!b.startAt) return sum;
    const end = b.endAt ? Date.parse(b.endAt) : r.clockOutAt ? Date.parse(r.clockOutAt) : now;
    return sum + Math.max(0, Math.floor((end - Date.parse(b.startAt)) / 60000));
  }, 0);
}

/** Attendance records with status flags and (for managers) corrections. */
export function RecordsTable({
  records,
  today,
  now,
  showStaff = true,
  toolbar,
  csvName = "attendance",
}: {
  records: AttendanceDTO[];
  today: string;
  now: number;
  showStaff?: boolean;
  toolbar?: React.ReactNode;
  csvName?: string;
}) {
  const { t } = useI18n();
  const org = useOrg();
  const canCorrect = org.can("manage_attendance");
  const [editing, setEditing] = useState<AttendanceDTO | null>(null);
  const worked = (r: AttendanceDTO) => (r.status === "closed" ? r.workedMinutes : workedMinutes(r, now));

  const columns: ColumnDef<AttendanceDTO, unknown>[] = [
    {
      id: "date",
      header: t("common.date"),
      accessorFn: (r) => r.dateKey,
      cell: ({ row: { original: r } }) => <span className="whitespace-nowrap">{org.dateKey(r.dateKey, "weekdayDate")}</span>,
    },
  ];
  if (showStaff) columns.push({ id: "staff", header: t("common.staff"), accessorFn: (r) => r.staffName, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> });
  if (org.branches.length > 1) columns.push({ id: "branch", header: t("common.branch"), accessorFn: (r) => org.branchName(r.branchId) });
  columns.push(
    {
      id: "in",
      header: t("attendance.columns.clockIn"),
      accessorFn: (r) => r.clockInAt ?? "",
      cell: ({ row: { original: r } }) => <span className="tabular">{org.date(r.clockInAt, "time")}</span>,
    },
    {
      id: "out",
      header: t("attendance.columns.clockOut"),
      accessorFn: (r) => r.clockOutAt ?? "",
      cell: ({ row: { original: r } }) => <span className="tabular">{r.clockOutAt ? org.date(r.clockOutAt, "time") : "—"}</span>,
    },
    {
      id: "breaks",
      header: t("attendance.columns.breaks"),
      accessorFn: (r) => breakMinutes(r, now),
      meta: { align: "end" },
      cell: ({ row: { original: r } }) => (r.breaks.length ? formatMinutes(breakMinutes(r, now)) : "—"),
    },
    {
      id: "worked",
      header: t("attendance.columns.worked"),
      accessorFn: (r) => worked(r),
      meta: { align: "end" },
      cell: ({ row: { original: r } }) => <span className="font-medium">{formatMinutes(worked(r))}</span>,
    },
    {
      id: "status",
      header: t("common.status"),
      enableSorting: false,
      accessorFn: (r) => r.status,
      cell: ({ row: { original: r } }) => (
        <div className="flex flex-wrap gap-1">
          {r.status === "open" && r.dateKey < today ? (
            <Badge variant="danger">{t("attendance.flags.missingClockOut")}</Badge>
          ) : r.status === "open" ? (
            <Badge variant="success">{t("attendance.flags.open")}</Badge>
          ) : (
            <Badge variant="neutral">{t("attendance.flags.closed")}</Badge>
          )}
          {r.corrections.length > 0 ? (
            <Badge variant="info" title={r.corrections.map((c) => `${c.byName}: ${c.reason}`).join("\n")}>
              {t("attendance.flags.corrected")}
            </Badge>
          ) : null}
        </div>
      ),
    },
  );
  if (canCorrect) {
    columns.push({
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row: { original: r } }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
            <PencilLineIcon />
            {t("attendance.correct.action")}
          </Button>
        </div>
      ),
    });
  }

  const total = records.reduce((s, r) => s + worked(r), 0);

  return (
    <>
      <DataTable
        data={records}
        columns={columns}
        getRowId={(r) => r.id}
        searchText={showStaff ? (r) => r.staffName : undefined}
        searchPlaceholder={t("attendance.records.search")}
        toolbar={toolbar}
        pageSize={25}
        csv={
          org.can("export_data")
            ? {
          filename: csvName,
          columns: [
            { header: t("common.date"), value: (r) => r.dateKey },
            { header: t("common.staff"), value: (r) => r.staffName },
            { header: t("common.branch"), value: (r) => org.branchName(r.branchId) },
            { header: t("attendance.columns.clockIn"), value: (r) => org.date(r.clockInAt, "time") },
            { header: t("attendance.columns.clockOut"), value: (r) => (r.clockOutAt ? org.date(r.clockOutAt, "time") : "") },
            { header: t("attendance.columns.breaks"), value: (r) => breakMinutes(r, now) },
            { header: t("attendance.columns.workedMinutes"), value: (r) => worked(r) },
            { header: t("common.status"), value: (r) => r.status },
          ],
              }
            : undefined
        }
        empty={<EmptyState compact icon={ClockIcon} title={t("attendance.records.empty")} description={t("attendance.records.emptyHint")} />}
        footer={
          records.length > 0 ? (
            <div className="flex justify-end gap-2 border-t bg-muted/30 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{t("attendance.records.totalWorked")}</span>
              <span className="font-semibold tabular">{formatMinutes(total)}</span>
            </div>
          ) : undefined
        }
      />
      <CorrectionDialog record={editing} onOpenChange={(o) => !o && setEditing(null)} />
    </>
  );
}
