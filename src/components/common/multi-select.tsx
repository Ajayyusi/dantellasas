"use client";

import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
}

/** Searchable multi-select with chips. An empty selection shows `emptyLabel` (e.g. "All"). */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
  id,
  className,
}: {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
  id?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => value.includes(o.value));
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-card px-2 py-1 text-start text-sm shadow-sm outline-none focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring/40",
            className,
          )}
        >
          {selected.length === 0 ? (
            <span className="px-1 text-muted-foreground">{emptyLabel ?? placeholder ?? t("common.selectPlaceholder")}</span>
          ) : (
            selected.map((o) => (
              <Badge key={o.value} variant="neutral" className="gap-1 bg-secondary text-foreground">
                {o.label}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`${t("common.remove")} ${o.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(o.value);
                  }}
                  className="rounded-full hover:text-destructive"
                >
                  <XIcon />
                </span>
              </Badge>
            ))
          )}
          <ChevronsUpDownIcon className="ms-auto size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={t("common.searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("common.noResults")}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const checked = value.includes(o.value);
                return (
                  <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => toggle(o.value)}>
                    <span
                      className={cn(
                        "grid size-4 place-items-center rounded-[4px] border",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {checked ? <CheckIcon className="!size-3 !text-primary-foreground" strokeWidth={3} /> : null}
                    </span>
                    {o.icon}
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.hint ? <span className="text-xs text-muted-foreground">{o.hint}</span> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {value.length > 0 ? (
            <button
              type="button"
              className="w-full border-t px-3 py-2 text-start text-sm text-muted-foreground hover:bg-accent"
              onClick={() => onChange([])}
            >
              {t("common.clearFilters")}
            </button>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
