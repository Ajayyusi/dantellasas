"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { arSA, enGB } from "react-day-picker/locale";

import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  const { locale, dir } = useI18n();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale === "ar" ? arSA : enGB}
      dir={dir}
      numerals="latn"
      className={cn("p-1", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex w-full flex-col gap-3",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-[15px] font-semibold",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "z-10"),
        button_next: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "z-10"),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-10 text-[12px] font-medium text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative size-10 p-0 text-center text-sm",
        day_button: cn(
          "inline-flex size-10 items-center justify-center rounded-lg tabular transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
        ),
        selected: "[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        today: "[&>button]:font-semibold [&>button]:text-primary [&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-primary/40",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/40 [&>button]:pointer-events-none",
        range_middle: "[&>button]:!bg-primary-soft [&>button]:!text-foreground [&>button]:!rounded-none",
        range_start: "[&>button]:rounded-lg",
        range_end: "[&>button]:rounded-lg",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
