import { cn } from "@/lib/utils";

/**
 * The header card of a person's profile (client, staff): avatar, name with
 * badges, a meta line, actions, and a strip of chips underneath. Content is
 * passed in slots so each profile keeps its own actions and data.
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
  /** Rendered large; size it with `profileAvatarClass`. */
  avatar: React.ReactNode;
  title: React.ReactNode;
  /** Pills next to the name (status, loyalty). */
  badges?: React.ReactNode;
  /** The line under the name: role, contact links. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Chip strip along the bottom; omitted when empty. */
  chips?: React.ReactNode;
  /** A thin line of colour along the top, e.g. a staff member's calendar colour. */
  accent?: string;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden rounded-2xl border bg-card", className)}>
      {accent ? <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} /> : null}

      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          {avatar}
          <div className="grid min-w-0 gap-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="min-w-0 break-words font-display text-[26px] font-bold leading-tight sm:text-[28px]">{title}</h1>
              {badges}
            </div>
            {meta ? <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px]">{meta}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:shrink-0 lg:justify-end">{actions}</div> : null}
      </div>

      {chips ? (
        <div className="relative flex flex-wrap items-center gap-2 border-t bg-muted/35 px-5 py-3 sm:px-6">{chips}</div>
      ) : null}
    </section>
  );
}

/** Size and ring for the avatar passed to `ProfileHero`. */
export const profileAvatarClass = "size-[72px] shrink-0 text-[24px] ring-0 sm:size-20 sm:text-[26px]";

/** A quiet fact in the hero's chip strip; `highlight` for something timely. */
export function HeroChip({ children, highlight, className }: { children: React.ReactNode; highlight?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg border bg-card px-2.5 text-[14px] font-medium text-foreground/85 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        highlight && "border-primary/30 bg-primary-soft text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}
