import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-sans text-xs font-semibold leading-5 tracking-normal [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        neutral: "border-transparent bg-muted text-muted-foreground",
        primary: "border-transparent bg-primary-soft text-primary",
        success: "border-transparent bg-success/12 text-success",
        warning: "border-transparent bg-warning/18 text-[color-mix(in_oklch,var(--warning)_58%,var(--foreground))]",
        danger: "border-transparent bg-destructive/10 text-destructive",
        info: "border-transparent bg-info/12 text-info",
        gold: "border-[color-mix(in_oklch,var(--gold)_45%,transparent)] bg-gold-soft text-gold-foreground",
        outline: "border-border bg-card text-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

/** Soft pill; `dot` adds a status dot in the text colour. */
function Badge({
  className,
  variant,
  dot,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
