"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Pill-style single choice (view switchers, filters). */
function Segmented({
  value,
  onValueChange,
  className,
  children,
  ...rest
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onValueChange(v);
      }}
      className={cn("inline-flex items-center gap-1 rounded-xl border border-border/70 bg-muted/70 p-1", className)}
      {...rest}
    >
      {children}
    </ToggleGroupPrimitive.Root>
  );
}

function SegmentedItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[14px] font-semibold text-muted-foreground transition-all duration-200 outline-none",
        "hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-primary data-[state=on]:shadow-sm focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export { Segmented, SegmentedItem };
