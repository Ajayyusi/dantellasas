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
    { label: t("appointments.summaryBar.booked"), value: String(active.length) },
    { label: t("appointments.summaryBar.arrived"), value: String(arrived) },
    { label: t("appointments.summaryBar.done"), value: String(done) },
    { label: t("appointments.summaryBar.value"), value: org.money(value) },
  ];
  return (
    <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
      {items.map((i) => (
        <div key={i.label} className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">{i.label}</dt>
          <dd className="font-semibold tabular">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
