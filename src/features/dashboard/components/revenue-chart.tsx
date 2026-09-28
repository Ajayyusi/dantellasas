"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";

import type { SeriesPoint } from "../aggregate";

function ChartTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  const { t } = useI18n();
  const org = useOrg();
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as SeriesPoint | undefined;
  if (!point) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{org.dateKey(String(label), "date")}</div>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-sm bg-chart-1" />
        <span className="text-muted-foreground">{t("dashboard.revenue.current")}</span>
        <span className="ms-auto font-medium tabular">{org.money(point.netMinor)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-2 bg-muted-foreground/60" />
        <span className="text-muted-foreground">{t("dashboard.revenue.previous")}</span>
        <span className="ms-auto tabular">{org.money(point.prevNetMinor)}</span>
      </div>
    </div>
  );
}

/** Daily net revenue as bars, with the previous period as a faint line for context. */
export function RevenueChart({ data }: { data: SeriesPoint[] }) {
  const org = useOrg();
  const { dir } = useI18n();
  const dense = data.length > 20;
  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap={dense ? "18%" : "28%"}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="dateKey"
            reversed={dir === "rtl"}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(k: string) => org.dateKey(k, data.length <= 8 ? "weekday" : "dayNumber")}
            interval={dense ? "preserveStartEnd" : 0}
            minTickGap={8}
          />
          <YAxis
            orientation={dir === "rtl" ? "right" : "left"}
            tickLine={false}
            axisLine={false}
            width={72}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v: number) => org.money(v, { compact: true })}
          />
          <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.6 }} content={<ChartTooltip />} />
          <Bar dataKey="netMinor" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          <Line dataKey="prevNetMinor" type="monotone" stroke="var(--muted-foreground)" strokeOpacity={0.5} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
