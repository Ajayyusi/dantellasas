import type { LucideIcon } from "lucide-react";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Kept for call sites that tag a card; the quiet style no longer colours by tone. */
export type StatTone = "rose" | "gold" | "sage" | "blue" | "mauve" | "taupe";

/**
 * A single KPI: a quiet label (with an optional small icon), the figure, and an
 * optional change chip. `delta` is the change against the comparison period as
 * a fraction (0.12 = +12%); `invert` marks metrics where down is good.
 */
export function StatCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  invert,
  icon: Icon,
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
  return (
    <Card className={cn("hover-lift @container relative flex flex-col gap-0 overflow-hidden p-4 sm:px-5 sm:py-[18px]", className)}>
      <p className="flex min-w-0 items-center gap-2 text-[13px] font-medium leading-snug text-muted-foreground sm:text-[14px]">
        {Icon ? <Icon aria-hidden className="size-4 shrink-0 opacity-80" strokeWidth={1.8} /> : null}
        <span className="min-w-0">{label}</span>
      </p>
      {/* Sized to the card so long amounts (AED 108,823.00) never overflow a narrow column. */}
      <div className="mt-2.5 font-display text-[clamp(1.25rem,13cqi,1.75rem)] font-bold leading-none tracking-[-0.03em] tabular">{value}</div>
      {hasDelta || hint ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
          {hasDelta && !flat ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-px text-xs font-semibold tabular",
                good ? "bg-success/10 text-success" : "bg-destructive/8 text-destructive",
              )}
            >
              {up ? <ArrowUpRightIcon className="size-3.5" /> : <ArrowDownRightIcon className="size-3.5" />}
              {Math.abs(delta * 100).toFixed(Math.abs(delta) < 0.1 ? 1 : 0)}%
            </span>
          ) : null}
          {hasDelta && flat ? <span className="rounded-md bg-muted px-1.5 py-px text-xs font-semibold tabular">0%</span> : null}
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
