"use client";

import { Loader2Icon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n/client";
import type { ClientDTO } from "@/lib/types";

import { searchClientsAction } from "../actions";
import { avatarColor } from "../utils";

/**
 * Searches every client on the server (token index) — used when the directory
 * only holds the most recent clients because of the load cap.
 */
export function ClientServerSearch() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<ClientDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef(0);

  function onChange(value: string) {
    setTerm(value);
    clearTimeout(timer.current);
    const q = value.trim();
    const id = ++request.current;
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const res = await searchClientsAction({ term: q, limit: 10 });
      if (id !== request.current) return;
      setHits(res.ok ? res.data : []);
      setSearching(false);
    }, 250);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <SearchIcon />
          {t("clients.searchAll")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={term}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("clients.searchAllPlaceholder")}
            className="ps-9"
            aria-label={t("clients.searchAll")}
          />
        </div>
        {term.trim().length >= 2 ? (
          <div className="mt-2 max-h-72 overflow-y-auto">
            {searching && hits.length === 0 ? (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                {t("clients.searching")}
              </p>
            ) : hits.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("clients.searchAllEmpty")}</p>
            ) : (
              <ul className="grid gap-0.5">
                {hits.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/clients/${c.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent"
                    >
                      <PersonAvatar name={c.fullName} color={avatarColor(c.id)} className="size-7 text-[10px]" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{c.fullName}</span>
                        <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                          {c.phone || c.email}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
