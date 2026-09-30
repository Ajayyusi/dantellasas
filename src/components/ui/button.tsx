import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold",
    "transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150 ease-out active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--foreground)_7%,var(--secondary))]",
        soft: "bg-primary-soft text-primary hover:bg-[color-mix(in_oklch,var(--primary)_14%,var(--card))]",
        outline: "border border-input bg-card text-foreground hover:bg-muted/70",
        ghost: "text-foreground hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklch,var(--destructive)_86%,black)]",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3.5 text-[14px] [&_svg:not([class*='size-'])]:size-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
