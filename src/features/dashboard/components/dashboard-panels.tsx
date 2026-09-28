"use client";

import { CalendarDaysIcon, ReceiptIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentStatusBadge, statusColor } from "@/features/appointments/components/status-badge";
import { TransactionStatusBadge } from "@/features/sales/components/transaction-status";
import { minutesOfDay } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatClock } from "@/lib/i18n/format";
import { APPOINTMENT_STATUSES, type AppointmentDTO, type AppointmentStatus, type TransactionDTO } from "@/lib/types";

import type { RankedRow } from "../aggregate";

export function StatusPanel({ statuses }: { statuses: Partial<Record<AppointmentStatus, number>> }) {
  const { t } = useI18n();
  const total = Object.values(statuses).reduce((s, n) => s + (n ?? 0), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.statuses.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.statuses.empty")}</p>
        ) : (
          <>
            <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              {APPOINTMENT_STATUSES.map((s) =>
                statuses[s] ? <div key={s} style={{ width: `${((statuses[s] ?? 0) / total) * 100}%`, backgroundColor: statusColor(s) }} /> : null,
              )}
            </div>
            <ul className="grid gap-2 text-sm">
              {APPOINTMENT_STATUSES.filter((s) => statuses[s]).map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: statusColor(s) }} />
                  <span className="flex-1 text-muted-foreground">{t(`appointments.status.${s}`)}</span>
                  <span className="font-medium tabular">{statuses[s]}</span>
                  <span className="w-10 text-end text-xs tabular text-muted-foreground">{Math.round(((statuses[s] ?? 0) / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function RankedPanel({ title, rows }: { title: string; rows: RankedRow[] }) {
  const { t } = useI18n();
  const org = useOrg();
  const max = Math.max(1, ...rows.map((r) => r.revenueMinor));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.noData")}</p>
        ) : (
          <ol className="grid gap-3">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{r.name}</span>
                  <span className="shrink-0 tabular">{org.money(r.revenueMinor)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.max(2, (r.revenueMinor / max) * 100)}%` }} />
                  </div>
                  <span className="w-20 text-end text-xs text-muted-foreground tabular">{t("dashboard.servicesCount", { count: r.count })}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function TodayPanel({ appointments }: { appointments: AppointmentDTO[] }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const shown = appointments.slice(0, 7);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.today.title")}</CardTitle>
        <Button variant="ghost" size="sm" asChild className="-my-1">
          <Link href="/appointments">{t("dashboard.today.openCalendar")}</Link>
        </Button>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {shown.length === 0 ? (
          <EmptyState compact icon={CalendarDaysIcon} title={t("dashboard.today.empty")} description={t("dashboard.today.emptyHint")} />
        ) : (
          <ul className="grid min-w-0 grid-cols-1">
            {shown.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/appointments?date=${a.dateKey}&appointment=${a.id}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="w-16 shrink-0 text-[13px] font-medium tabular">{formatClock(minutesOfDay(new Date(a.startAt), org.timezone), locale)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.clientName || t("pos.walkInSale")}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.items.map((i) => i.serviceName).join(", ")} · {[...new Set(a.items.map((i) => i.staffName))].join(", ")}
                    </span>
                  </span>
                  <AppointmentStatusBadge status={a.status} className="hidden sm:inline-flex" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {appointments.length > shown.length ? (
          <p className="px-3 pt-1 text-xs text-muted-foreground">{t("dashboard.today.more", { count: appointments.length - shown.length })}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function RecentSalesPanel({ transactions }: { transactions: TransactionDTO[] }) {
  const { t } = useI18n();
  const org = useOrg();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.recent.title")}</CardTitle>
        <Button variant="ghost" size="sm" asChild className="-my-1">
          <Link href="/sales">{t("dashboard.recent.viewAll")}</Link>
        </Button>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {transactions.length === 0 ? (
          <EmptyState compact icon={ReceiptIcon} title={t("dashboard.recent.empty")} />
        ) : (
          <ul className="grid min-w-0 grid-cols-1">
            {transactions.map((tx) => (
              <li key={tx.id}>
                <Link href={`/sales/${tx.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{tx.clientName || t("pos.walkInSale")}</span>
                    <span className="block text-xs text-muted-foreground tabular">
                      {tx.number} · {org.date(tx.createdAt, "time")}
                    </span>
                  </span>
                  {tx.status !== "paid" ? <TransactionStatusBadge status={tx.status} /> : null}
                  <span className="text-sm font-medium tabular">{org.money(tx.totalMinor + tx.tipMinor)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
