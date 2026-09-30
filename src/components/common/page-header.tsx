import { cn } from "@/lib/utils";

/**
 * Page title row: an optional eyebrow (section), the title, a description or
 * meta line, and actions aligned to the end.
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
    <div className={cn("flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5 text-[13px] font-semibold text-primary">{eyebrow}</div> : null}
        <h1 className="font-display text-[28px] font-bold leading-[1.15] text-foreground sm:text-[30px]">{title}</h1>
        {description ? <div className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground">{description}</div> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
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
        "mx-auto w-full animate-fade-up px-4 py-6 sm:px-6 lg:px-8 lg:py-7",
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
    <section className={cn("rounded-2xl border bg-card text-card-foreground", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-snug tracking-[-0.01em]">{title}</h2>
          {description ? <p className="mt-0.5 text-[14px] text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn("px-5 pb-5 sm:px-6", contentClassName)}>{children}</div>
    </section>
  );
}
