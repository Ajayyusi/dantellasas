"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";

export interface DailyPoint {
  dateKey: string;
  value: number;
}

/** Short axis label in major units: 1500 → "1.5K" / "1.5 ألف" (deterministic, no compact ICU data). */
function axisAmount(minor: number, locale: string): string {
  const major = minor / 100;
  if (Math.abs(major) < 1000) return formatNumber(major, locale);
  const k = formatNumber(major / 1000, locale, 1);
  return locale === "ar" ? `${k} ألف` : `${k}K`;
}

function renderTip(
  { active, payload }: TooltipContentProps,
  f: { label: string; dir: "ltr" | "rtl"; money: (minor: number) => string; day: (key: string) => string },
) {
  const point = payload?.[0]?.payload as DailyPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md" dir={f.dir}>
      <p className="text-muted-foreground">{f.day(point.dateKey)}</p>
      <p className="mt-0.5 font-medium tabular">
        {f.label}: {f.money(point.value)}
      </p>
    </div>
  );
}

/**
 * One series of daily amounts as thin bars in the accent colour. The plot is
 * LTR internally and mirrored in Arabic (time runs right to left, the value
 * axis sits on the right); every label is translated and formatted.
 */
export function DailyChart({ data, label }: { data: DailyPoint[]; label: string }) {
  const { locale, dir } = useI18n();
  const org = useOrg();
  const rtl = dir === "rtl";
  const dense = data.length > 16;

  return (
    <div className="h-64 w-full" dir="ltr" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap={dense ? 2 : "20%"}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
          <XAxis
            dataKey="dateKey"
            reversed={rtl}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(k: string) => org.dateKey(k, data.length > 7 ? "dayNumber" : "weekday")}
            interval="preserveStartEnd"
            minTickGap={dense ? 8 : 4}
          />
          <YAxis
            orientation={rtl ? "right" : "left"}
            width={rtl ? 58 : 44}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: number) => axisAmount(v, locale)}
          />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p: TooltipContentProps) => renderTip(p, { label, dir, money: org.money, day: (k) => org.dateKey(k, "weekdayDate") })} />
          <Bar dataKey="value" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
