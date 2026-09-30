import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * The Dantella emblem: a clean "D" on a rounded tile in the accent colour.
 * Drawn from theme variables, so it follows the palette (and a tenant accent)
 * in light and dark.
 */
export function BrandEmblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("shrink-0", className)}>
      <rect width="40" height="40" rx="12" fill="var(--primary)" />
      <text
        x="20"
        y="26.6"
        textAnchor="middle"
        fill="var(--primary-foreground)"
        style={{ fontFamily: "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif", fontSize: 19, fontWeight: 700 }}
      >
        {brand.shortName.charAt(0).toUpperCase()}
      </text>
    </svg>
  );
}

/** Emblem plus wordmark; `tagline` adds a quiet line under the name. */
export function BrandMark({
  className,
  showName = true,
  size = "md",
  tagline,
}: {
  className?: string;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
  tagline?: string;
}) {
  const emblem = size === "lg" ? "size-11" : size === "sm" ? "size-8" : "size-9";
  const word = size === "lg" ? "text-[21px]" : size === "sm" ? "text-[16px]" : "text-[18px]";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandEmblem className={emblem} />
      {showName ? (
        <span className="flex min-w-0 flex-col">
          <span className={cn("font-bold leading-tight tracking-[-0.02em] text-foreground", word)}>{brand.shortName}</span>
          {tagline ? <span className="truncate text-[12px] font-medium leading-snug text-muted-foreground">{tagline}</span> : null}
        </span>
      ) : (
        <span className="sr-only">{brand.name}</span>
      )}
    </span>
  );
}
