"use client";

import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { useOrg } from "@/components/providers/org-provider";
import { statusColor } from "@/features/appointments/components/status-badge";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/types";

import type { BookingPoint, Retention } from "../aggregate";
import { axisTick, TooltipCard } from "./revenue-chart";

function BookingsTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const point = payload?.[0]?.payload as BookingPoint | undefined;
  if (!active || !point) return null;
  return (
    <TooltipCard
      title={org.dateKey(String(label), "weekdayDate")}
      rows={[
        { label: t("dashboard.revenue.current"), value: formatNumber(point.count, locale), swatch: "var(--chart-2)" },
        { label: t("dashboard.revenue.previous"), value: formatNumber(point.prevCount, locale), swatch: "var(--muted-foreground)", dashed: true },
      ]}
    />
  );
}

/** Bookings per day as champagne bars, the previous period as a dashed line. */
export function BookingsChart({ data }: { data: BookingPoint[] }) {
  const org = useOrg();
  const { dir } = useI18n();
  const dense = data.length > 20;
  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: 6 }} barCategoryGap={dense ? "22%" : "32%"}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
          <XAxis
            dataKey="dateKey"
            reversed={dir === "rtl"}
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            tickFormatter={(k: string) => org.dateKey(k, data.length <= 8 ? "weekday" : "dayNumber")}
            interval={dense ? "preserveStartEnd" : 0}
            minTickGap={10}
          />
          <YAxis orientation={dir === "rtl" ? "right" : "left"} tickLine={false} axisLine={false} width={40} tick={axisTick} allowDecimals={false} />
          <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.55 }} content={<BookingsTooltip />} />
          <Bar dataKey="count" fill="var(--chart-2)" radius={[6, 6, 2, 2]} maxBarSize={30} animationDuration={800} />
          <Line dataKey="prevCount" type="monotone" stroke="var(--muted-foreground)" strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut of appointment statuses with a legend and the total in the middle. */
export function StatusDonut({ statuses }: { statuses: Partial<Record<AppointmentStatus, number>> }) {
  const { t, locale } = useI18n();
  const rows = APPOINTMENT_STATUSES.filter((s) => statuses[s]).map((s) => ({ status: s, value: statuses[s] ?? 0 }));
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  if (total === 0) return <p className="grid h-56 place-items-center text-sm text-muted-foreground">{t("dashboard.statuses.empty")}</p>;
  return (
    // Side by side only when the card itself is wide enough (it sits in a narrow column on desktop).
    <div className="@container">
      <div className="grid items-center gap-5 @[26rem]:grid-cols-[170px_minmax(0,1fr)]">
        <div className="relative mx-auto size-[170px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey="value" nameKey="status" innerRadius={58} outerRadius={82} paddingAngle={2} cornerRadius={5} stroke="none" animationDuration={800}>
                {rows.map((r) => (
                  <Cell key={r.status} fill={statusColor(r.status)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <span className="font-display text-[32px] font-semibold leading-none tabular">{formatNumber(total, locale)}</span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("dashboard.kpi.appointments")}</span>
          </div>
        </div>
        <ul className="grid min-w-0 gap-2.5 text-sm">
          {rows.map((r) => (
            <li key={r.status} className="flex items-center gap-2.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusColor(r.status) }} />
              <span className="flex-1 truncate text-muted-foreground">{t(`appointments.status.${r.status}`)}</span>
              <span className="font-semibold tabular">{formatNumber(r.value, locale)}</span>
              <span className="w-11 text-end text-xs tabular text-muted-foreground">{Math.round((r.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Returning vs new-this-period clients, with the return rate in the middle. */
export function RetentionDonut({ retention }: { retention: Retention }) {
  const { t, locale } = useI18n();
  const data = [
    { key: "returning", value: retention.returning, color: "var(--chart-1)", label: t("dashboard.retention.returning") },
    { key: "fresh", value: retention.fresh, color: "var(--chart-2)", label: t("dashboard.retention.fresh") },
  ];
  if (retention.current === 0) return <p className="grid h-56 place-items-center text-sm text-muted-foreground">{t("dashboard.retention.empty")}</p>;
  const rate = retention.rate === null ? null : `${Math.round(retention.rate * 100)}%`;
  return (
    <div className="grid items-center gap-5">
      <div className="relative mx-auto size-[170px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="key" innerRadius={58} outerRadius={82} paddingAngle={3} cornerRadius={6} stroke="none" startAngle={90} endAngle={-270} animationDuration={800}>
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="font-display text-[32px] font-semibold leading-none tabular">{rate ?? formatNumber(retention.returning, locale)}</span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("dashboard.retention.returning")}</span>
        </div>
      </div>
      <ul className="grid min-w-0 gap-2.5 text-sm">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="flex-1 truncate text-muted-foreground">{d.label}</span>
            <span className="font-semibold tabular">{formatNumber(d.value, locale)}</span>
          </li>
        ))}
      </ul>
      {rate ? <p className="text-center text-[14px] text-muted-foreground">{t("dashboard.retention.rate", { rate })}</p> : null}
    </div>
  );
}
