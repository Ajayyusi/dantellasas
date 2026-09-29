"use client";

import { ChevronsUpDownIcon, Loader2Icon, UserIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";

import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchClientsAction } from "@/features/clients/actions";
import { useI18n } from "@/lib/i18n/client";
import type { ClientDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface PickedClient {
  id: string;
  name: string;
  phone: string;
}

/** Async client search (name, phone or e-mail) with a clear button. */
export function ClientPicker({
  value,
  onChange,
  id,
}: {
  value: PickedClient | null;
  onChange: (client: PickedClient | null) => void;
  id?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ClientDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  function search(next: string) {
    setTerm(next);
    if (timer.current) clearTimeout(timer.current);
    const q = next.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const mine = ++seq.current;
      const res = await searchClientsAction({ term: q, limit: 8 });
      if (mine !== seq.current) return;
      setResults(res.ok ? res.data : []);
      setLoading(false);
    }, 250);
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className={cn(
              "flex h-9 w-0 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-start text-sm shadow-sm outline-none focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring/40",
              !value && "text-muted-foreground",
            )}
          >
            <UserIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{value ? value.name : t("catalog.clientPicker.placeholder")}</span>
            <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={term} onValueChange={search} placeholder={t("catalog.clientPicker.search")} />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : term.trim().length < 2 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("catalog.clientPicker.hint")}</p>
              ) : (
                <CommandEmpty>{t("catalog.clientPicker.empty")}</CommandEmpty>
              )}
              {!loading && results.length > 0 ? (
                <CommandGroup>
                  {results.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.id}
                      onSelect={() => {
                        onChange({ id: c.id, name: c.fullName, phone: c.phone });
                        setOpen(false);
                      }}
                    >
                      <PersonAvatar name={c.fullName} className="size-6 text-[11px]" />
                      <span className="min-w-0 flex-1 truncate">{c.fullName}</span>
                      <span className="text-xs text-muted-foreground tabular" dir="ltr">
                        {c.phone}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value ? (
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("common.remove")} onClick={() => onChange(null)}>
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
