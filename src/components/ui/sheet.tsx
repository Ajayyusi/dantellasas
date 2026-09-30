"use client";

import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Warm, softly blurred backdrop shared by sheets and dialogs. */
export const overlayClass =
  "fixed inset-0 z-50 bg-[oklch(0.3_0.03_35/0.32)] backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-300";

/** Side panel ("drawer"). `side="end"` is the right edge in LTR, left in RTL. */
function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}
function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}
function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
  className,
  children,
  side = "end",
  showClose = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "start" | "end" | "bottom";
  showClose?: boolean;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className={overlayClass} />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col bg-popover text-popover-foreground shadow-lg outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-200 ease-out",
          side === "end" &&
            "inset-y-0 end-0 h-full w-full border-s sm:max-w-lg sm:rounded-s-3xl data-[state=open]:slide-in-from-end data-[state=closed]:slide-out-to-end",
          side === "start" &&
            "inset-y-0 start-0 h-full w-full border-e sm:max-w-sm sm:rounded-e-3xl data-[state=open]:slide-in-from-start data-[state=closed]:slide-out-to-start",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          className,
        )}
        {...props}
      >
        {side === "bottom" ? <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-muted" /> : null}
        {children}
        {showClose && (
          <SheetPrimitive.Close className="absolute end-4 top-4 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <XIcon className="size-[18px]" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 border-b px-6 pt-6 pb-4 pe-16", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sheet-body" className={cn("flex-1 content-start overflow-y-auto px-6 py-5 scrollbar-thin", className)} {...props} />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("flex flex-wrap items-center justify-end gap-2 border-t bg-muted/40 px-6 py-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-display text-[20px] font-bold leading-tight", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
