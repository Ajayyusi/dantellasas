import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-[0.005em]",
    "transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-out active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.16),var(--shadow-sm)] hover:bg-[color-mix(in_oklch,var(--primary)_90%,black)] hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.16),var(--shadow-md)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        soft: "bg-primary-soft text-primary hover:bg-[color-mix(in_oklch,var(--primary)_17%,var(--card))]",
        outline:
          "border border-input bg-card text-foreground shadow-xs hover:border-[color-mix(in_oklch,var(--primary)_30%,var(--input))] hover:bg-accent/60",
        ghost: "text-foreground hover:bg-accent/80",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-[color-mix(in_oklch,var(--destructive)_88%,black)]",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3.5 text-[14px] [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 rounded-xl px-6 text-base",
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
