import { cn } from "@/lib/utils";

/** Placeholder with a soft champagne shimmer while content loads. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "animate-shimmer rounded-lg bg-[length:220%_100%]",
        "bg-[linear-gradient(100deg,var(--muted)_30%,color-mix(in_oklch,var(--muted)_35%,var(--card))_50%,var(--muted)_70%)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
