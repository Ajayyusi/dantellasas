import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  deltaLabel?: string;
  invert?: boolean;
  className?: string;
}) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const up = hasDelta && delta > 0;
  const flat = hasDelta && Math.abs(delta) < 0.0005;
  const good = invert ? !up : up;
  return (
    <Card className={cn("gap-0 px-5 py-4", className)}>
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular">{value}</p>
      {hasDelta || hint ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {hasDelta && !flat ? (
            <span className={cn("inline-flex items-center gap-0.5 font-medium tabular", good ? "text-success" : "text-destructive")}>
              {up ? <ArrowUpRightIcon className="size-3.5" /> : <ArrowDownRightIcon className="size-3.5" />}
              {Math.abs(delta * 100).toFixed(Math.abs(delta) < 0.1 ? 1 : 0)}%
            </span>
          ) : null}
          {hasDelta && flat ? <span className="font-medium tabular">0%</span> : null}
          {hasDelta && deltaLabel ? <span>{deltaLabel}</span> : null}
          {hint ? <span>{hint}</span> : null}
        </p>
      ) : null}
    </Card>
  );
}

/** Relative change, or null when there is no baseline. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}
