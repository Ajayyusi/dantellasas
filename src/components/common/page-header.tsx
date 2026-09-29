import { cn } from "@/lib/utils";

/**
 * Page title row: an optional eyebrow (section), a serif title, a description
 * or meta line, and actions aligned to the end.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 pb-7 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-foreground">
            <span aria-hidden className="h-px w-6 bg-gold" />
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-display text-[34px] font-semibold leading-[1.1] text-foreground sm:text-[38px]">{title}</h1>
        {description ? <div className="mt-2 max-w-2xl text-base text-muted-foreground">{description}</div> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

/** Standard page padding and max width, with a gentle entrance on navigation. */
export function PageContainer({
  children,
  className,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full animate-fade-up px-4 py-7 sm:px-6 lg:px-10 lg:py-9",
        wide ? "max-w-[1680px]" : "max-w-[1400px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Card section with a title row (title, description, actions) and content. */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card text-card-foreground shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6 pb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug tracking-tight">{title}</h2>
          {description ? <p className="mt-0.5 text-[14px] text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn("px-6 pb-6", contentClassName)}>{children}</div>
    </section>
  );
}
