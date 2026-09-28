"use client";

import { useI18n } from "@/lib/i18n/client";
import { formatHour } from "@/lib/i18n/format";

import type { AppointmentsReport } from "../types";

/**
 * Weekday × hour table. Cell shade is the accent colour at an opacity
 * proportional to the count; the number is always printed, so the colour is
 * never the only carrier. Scrolls inside its card on narrow screens.
 */
export function AppointmentHeat({ heat, hours }: Pick<AppointmentsReport, "heat" | "hours">) {
  const { t, locale } = useI18n();
  const max = Math.max(1, ...heat.flatMap((r) => r.counts));
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th scope="col" className="sticky start-0 bg-card" />
            {hours.map((h) => (
              <th key={h} scope="col" className="px-1 pb-1 text-center font-normal whitespace-nowrap text-muted-foreground">
                {formatHour(h * 60, locale)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heat.map((row) => (
            <tr key={row.weekday}>
              <th scope="row" className="sticky start-0 bg-card pe-2 text-start font-medium whitespace-nowrap">
                {t(`common.weekdaysShort.${row.weekday}` as "common.weekdaysShort.0")}
              </th>
              {row.counts.map((c, i) => (
                <td
                  key={hours[i]}
                  className="h-8 min-w-9 rounded text-center tabular"
                  style={{ background: c ? `color-mix(in oklch, var(--chart-1) ${Math.round(12 + (c / max) * 70)}%, transparent)` : "var(--muted)" }}
                >
                  <span className={c / max > 0.6 ? "font-medium text-primary-foreground" : c ? "font-medium" : "text-muted-foreground/60"}>{c || "·"}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
