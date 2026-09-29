import type { LucideIcon } from "lucide-react";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTone = "rose" | "gold" | "sage" | "blue" | "mauve" | "taupe";

const TONE: Record<StatTone, string> = {
  rose: "var(--primary)",
  gold: "var(--chart-2)",
  sage: "var(--chart-3)",
  blue: "var(--chart-4)",
  mauve: "var(--chart-5)",
  taupe: "var(--chart-6)",
};

/**
 * A single KPI. `delta` is the change against the comparison period as a
 * fraction (0.12 = +12%); `invert` marks metrics where down is good.
 */
export function StatCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  invert,
  icon: Icon,
  tone = "rose",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  invert?: boolean;
  icon?: LucideIcon;
  tone?: StatTone;
  className?: string;
}) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const up = hasDelta && delta > 0;
  const flat = hasDelta && Math.abs(delta) < 0.0005;
  const good = invert ? !up : up;
  const color = TONE[tone];
  return (
    <Card className={cn("hover-lift @container relative flex flex-col gap-0 overflow-hidden p-4 sm:px-6 sm:py-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-[13px] font-semibold leading-snug text-muted-foreground sm:text-[14px]">{label}</p>
        {Icon ? (
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-xl sm:size-10"
            style={{ backgroundColor: `color-mix(in oklch, ${color} 13%, var(--card))`, color: `color-mix(in oklch, ${color} 85%, var(--foreground))` }}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      {/* Sized to the card so long amounts (AED 108,823.00) never overflow a narrow column. */}
      <div className={cn("font-display text-[clamp(1.25rem,15cqi,2.125rem)] font-semibold leading-none tracking-tight tabular", Icon ? "mt-1" : "mt-3")}>
        {value}
      </div>
      {hasDelta || hint ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground sm:text-[14px]">
          {hasDelta && !flat ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular",
                good ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {up ? <ArrowUpRightIcon className="size-3.5" /> : <ArrowDownRightIcon className="size-3.5" />}
              {Math.abs(delta * 100).toFixed(Math.abs(delta) < 0.1 ? 1 : 0)}%
            </span>
          ) : null}
          {hasDelta && flat ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular">0%</span> : null}
          {hasDelta && deltaLabel ? <span>{deltaLabel}</span> : null}
          {hint ? <span>{hint}</span> : null}
        </div>
      ) : null}
    </Card>
  );
}

/** Relative change, or null when there is no baseline. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}
