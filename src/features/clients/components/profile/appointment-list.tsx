"use client";

import { CalendarIcon, CalendarPlusIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import type { AppointmentDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { AppointmentStatusBadge } from "../status-badges";

/** One appointment: date block, services with staff, branch, total and status. */
export function AppointmentRow({ appointment: a, compact }: { appointment: AppointmentDTO; compact?: boolean }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const multiBranch = org.branches.length > 1;
  const services = a.items.map((i) => (i.staffName ? `${i.serviceName} · ${i.staffName}` : i.serviceName));
  const shown = compact ? services.slice(0, 2) : services;
  const muted = a.status === "cancelled" || a.status === "no_show";

  return (
    <Link
      href={`/appointments?date=${a.dateKey}&appointment=${a.id}`}
      className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
    >
      <div className="grid w-12 shrink-0 place-items-center rounded-lg border bg-background py-1 text-center leading-tight">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">{org.date(a.startAt, "weekday")}</span>
        <span className="text-lg font-semibold tabular">{org.date(a.startAt, "dayNumber")}</span>
      </div>
      <div className={cn("grid min-w-0 flex-1 gap-0.5", muted && "opacity-70")}>
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-medium tabular">{org.date(a.startAt, "time")}</span>
          <span className="text-muted-foreground">{org.date(a.startAt, "monthYear")}</span>
          {multiBranch ? <span className="text-[13px] text-muted-foreground">· {org.branchName(a.branchId)}</span> : null}
        </div>
        <div className="truncate text-[13px] text-muted-foreground">
          {shown.length === 0
            ? "—"
            : shown.map((s, i) => (
                <span key={i}>
                  {i > 0 ? (locale === "ar" ? "، " : ", ") : null}
                  <bdi>{s}</bdi>
                </span>
              ))}
          {services.length > shown.length ? ` ${t("clients.appointments.more", { count: services.length - shown.length })}` : ""}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <AppointmentStatusBadge status={a.status} />
        <span className="text-[13px] font-medium tabular">{org.money(a.totalMinor)}</span>
      </div>
    </Link>
  );
}

export function AppointmentsTab({ clientId, appointments, archived }: { clientId: string; appointments: AppointmentDTO[]; archived: boolean }) {
  const { t } = useI18n();
  const org = useOrg();
  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border bg-card shadow-sm">
        <EmptyState
          icon={CalendarIcon}
          title={t("clients.appointments.empty")}
          description={!archived && org.can("create_appointments") ? t("clients.appointments.emptyHint") : undefined}
          action={
            !archived && org.can("create_appointments") ? (
              <Button asChild>
                <Link href={`/appointments?new=1&client=${clientId}`}>
                  <CalendarPlusIcon />
                  {t("clients.overview.bookNow")}
                </Link>
              </Button>
            ) : null
          }
        />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <ul className="divide-y">
        {appointments.map((a) => (
          <li key={a.id}>
            <AppointmentRow appointment={a} />
          </li>
        ))}
      </ul>
    </div>
  );
}
