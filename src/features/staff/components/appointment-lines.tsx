"use client";

import { CalendarIcon } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/i18n/format";
import type { AppointmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

import type { StaffLine } from "../types";

const STATUS_VARIANT: Record<AppointmentStatus, "neutral" | "primary" | "success" | "warning" | "danger" | "info"> = {
  booked: "neutral",
  confirmed: "primary",
  checked_in: "info",
  in_service: "warning",
  completed: "success",
  cancelled: "danger",
  no_show: "danger",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useI18n();
  return <Badge variant={STATUS_VARIANT[status]}>{t(`staff.apptStatus.${status}`)}</Badge>;
}

/** Compact list of appointment lines (time, service, client, status, price). */
export function AppointmentLines({
  lines,
  showDate,
  empty,
}: {
  lines: StaffLine[];
  showDate?: boolean;
  empty: string;
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  if (lines.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState compact icon={CalendarIcon} title={empty} />
      </div>
    );
  }
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {lines.map((l) => {
        const muted = l.status === "cancelled" || l.status === "no_show";
        return (
          <li key={l.id} className={cn("flex items-center gap-4 px-4 py-3", muted && "opacity-60")}>
            <div className="w-24 shrink-0">
              {showDate ? <div className="text-[14px] text-muted-foreground">{org.dateKey(l.dateKey, "weekdayDate")}</div> : null}
              <div className="text-sm font-medium tabular">{org.date(l.startAt, "time")}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("truncate text-sm font-medium", muted && "line-through")}>{l.serviceName}</div>
              <div className="truncate text-[14px] text-muted-foreground">
                {l.clientName || t("common.walkIn")} · {formatDuration(l.durationMin, locale)}
                {org.branches.length > 1 ? ` · ${org.branchName(l.branchId)}` : ""}
              </div>
            </div>
            <AppointmentStatusBadge status={l.status} />
            <div className="hidden w-24 text-end text-sm tabular sm:block">{org.money(l.priceMinor)}</div>
          </li>
        );
      })}
    </ul>
  );
}
