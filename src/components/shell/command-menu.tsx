"use client";

import {
  CalendarIcon,
  CalendarPlusIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  UserIcon,
  UserPlusIcon,
  UserRoundIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useOrg } from "@/components/providers/org-provider";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { globalSearchAction, type SearchHit } from "@/features/search/actions";
import { useI18n } from "@/lib/i18n/client";

import { visibleNav } from "./nav-config";

const KIND_ICON = {
  client: UserIcon,
  staff: UserRoundIcon,
  invoice: ReceiptIcon,
  appointment: CalendarIcon,
} as const;

/** ⌘K / Ctrl K: navigation, quick actions and live search. */
export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    const id = ++requestId.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await globalSearchAction({ term: q });
      if (id !== requestId.current) return;
      setHits(res.ok ? res.data : []);
      setSearching(false);
    }, 180);
    return () => clearTimeout(timer);
  }, [term]);

  function go(href: string) {
    onOpenChange(false);
    setTerm("");
    router.push(href);
  }

  const groups: { kind: SearchHit["kind"]; label: string }[] = [
    { kind: "client", label: t("command.clients") },
    { kind: "appointment", label: t("command.appointments") },
    { kind: "invoice", label: t("command.invoices") },
    { kind: "staff", label: t("command.staff") },
  ];
  const nav = visibleNav(org.permissions).flatMap((s) => s.items);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTerm("");
      }}
    >
      <DialogContent className="top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0" showClose={false}>
        <DialogTitle className="sr-only">{t("shell.search")}</DialogTitle>
        <DialogDescription className="sr-only">{t("command.hint")}</DialogDescription>
        <Command shouldFilter={false} loop>
          <CommandInput value={term} onValueChange={setTerm} placeholder={t("command.placeholder")} autoFocus />
          <CommandList>
            {term.trim().length >= 2 ? (
              <>
                {searching && hits.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">{t("command.searching")}</div>
                ) : (
                  <CommandEmpty>{t("command.empty")}</CommandEmpty>
                )}
                {groups.map((g) => {
                  const items = hits.filter((h) => h.kind === g.kind);
                  if (items.length === 0) return null;
                  const Icon = KIND_ICON[g.kind];
                  return (
                    <CommandGroup key={g.kind} heading={g.label}>
                      {items.map((h) => (
                        <CommandItem key={`${h.kind}-${h.id}`} value={`${h.kind}-${h.id}`} onSelect={() => go(h.href)}>
                          <Icon />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{h.title}</span>
                            {h.subtitle ? (
                              <span className="block truncate text-xs text-muted-foreground" dir="auto">
                                {h.subtitle}
                              </span>
                            ) : null}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </>
            ) : (
              <>
                <CommandGroup heading={t("command.actions")}>
                  {org.can("create_appointments") ? (
                    <CommandItem value="new-appointment" onSelect={() => go("/appointments?new=1")}>
                      <CalendarPlusIcon />
                      {t("shell.newAppointment")}
                    </CommandItem>
                  ) : null}
                  {org.can("create_sales") ? (
                    <CommandItem value="new-sale" onSelect={() => go("/pos")}>
                      <ShoppingBagIcon />
                      {t("shell.newSale")}
                    </CommandItem>
                  ) : null}
                  {org.can("create_customers") ? (
                    <CommandItem value="new-client" onSelect={() => go("/clients?new=1")}>
                      <UserPlusIcon />
                      {t("shell.newClient")}
                    </CommandItem>
                  ) : null}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading={t("command.navigation")}>
                  {nav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem key={item.href} value={item.href} onSelect={() => go(item.href)}>
                        <Icon />
                        {t(item.label)}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">{t("command.hint")}</div>
      </DialogContent>
    </Dialog>
  );
}
