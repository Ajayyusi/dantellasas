import type { LucideIcon } from "lucide-react";
import { AlertTriangleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Branded emblem: the icon in a champagne-and-blush disc with a fine gold ring. */
function Emblem({ icon: Icon, compact, tone = "brand" }: { icon: LucideIcon; compact?: boolean; tone?: "brand" | "danger" }) {
  return (
    <div className={cn("relative grid shrink-0 place-items-center", compact ? "size-14" : "size-20")}>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full border border-dashed",
          tone === "danger" ? "border-destructive/30" : "border-gold/55",
        )}
      />
      <span
        className={cn(
          "grid place-items-center rounded-full shadow-sm ring-1 ring-border",
          compact ? "size-11" : "size-16",
          tone === "danger" ? "bg-destructive/8 text-destructive" : "bg-brand-wash text-primary",
        )}
      >
        <Icon className={compact ? "size-5" : "size-7"} strokeWidth={1.6} />
      </span>
    </div>
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
        <p className={cn("font-display font-semibold leading-tight", compact ? "text-xl" : "text-[26px]")}>{title}</p>
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
        <p className="font-display text-[26px] font-semibold leading-tight">{title}</p>
        {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
