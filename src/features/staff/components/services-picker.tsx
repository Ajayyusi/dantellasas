"use client";

import { ScissorsIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/states";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/i18n/format";
import { localName } from "@/lib/localize";
import { normalizeText } from "@/lib/search";

export interface ServiceOption {
  id: string;
  name: string;
  nameAr: string;
  categoryId: string;
  durationMin: number;
  /** services.staffIds is [] (everyone performs it). */
  openToAll: boolean;
}

export interface CategoryOption {
  id: string;
  name: string;
  nameAr: string;
  color: string;
}

/** Checklist of services grouped by category, with per-group "select all". */
export function ServicesPicker({
  services,
  categories,
  value,
  onChange,
}: {
  services: ServiceOption[];
  categories: CategoryOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const q = normalizeText(query);
  const visible = q ? services.filter((s) => normalizeText(`${s.name} ${s.nameAr}`).includes(q)) : services;

  if (services.length === 0) {
    return <EmptyState compact icon={ScissorsIcon} title={t("staff.form.noServices")} description={t("staff.form.noServicesHint")} />;
  }

  const groups = [
    ...categories.map((c) => ({ key: c.id, label: localName(c, locale), color: c.color, items: visible.filter((s) => s.categoryId === c.id) })),
    {
      key: "__none",
      label: t("services.uncategorized"),
      color: "var(--muted-foreground)",
      items: visible.filter((s) => !categories.some((c) => c.id === s.categoryId)),
    },
  ].filter((g) => g.items.length > 0);

  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(value);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onChange([...next]);
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("services.searchPlaceholder")}
            className="ps-9"
            aria-label={t("common.search")}
          />
        </div>
        <span className="text-[13px] tabular text-muted-foreground">
          {t("staff.form.servicesSelected", { count: services.filter((s) => selected.has(s.id)).length, total: services.length })}
        </span>
      </div>
      {groups.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t("common.noResults")}</p> : null}
      {groups.map((g) => {
        const ids = g.items.map((s) => s.id);
        const on = ids.filter((id) => selected.has(id)).length;
        const state = on === 0 ? false : on === ids.length ? true : "indeterminate";
        return (
          <section key={g.key} className="overflow-hidden rounded-lg border">
            <label className="flex cursor-pointer items-center gap-3 border-b bg-muted/30 px-3 py-2">
              <Checkbox checked={state} onCheckedChange={() => setMany(ids, state !== true)} aria-label={g.label} />
              <span className="size-2 rounded-full" style={{ backgroundColor: g.color }} />
              <span className="text-sm font-semibold">{g.label}</span>
              <span className="ms-auto text-xs tabular text-muted-foreground">
                {on}/{ids.length}
              </span>
            </label>
            <ul className="divide-y">
              {g.items.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                    <Checkbox checked={selected.has(s.id)} onCheckedChange={(v) => setMany([s.id], v === true)} />
                    <span className="flex-1 truncate text-sm">{localName(s, locale)}</span>
                    <span className="text-xs tabular text-muted-foreground">{formatDuration(s.durationMin, locale)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
