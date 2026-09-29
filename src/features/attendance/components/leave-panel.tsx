"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarOffIcon, CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/states";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { diffDays } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { LeaveDTO } from "@/lib/types";

import { decideLeaveAction } from "../actions";
import { LeaveDialog, type StaffPick } from "./leave-dialog";

const STATUS_VARIANT = { requested: "warning", approved: "success", rejected: "neutral" } as const;

export function LeaveStatusBadge({ status }: { status: LeaveDTO["status"] }) {
  const { t } = useI18n();
  return <Badge variant={STATUS_VARIANT[status]}>{t(`attendance.leaveStatus.${status}`)}</Badge>;
}

/**
 * Leave requests with approve/reject for managers. `staff` are the people the
 * viewer may request leave for (themselves, or anyone they manage).
 */
export function LeavePanel({
  leave,
  staff,
  defaultStaffId,
  today,
  showStaff = true,
}: {
  leave: LeaveDTO[];
  staff: StaffPick[];
  defaultStaffId: string | null;
  today: string;
  showStaff?: boolean;
}) {
  const { t, te } = useI18n();
  const org = useOrg();
  const canDecide = org.can("manage_staff") || org.can("manage_attendance");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(l: LeaveDTO, status: "approved" | "rejected") {
    setBusy(l.id);
    const res = await decideLeaveAction({ id: l.id, status }).catch(() => null);
    setBusy(null);
    if (res?.ok) toast.success(status === "approved" ? t("attendance.leave.approvedToast") : t("attendance.leave.rejectedToast"));
    else toast.error(te(res?.error ?? "errors.generic"));
  }

  const columns: ColumnDef<LeaveDTO, unknown>[] = [];
  if (showStaff) columns.push({ id: "staff", header: t("common.staff"), accessorFn: (l) => l.staffName, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> });
  columns.push(
    { id: "type", header: t("attendance.leave.type"), accessorFn: (l) => l.type, cell: ({ row: { original: l } }) => t(`attendance.leaveType.${l.type}`) },
    {
      id: "dates",
      header: t("attendance.leave.dates"),
      accessorFn: (l) => l.startDate,
      cell: ({ row: { original: l } }) => (
        <span className="whitespace-nowrap">
          {l.startDate === l.endDate ? org.dateKey(l.startDate) : `${org.dateKey(l.startDate, "monthDay")} – ${org.dateKey(l.endDate)}`}
        </span>
      ),
    },
    {
      id: "days",
      header: t("attendance.leave.days"),
      accessorFn: (l) => diffDays(l.startDate, l.endDate) + 1,
      meta: { align: "end" },
    },
    { id: "note", header: t("common.notes"), enableSorting: false, accessorFn: (l) => l.note, cell: ({ getValue }) => <span className="line-clamp-1 max-w-56 text-[14px] text-muted-foreground">{(getValue() as string) || "—"}</span> },
    { id: "status", header: t("common.status"), accessorFn: (l) => l.status, cell: ({ row: { original: l } }) => <LeaveStatusBadge status={l.status} /> },
  );
  if (canDecide) {
    columns.push({
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row: { original: l } }) =>
        l.status === "requested" ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" disabled={busy === l.id} onClick={() => decide(l, "approved")}>
              <CheckIcon />
              {t("attendance.leave.approve")}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy === l.id} onClick={() => decide(l, "rejected")}>
              <XIcon />
              {t("attendance.leave.reject")}
            </Button>
          </div>
        ) : null,
    });
  }

  return (
    <>
      <DataTable
        data={leave}
        columns={columns}
        getRowId={(l) => l.id}
        searchText={showStaff ? (l) => `${l.staffName} ${l.note}` : undefined}
        facets={[
          {
            id: "status",
            label: t("common.status"),
            options: (["requested", "approved", "rejected"] as const).map((s) => ({ value: s, label: t(`attendance.leaveStatus.${s}`) })),
            match: (l, v) => l.status === v,
          },
        ]}
        toolbar={
          staff.length > 0 ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <PlusIcon />
              {t("attendance.leave.new")}
            </Button>
          ) : null
        }
        empty={<EmptyState compact icon={CalendarOffIcon} title={t("attendance.leave.empty")} description={t("attendance.leave.emptyHint")} />}
      />
      <LeaveDialog open={open} onOpenChange={setOpen} staff={staff} defaultStaffId={defaultStaffId} today={today} />
    </>
  );
}
