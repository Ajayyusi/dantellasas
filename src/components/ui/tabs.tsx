"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-5", className)} {...props} />;
}

/** Underlined tab list for page-level sections; the indicator grows in. */
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex w-full items-center gap-1 overflow-x-auto border-b scrollbar-thin", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg px-3 text-[14px] font-semibold text-muted-foreground outline-none transition-colors duration-150",
        "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 after:ease-out",
        "hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:scale-x-100",
        "focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none data-[state=active]:animate-fade-up", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
