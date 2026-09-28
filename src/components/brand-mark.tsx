import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Neutral product mark: a monogram tile + product name. Tenants brand their own space in settings. */
export function BrandMark({
  className,
  showName = true,
  size = "md",
}: {
  className?: string;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const tile = size === "lg" ? "size-10 text-lg" : size === "sm" ? "size-7 text-[13px]" : "size-8 text-sm";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-lg bg-primary font-semibold tracking-tight text-primary-foreground shadow-sm",
          tile,
        )}
      >
        {brand.name.charAt(0).toUpperCase()}
      </span>
      {showName ? (
        <span className={cn("font-semibold tracking-tight", size === "lg" ? "text-lg" : "text-[15px]")}>
          {brand.name}
        </span>
      ) : (
        <span className="sr-only">{brand.name}</span>
      )}
    </span>
  );
}
