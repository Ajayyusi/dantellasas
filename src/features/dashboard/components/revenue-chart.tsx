"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";

import type { SeriesPoint } from "../aggregate";

/** Shared tooltip shell for the dashboard charts. */
export function TooltipCard({ title, rows }: { title: string; rows: { label: string; value: string; swatch: string; dashed?: boolean }[] }) {
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2.5 text-[13px] shadow-md">
      <div className="mb-1.5 font-semibold">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 py-0.5">
          <span
            aria-hidden
            className={r.dashed ? "h-0 w-3 border-t-2 border-dashed" : "size-2.5 rounded-full"}
            style={r.dashed ? { borderColor: r.swatch } : { backgroundColor: r.swatch }}
          />
          <span className="text-muted-foreground">{r.label}</span>
          <span className="ms-auto ps-3 font-semibold tabular">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function RevenueTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  const { t } = useI18n();
  const org = useOrg();
  const point = payload?.[0]?.payload as SeriesPoint | undefined;
  if (!active || !point) return null;
  return (
    <TooltipCard
      title={org.dateKey(String(label), "weekdayDate")}
      rows={[
        { label: t("dashboard.revenue.current"), value: org.money(point.netMinor), swatch: "var(--chart-1)" },
        { label: t("dashboard.revenue.previous"), value: org.money(point.prevNetMinor), swatch: "var(--muted-foreground)", dashed: true },
      ]}
    />
  );
}

export const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" };

/** Daily net revenue as a light area, with the previous period as a dashed line. */
export function RevenueChart({ data }: { data: SeriesPoint[] }) {
  const org = useOrg();
  const { dir } = useI18n();
  const dense = data.length > 20;
  return (
    <div className="h-72 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: 6 }}>
          <defs>
            <linearGradient id="dash-revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <YAxis
            orientation={dir === "rtl" ? "right" : "left"}
            tickLine={false}
            axisLine={false}
            width={76}
            tick={axisTick}
            tickFormatter={(v: number) => org.money(v, { compact: true })}
          />
          <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4, strokeWidth: 1, strokeDasharray: "3 3" }} content={<RevenueTooltip />} />
          <Line
            dataKey="prevNetMinor"
            type="monotone"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.45}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            dataKey="netMinor"
            type="monotone"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#dash-revenue-fill)"
            dot={false}
            activeDot={{ r: 4.5, fill: "var(--card)", stroke: "var(--chart-1)", strokeWidth: 2 }}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
