"use client";

import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";
import type { AppointmentDTO } from "@/lib/types";

/** Compact day overview above the calendar: how the day is going at a glance. */
export function DaySummary({ appointments }: { appointments: AppointmentDTO[] }) {
  const { t } = useI18n();
  const org = useOrg();
  const active = appointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
  const arrived = active.filter((a) => a.status === "checked_in" || a.status === "in_service").length;
  const done = active.filter((a) => a.status === "completed").length;
  const value = active.reduce((s, a) => s + a.totalMinor, 0);
  const items = [
    { label: t("appointments.summaryBar.booked"), value: String(active.length), color: "var(--status-booked)" },
    { label: t("appointments.summaryBar.arrived"), value: String(arrived), color: "var(--status-checked_in)" },
    { label: t("appointments.summaryBar.done"), value: String(done), color: "var(--status-completed)" },
    { label: t("appointments.summaryBar.value"), value: org.money(value), color: "var(--gold)" },
  ];
  return (
    <dl className="mb-4 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-xs">
          <span aria-hidden className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: i.color }} />
          <div className="min-w-0">
            <dt className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{i.label}</dt>
            <dd className="font-display text-[22px] font-semibold leading-tight tabular">{i.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
