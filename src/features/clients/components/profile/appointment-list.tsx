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
      className="flex items-center gap-3.5 px-5 py-3.5 outline-none transition-colors hover:bg-primary-soft/55 focus-visible:bg-primary-soft/55"
    >
      <div className="grid w-14 shrink-0 place-items-center rounded-xl border bg-gradient-to-b from-primary-soft to-card py-1.5 text-center leading-tight">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-primary">{org.date(a.startAt, "weekday")}</span>
        <span className="font-display text-[22px] font-semibold tabular">{org.date(a.startAt, "dayNumber")}</span>
      </div>
      <div className={cn("grid min-w-0 flex-1 gap-0.5", muted && "opacity-70")}>
        <div className="flex flex-wrap items-center gap-x-2 text-[15px]">
          <span className="font-semibold tabular">{org.date(a.startAt, "time")}</span>
          <span className="text-muted-foreground">{org.date(a.startAt, "monthYear")}</span>
          {multiBranch ? <span className="text-[14px] text-muted-foreground">· {org.branchName(a.branchId)}</span> : null}
        </div>
        <div className="truncate text-[14px] text-muted-foreground">
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
        <div className="mt-1 flex items-center justify-between gap-2 sm:hidden">
          <AppointmentStatusBadge status={a.status} />
          <span className="text-[15px] font-semibold tabular">{org.money(a.totalMinor)}</span>
        </div>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <AppointmentStatusBadge status={a.status} />
        <span className="text-[15px] font-semibold tabular">{org.money(a.totalMinor)}</span>
      </div>
    </Link>
  );
}

export function AppointmentsTab({ clientId, appointments, archived }: { clientId: string; appointments: AppointmentDTO[]; archived: boolean }) {
  const { t } = useI18n();
  const org = useOrg();
  if (appointments.length === 0) {
    return (
      <div className="rounded-2xl border bg-card shadow-sm">
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
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
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
