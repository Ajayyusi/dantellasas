import { Rosette } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

/**
 * The header card of a person's profile (client, staff): a champagne banner,
 * a large avatar overlapping it, the name in the display face, and a strip of
 * chips underneath. Content is passed in slots so each profile keeps its own
 * actions and data.
 */
export function ProfileHero({
  avatar,
  title,
  badges,
  meta,
  actions,
  chips,
  accent,
  className,
}: {
  /** Rendered large; give it `ring-4` and a size via `profileAvatarClass`. */
  avatar: React.ReactNode;
  title: React.ReactNode;
  /** Pills next to the name (status, loyalty). */
  badges?: React.ReactNode;
  /** The line under the name: role, contact links. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Chip strip along the bottom; omitted when empty. */
  chips?: React.ReactNode;
  /** Tints the banner, e.g. a staff member's calendar colour. */
  accent?: string;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden rounded-3xl border bg-card shadow-sm", className)}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-brand-wash sm:h-28" />
      {accent ? (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-24 sm:h-28"
          style={{ backgroundImage: `linear-gradient(120deg, color-mix(in oklch, ${accent} 22%, transparent), transparent 65%)` }}
        />
      ) : null}
      <Rosette className="pointer-events-none absolute -end-16 -top-24 size-72 opacity-50" />

      <div className="relative flex flex-col gap-5 px-4 pb-5 pt-12 sm:px-8 sm:pt-14 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          {avatar}
          <div className="grid min-w-0 gap-2 sm:pb-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="min-w-0 break-words font-display text-[32px] font-semibold leading-[1.1] sm:text-[38px]">{title}</h1>
              {badges}
            </div>
            {meta ? <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px]">{meta}</div> : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:shrink-0 lg:justify-end lg:pb-1">{actions}</div>
        ) : null}
      </div>

      {chips ? (
        <div className="relative flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3.5 sm:px-8">{chips}</div>
      ) : null}
    </section>
  );
}

/** Size and ring for the avatar passed to `ProfileHero`. */
export const profileAvatarClass = "size-24 shrink-0 text-[32px] shadow-md ring-4 ring-card sm:size-28 sm:text-[36px]";

/** A quiet fact in the hero's chip strip; `highlight` for something timely. */
export function HeroChip({ children, highlight, className }: { children: React.ReactNode; highlight?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border bg-card px-3 text-[14px] font-medium text-foreground/85 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-primary",
        highlight && "border-primary/30 bg-primary-soft text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}
