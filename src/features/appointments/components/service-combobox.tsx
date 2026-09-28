"use client";

import { ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/i18n/format";
import { localName } from "@/lib/localize";
import type { ServiceCategoryDTO, ServiceDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Searchable service picker grouped by category, showing duration and price. */
export function ServiceCombobox({
  services,
  categories,
  value,
  onChange,
  id,
  invalid,
}: {
  services: ServiceDTO[];
  categories: ServiceCategoryDTO[];
  value: string;
  onChange: (service: ServiceDTO) => void;
  id?: string;
  invalid?: boolean;
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const [open, setOpen] = useState(false);
  const selected = services.find((s) => s.id === value);
  const groups = [
    ...categories.map((c) => ({ id: c.id, name: localName(c, locale), items: services.filter((s) => s.categoryId === c.id) })),
    {
      id: "__none",
      name: t("services.uncategorized"),
      items: services.filter((s) => !categories.some((c) => c.id === s.categoryId)),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-invalid={invalid || undefined}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-start text-sm shadow-sm outline-none focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[invalid]:border-destructive",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate">{selected ? localName(selected, locale) : t("appointments.form.chooseService")}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={t("services.searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("common.noResults")}</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g.id} heading={g.name}>
                {g.items.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`${s.name} ${s.nameAr} ${s.id}`}
                    onSelect={() => {
                      onChange(s);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{localName(s, locale)}</span>
                    <span className="shrink-0 text-xs tabular text-muted-foreground">
                      {formatDuration(s.durationMin, locale)} · {org.money(s.priceMinor)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
