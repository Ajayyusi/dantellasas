import * as React from "react";

import { cn } from "@/lib/utils";

/** Shared look for text-like controls (inputs, selects, date and money fields). */
export const fieldControl = cn(
  "w-full min-w-0 rounded-lg border border-input bg-card text-sm text-foreground outline-none",
  "transition-[color,box-shadow,border-color,background-color] duration-150",
  "placeholder:text-muted-foreground/80 hover:border-[color-mix(in_oklch,var(--foreground)_22%,var(--input))]",
  "focus-visible:border-[color-mix(in_oklch,var(--primary)_60%,var(--input))] focus-visible:ring-[3px] focus-visible:ring-ring/25",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/15",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldControl,
        "flex h-10 px-3 py-1 selection:bg-primary/20",
        "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
