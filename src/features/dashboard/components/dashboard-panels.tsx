"use client";

import { CalendarDaysIcon, ReceiptIcon } from "lucide-react";
import Link from "next/link";

import { SectionCard } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge, statusColor } from "@/features/appointments/components/status-badge";
import { TransactionStatusBadge } from "@/features/sales/components/transaction-status";
import { minutesOfDay } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatClock } from "@/lib/i18n/format";
import type { AppointmentDTO, TransactionDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import type { RankedRow } from "../aggregate";

export function RankedPanel({ title, rows }: { title: string; rows: RankedRow[] }) {
  const { t, tp, dir } = useI18n();
  const org = useOrg();
  const max = Math.max(1, ...rows.map((r) => r.revenueMinor));
  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.noData")}</p>
      ) : (
        <ol className="grid gap-4">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3.5">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular",
                  i === 0 ? "bg-gold-soft text-gold-foreground ring-1 ring-gold/50" : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <div className="grid min-w-0 flex-1 gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-semibold">{r.name}</span>
                  <span className="shrink-0 font-semibold tabular">{org.money(r.revenueMinor)}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(3, (r.revenueMinor / max) * 100)}%`,
                        background: `linear-gradient(${dir === "rtl" ? "270deg" : "90deg"}, var(--primary), color-mix(in oklch, var(--primary) 55%, var(--gold)))`,
                      }}
                    />
                  </div>
                  <span className="w-24 text-end text-xs text-muted-foreground tabular">{tp("dashboard.servicesCount", r.count)}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

export function TodayPanel({ appointments }: { appointments: AppointmentDTO[] }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const shown = appointments.slice(0, 7);
  return (
    <SectionCard
      title={t("dashboard.today.title")}
      actions={
        <Button variant="ghost" size="sm" asChild className="-my-1 text-primary">
          <Link href="/appointments">{t("dashboard.today.openCalendar")}</Link>
        </Button>
      }
      contentClassName="px-3 pb-4"
    >
      {shown.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarDaysIcon}
          title={t("dashboard.today.empty")}
          description={t("dashboard.today.emptyHint")}
          action={
            org.can("create_appointments") ? (
              <Button size="sm" asChild>
                <Link href="/appointments?new=1">{t("shell.newAppointment")}</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        // The pill only shows when the panel is wide; the timeline dot already carries the status colour.
        <ul className="@container relative grid min-w-0 grid-cols-1">
          <span aria-hidden className="absolute inset-y-4 start-[103px] w-px bg-border" />
          {shown.map((a) => (
            <li key={a.id}>
              <Link
                href={`/appointments?date=${a.dateKey}&appointment=${a.id}`}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors hover:bg-primary-soft/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="w-[74px] shrink-0 whitespace-nowrap text-[14px] font-semibold tabular">{formatClock(minutesOfDay(new Date(a.startAt), org.timezone), locale)}</span>
                <span
                  aria-hidden
                  className="relative z-10 size-3 shrink-0 rounded-full ring-4 ring-card"
                  style={{ backgroundColor: statusColor(a.status) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{a.clientName || t("pos.walkInSale")}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a.items.map((i) => i.serviceName).join(", ")} · {[...new Set(a.items.map((i) => i.staffName))].join(", ")}
                  </span>
                </span>
                <AppointmentStatusBadge status={a.status} className="hidden @[28rem]:inline-flex" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {appointments.length > shown.length ? (
        <p className="px-3 pt-2 text-xs font-medium text-muted-foreground">{t("dashboard.today.more", { count: appointments.length - shown.length })}</p>
      ) : null}
    </SectionCard>
  );
}

export function RecentSalesPanel({ transactions }: { transactions: TransactionDTO[] }) {
  const { t } = useI18n();
  const org = useOrg();
  return (
    <SectionCard
      title={t("dashboard.recent.title")}
      actions={
        <Button variant="ghost" size="sm" asChild className="-my-1 text-primary">
          <Link href="/sales">{t("dashboard.recent.viewAll")}</Link>
        </Button>
      }
      contentClassName="px-3 pb-4"
    >
      {transactions.length === 0 ? (
        <EmptyState compact icon={ReceiptIcon} title={t("dashboard.recent.empty")} />
      ) : (
        <ul className="grid min-w-0 grid-cols-1 gap-0.5 md:grid-cols-2 md:gap-x-4">
          {transactions.map((tx) => (
            <li key={tx.id}>
              <Link
                href={`/sales/${tx.id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors hover:bg-primary-soft/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PersonAvatar name={tx.clientName || t("pos.walkInSale")} className="size-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{tx.clientName || t("pos.walkInSale")}</span>
                  <span className="block text-xs text-muted-foreground tabular">
                    {tx.number} · {org.date(tx.createdAt, "time")}
                  </span>
                </span>
                {tx.status !== "paid" ? <TransactionStatusBadge status={tx.status} /> : null}
                <span className="text-sm font-semibold tabular">{org.money(tx.totalMinor + tx.tipMinor)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
