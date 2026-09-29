"use client";

import { Loader2Icon, PhoneIcon, SearchIcon, UserPlusIcon, UserRoundIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quickCreateClientAction, searchClientsAction } from "@/features/clients/actions";
import { useI18n } from "@/lib/i18n/client";
import type { ClientDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface PickedClient {
  id: string;
  fullName: string;
  phone: string;
  stats?: ClientDTO["stats"];
  notes?: string;
  tags?: string[];
}

export type ClientSelection = { mode: "client"; client: PickedClient } | { mode: "walkin"; name: string } | null;

/**
 * Find a client by name/phone/email, add one inline (name + mobile), or book a
 * walk-in. Keyboard: type, arrow down/up, Enter to pick.
 */
export function ClientPicker({ value, onChange }: { value: ClientSelection; onChange: (v: ClientSelection) => void }) {
  const { t, te } = useI18n();
  const org = useOrg();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ClientDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const req = useRef(0);

  function search(v: string) {
    setTerm(v);
    setActive(0);
    clearTimeout(timer.current);
    const q = v.trim();
    const id = ++req.current;
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const res = await searchClientsAction({ term: q, limit: 6 });
      if (id !== req.current) return;
      setResults(res.ok ? res.data : []);
      setSearching(false);
    }, 200);
  }

  function pick(c: ClientDTO) {
    onChange({ mode: "client", client: { id: c.id, fullName: c.fullName, phone: c.phone, stats: c.stats, notes: c.notes, tags: c.tags } });
    setTerm("");
    setResults([]);
  }

  async function create() {
    setSaving(true);
    const res = await quickCreateClientAction({ fullName: newName, phone: newPhone, email: "" });
    setSaving(false);
    if (!res.ok) {
      const field = res.fieldErrors?.phone ?? res.fieldErrors?.fullName;
      toast.error(te(field ?? res.error));
      return;
    }
    pick(res.data);
    setCreating(false);
    setNewName("");
    setNewPhone("");
  }

  if (value?.mode === "client") {
    const c = value.client;
    return (
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
        <PersonAvatar name={c.fullName} className="size-10" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{c.fullName}</div>
          {c.phone ? (
            <div className="flex items-center gap-1 text-[14px] text-muted-foreground" dir="ltr">
              <PhoneIcon className="size-3" />
              {c.phone}
            </div>
          ) : null}
          {c.stats ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{t("appointments.form.clientStats", { visits: c.stats.visits, spend: org.money(c.stats.totalSpendMinor, { compact: true }) })}</span>
              {c.stats.lastVisitAt ? <span>{t("appointments.form.lastVisit", { date: org.date(c.stats.lastVisitAt, "date") })}</span> : null}
              {c.stats.noShows > 0 ? <Badge variant="danger">{t("appointments.form.noShows", { count: c.stats.noShows })}</Badge> : null}
            </div>
          ) : null}
          {c.notes ? <p className="mt-1.5 line-clamp-2 text-xs text-foreground/80">{c.notes}</p> : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          {t("appointments.form.change")}
        </Button>
      </div>
    );
  }

  if (value?.mode === "walkin") {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <div className="grid size-10 place-items-center rounded-full bg-muted">
          <UserRoundIcon className="size-5 text-muted-foreground" />
        </div>
        <Input
          value={value.name}
          onChange={(e) => onChange({ mode: "walkin", name: e.target.value })}
          placeholder={t("appointments.form.walkInName")}
          aria-label={t("appointments.form.walkInName")}
          className="flex-1"
        />
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label={t("common.remove")}>
          <XIcon />
        </Button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="grid gap-3 rounded-lg border p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("appointments.form.newClientName")} aria-label={t("appointments.form.newClientName")} autoFocus />
          <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="050 123 4567" type="tel" dir="ltr" aria-label={t("appointments.form.newClientPhone")} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" size="sm" onClick={create} disabled={saving || !newName.trim()}>
            {saving ? <Loader2Icon className="animate-spin" /> : null}
            {t("appointments.form.createClient")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => search(e.target.value)}
          placeholder={t("appointments.form.searchClient")}
          aria-label={t("appointments.form.client")}
          className="h-10 ps-9"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="client-results"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              pick(results[active]);
            }
          }}
          autoFocus
        />
        {searching ? <Loader2Icon className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}
      </div>
      {term.trim().length >= 2 && !searching ? (
        <ul id="client-results" role="listbox" className="overflow-hidden rounded-lg border">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">{t("appointments.form.noResults")}</li>
          ) : (
            results.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex w-full items-center gap-3 px-3 py-2 text-start", i === active && "bg-accent")}
                >
                  <PersonAvatar name={c.fullName} className="size-8" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.fullName}</span>
                    <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                      {[c.phone, c.email].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{t("appointments.form.clientStats", { visits: c.stats.visits, spend: org.money(c.stats.totalSpendMinor, { compact: true }) })}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {org.can("create_customers") ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setCreating(true);
              if (/\d{6,}/.test(term.replace(/\s/g, ""))) setNewPhone(term);
              else setNewName(term);
            }}
          >
            <UserPlusIcon />
            {t("appointments.form.newClient")}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ mode: "walkin", name: "" })}>
          <UserRoundIcon />
          {t("appointments.form.walkIn")}
        </Button>
      </div>
    </div>
  );
}
