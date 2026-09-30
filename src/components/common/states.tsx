import type { LucideIcon } from "lucide-react";
import { AlertTriangleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** The empty-state icon on a quiet rounded tile. */
function Emblem({ icon: Icon, compact, tone = "brand" }: { icon: LucideIcon; compact?: boolean; tone?: "brand" | "danger" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl",
        compact ? "size-12" : "size-14",
        tone === "danger" ? "bg-destructive/8 text-destructive" : "bg-muted text-muted-foreground",
      )}
    >
      <Icon className={compact ? "size-5" : "size-6"} strokeWidth={1.7} />
    </span>
  );
}

/** Empty state with an emblem, a sentence of context and the next useful action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex animate-fade-up flex-col items-center justify-center text-center",
        compact ? "gap-3 px-4 py-9" : "gap-4 px-6 py-16",
        className,
      )}
    >
      {icon ? <Emblem icon={icon} compact={compact} /> : null}
      <div className="grid max-w-md gap-1.5">
        <p className={cn("font-display font-bold leading-tight", compact ? "text-[16px]" : "text-[19px]")}>{title}</p>
        {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex animate-fade-up flex-col items-center gap-4 px-6 py-16 text-center", className)}>
      <Emblem icon={AlertTriangleIcon} tone="danger" />
      <div className="grid max-w-md gap-1.5">
        <p className="font-display text-[19px] font-bold leading-tight">{title}</p>
        {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
