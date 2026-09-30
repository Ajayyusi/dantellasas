"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent outline-none transition-colors duration-200",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-4 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-out",
          "data-[state=unchecked]:translate-x-0.5 data-[state=checked]:translate-x-[22px] rtl:data-[state=unchecked]:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-[22px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
