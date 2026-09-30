"use client";

import { useOrg } from "@/components/providers/org-provider";
import { addDaysToKey } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatHour } from "@/lib/i18n/format";
import { formatNumber } from "@/lib/money";
import { localName } from "@/lib/localize";

import type { BusyHours, CategoryRow } from "../aggregate";

/** A Sunday, so reference day `w` is `addDaysToKey(SUNDAY, w)`. */
const SUNDAY = "2026-09-27";

function heat(count: number, max: number): string {
  if (!count || !max) return "var(--muted)";
  const pct = Math.round(12 + (count / max) * 80);
  return `color-mix(in oklch, var(--primary) ${pct}%, var(--card))`;
}

/** Weekday × hour heat map of booking starts. */
export function BusyHeatmap({ busy }: { busy: BusyHours }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  if (busy.max === 0) return <p className="grid h-56 place-items-center text-sm text-muted-foreground">{t("dashboard.busy.empty")}</p>;
  const hours = Array.from({ length: busy.to - busy.from }, (_, i) => busy.from + i);
  const start = org.settings.locale.weekStartsOn;
  const days = Array.from({ length: 7 }, (_, i) => (i + start) % 7);
  const cols = { gridTemplateColumns: `72px repeat(${hours.length}, minmax(22px, 1fr))` };
  const peak = { w: 0, i: 0, count: 0 };
  for (let w = 0; w < busy.counts.length; w++) {
    const row = busy.counts[w] ?? [];
    for (let i = 0; i < row.length; i++) {
      const count = row[i] ?? 0;
      if (count > peak.count) Object.assign(peak, { w, i, count });
    }
  }
  const peakDay = org.dateKey(addDaysToKey(SUNDAY, peak.w), "weekday");
  const peakHour = formatHour((busy.from + peak.i) * 60, locale);
  return (
    <div className="grid gap-4">
      <p className="sr-only">{t("dashboard.busy.cell", { day: peakDay, hour: peakHour, count: formatNumber(peak.count, locale) })}</p>
      <div className="overflow-x-auto scrollbar-thin" aria-hidden>
        <div className="grid min-w-[560px] gap-1.5" style={cols}>
          <span />
          {hours.map((h, i) => (
            <span key={h} className="text-center text-[12px] text-muted-foreground tabular">
              {i % 2 === 0 ? formatHour(h * 60, locale) : ""}
            </span>
          ))}
          {days.map((w) => {
            const day = org.dateKey(addDaysToKey(SUNDAY, w), "weekday");
            return (
              <div key={w} className="contents">
                <span className="truncate pe-2 text-[14px] font-medium text-muted-foreground">{day}</span>
                {hours.map((h, i) => {
                  const count = busy.counts[w]?.[i] ?? 0;
                  const label = t("dashboard.busy.cell", { day, hour: formatHour(h * 60, locale), count: formatNumber(count, locale) });
                  return (
                    <span
                      key={h}
                      title={label}
                      className="h-7 rounded-[5px] transition-transform duration-150 hover:scale-110"
                      style={{ backgroundColor: heat(count, busy.max) }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>{t("dashboard.busy.quieter")}</span>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span key={f} className="size-3.5 rounded" style={{ backgroundColor: heat(Math.max(f, 0.02), 1) }} />
        ))}
        <span>{t("dashboard.busy.busier")}</span>
      </div>
    </div>
  );
}

/** Service revenue by category as proportional bars. */
export function CategoryBars({ rows }: { rows: CategoryRow[] }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  if (rows.length === 0) return <p className="grid h-56 place-items-center text-sm text-muted-foreground">{t("dashboard.categories.empty")}</p>;
  const total = rows.reduce((s, r) => s + r.revenueMinor, 0);
  const max = Math.max(...rows.map((r) => r.revenueMinor));
  return (
    <ul className="grid gap-4">
      {rows.slice(0, 6).map((r) => {
        const color = r.color || "var(--chart-6)";
        const name = r.id ? localName(r, locale) : t("dashboard.categories.other");
        return (
          <li key={r.id || "other"} className="grid gap-1.5">
            <div className="flex items-baseline gap-2.5 text-sm">
              <span className="size-2.5 shrink-0 translate-y-[-1px] rounded-full" style={{ backgroundColor: color }} />
              <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
              <span className="shrink-0 font-semibold tabular">{org.money(r.revenueMinor)}</span>
              <span className="w-11 shrink-0 text-end text-xs text-muted-foreground tabular">{Math.round((r.revenueMinor / total) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full animate-fade-up rounded-full"
                style={{ width: `${Math.max(3, (r.revenueMinor / max) * 100)}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
