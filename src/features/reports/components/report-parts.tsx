"use client";

import { InfoIcon, TriangleAlertIcon } from "lucide-react";
import { useCallback } from "react";

import type { CsvColumn } from "@/components/data-table/csv";
import { useOrg } from "@/components/providers/org-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

/** KPI cards laid out by the space the report actually has, not the viewport. */
export function KpiGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("@container mb-6", className)}>
      <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-4">{children}</div>
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader className="flex-col items-stretch gap-1">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Title above a table that sits directly on the page. */
export function SubHeading({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description ? <p className="text-[15px] text-muted-foreground">{description}</p> : null}
    </div>
  );
}

/** Quiet explanatory note (definitions, caveats). `warning` for partial data. */
export function Notice({ children, tone = "info", className }: { children: React.ReactNode; tone?: "info" | "warning"; className?: string }) {
  const Icon = tone === "warning" ? TriangleAlertIcon : InfoIcon;
  return (
    <p
      role={tone === "warning" ? "status" : undefined}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[14px] leading-relaxed",
        tone === "warning" ? "border-warning/40 bg-warning/10 text-foreground" : "border-border bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "warning" ? "text-warning" : "text-muted-foreground")} aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export interface BarItem {
  key: string;
  label: string;
  value: number;
  display: string;
  hint?: string;
}

/**
 * Horizontal bars in plain HTML (RTL-safe, readable at any width): label and
 * value on one line, a thin single-colour bar underneath scaled to the max.
 */
export function BarList({ items, empty }: { items: BarItem[]; empty?: React.ReactNode }) {
  const { locale } = useI18n();
  const max = Math.max(0, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0);
  if (items.length === 0) return <>{empty ?? null}</>;
  return (
    <ul className="grid gap-3.5">
      {items.map((i) => (
        <li key={i.key} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="min-w-0 truncate font-medium">{i.label}</span>
            <span className="shrink-0 font-semibold tabular">
              {i.display}
              <span className="ms-2 text-[13px] font-normal text-muted-foreground">{i.hint ?? (total > 0 ? formatPercent(Math.max(0, i.value) / total, locale) : "")}</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${max > 0 ? Math.max(0, (i.value / max) * 100) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** CSV export props for a report table, or undefined without `export_data`. */
export function useReportCsv(report: string, range: DateRange) {
  const org = useOrg();
  const allowed = org.can("export_data");
  return useCallback(
    <T,>(columns: CsvColumn<T>[], suffix = "") =>
      allowed ? { filename: `${report}${suffix ? `-${suffix}` : ""}-${range.from}-${range.to}`, columns } : undefined,
    [allowed, report, range.from, range.to],
  );
}

export function usePercent() {
  const { locale } = useI18n();
  return useCallback((ratio: number | null, digits = 1) => (ratio === null ? "—" : formatPercent(ratio, locale, digits)), [locale]);
}
