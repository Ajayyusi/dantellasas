import { useId } from "react";

import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * The Dantella emblem: a serif "D" on a rose-to-champagne tile with a fine
 * ring and a gold sparkle. Drawn from theme variables, so it follows the
 * palette (and a tenant accent) in light and dark.
 */
export function BrandEmblem({ className }: { className?: string }) {
  // One gradient id per instance: a shared id resolves to the first copy in
  // the document, and when that copy is display:none (the desktop sidebar on a
  // phone) every other emblem loses its fill.
  const gradient = `dantella-emblem-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn("shrink-0 drop-shadow-sm", className)}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "color-mix(in oklch, var(--primary) 88%, white)" }} />
          <stop offset="100%" style={{ stopColor: "color-mix(in oklch, var(--primary) 62%, var(--gold))" }} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${gradient})`} />
      <circle cx="24" cy="24" r="17.25" fill="none" stroke="oklch(1 0 0 / 0.38)" strokeWidth="0.75" />
      <text
        x="24"
        y="32.2"
        textAnchor="middle"
        fill="oklch(0.99 0.008 80)"
        style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 25, fontWeight: 600 }}
      >
        {brand.shortName.charAt(0).toUpperCase()}
      </text>
      <path d="M36.6 8.4l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="oklch(0.95 0.05 85)" />
    </svg>
  );
}

/** Fine gold rosette used as a quiet decorative motif (login, welcome banners). */
export function Rosette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={className} fill="none">
      {Array.from({ length: 12 }).map((_, i) => (
        <ellipse
          key={i}
          cx="100"
          cy="60"
          rx="22"
          ry="54"
          transform={`rotate(${i * 30} 100 100)`}
          stroke="var(--gold)"
          strokeOpacity="0.55"
          strokeWidth="0.6"
        />
      ))}
      <circle cx="100" cy="100" r="18" stroke="var(--gold)" strokeOpacity="0.6" strokeWidth="0.6" />
      <circle cx="100" cy="100" r="92" stroke="var(--gold)" strokeOpacity="0.35" strokeWidth="0.6" />
    </svg>
  );
}

/** Emblem plus wordmark; `tagline` adds the tracked line under the name. */
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
  const emblem = size === "lg" ? "size-12" : size === "sm" ? "size-8" : "size-10";
  const word = size === "lg" ? "text-[30px]" : size === "sm" ? "text-[21px]" : "text-[25px]";
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandEmblem className={emblem} />
      {showName ? (
        <span className="flex min-w-0 flex-col">
          <span className={cn("font-display font-semibold leading-none tracking-[0.01em] text-foreground", word)}>
            {brand.shortName}
          </span>
          {tagline ? (
            <span className="mt-1.5 truncate text-[11px] font-semibold uppercase leading-none tracking-[0.26em] text-gold-foreground">
              {tagline}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="sr-only">{brand.name}</span>
      )}
    </span>
  );
}
