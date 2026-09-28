"use client";

import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";

import type { CatalogService, ServiceLine } from "./types";

/** Editable list of "N × service" lines (package sessions, membership inclusions). */
export function ServiceLinesEditor({
  value,
  onChange,
  services,
  error,
  idPrefix,
}: {
  value: ServiceLine[];
  onChange: (lines: ServiceLine[]) => void;
  services: CatalogService[];
  error?: string | null;
  idPrefix: string;
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const byId = new Map(services.map((s) => [s.id, s]));
  const selectable = services.filter((s) => s.active || value.some((l) => l.serviceId === s.id));

  const update = (i: number, patch: Partial<ServiceLine>) =>
    onChange(value.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  function add() {
    const next = selectable.find((s) => !value.some((l) => l.serviceId === s.id)) ?? selectable[0];
    if (!next) return;
    onChange([...value, { serviceId: next.id, serviceName: next.name, quantity: 1 }]);
  }

  if (services.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">{t("catalog.lines.noServices")}</p>
    );
  }

  return (
    <div className="grid gap-2">
      {value.length > 0 ? (
        <ul className="grid gap-2">
          {value.map((line, i) => {
            const svc = byId.get(line.serviceId);
            return (
              <li key={`${line.serviceId}-${i}`} className="flex items-center gap-2 rounded-lg border bg-card p-2">
                <div className="flex shrink-0 items-center rounded-md border" dir="ltr">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-e-none"
                    aria-label={t("catalog.lines.decrease")}
                    disabled={line.quantity <= 1}
                    onClick={() => update(i, { quantity: Math.max(1, line.quantity - 1) })}
                  >
                    <MinusIcon />
                  </Button>
                  <input
                    id={`${idPrefix}-qty-${i}`}
                    aria-label={t("catalog.lines.quantity")}
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, ""));
                      update(i, { quantity: Math.min(999, Math.max(1, n || 1)) });
                    }}
                    className="h-8 w-10 bg-transparent text-center text-sm tabular outline-none"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-s-none"
                    aria-label={t("catalog.lines.increase")}
                    onClick={() => update(i, { quantity: Math.min(999, line.quantity + 1) })}
                  >
                    <PlusIcon />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground" aria-hidden>
                  ×
                </span>
                <Select
                  value={line.serviceId}
                  onValueChange={(v) => update(i, { serviceId: v, serviceName: byId.get(v)?.name ?? "" })}
                >
                  <SelectTrigger className="w-0 min-w-0 flex-1" aria-label={t("catalog.lines.service")}>
                    <SelectValue placeholder={t("catalog.lines.chooseService")}>
                      <span className="truncate">{svc ? localName(svc, locale) : line.serviceName}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {selectable.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="truncate">{localName(s, locale)}</span>
                        <span className="ms-2 text-xs text-muted-foreground tabular">{org.money(s.priceMinor)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("common.remove")}
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                >
                  <Trash2Icon />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={add}>
        <PlusIcon />
        {t("catalog.lines.add")}
      </Button>
      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** "10 × Swedish Massage, 2 × Blow Dry" */
export function linesSummary(lines: ServiceLine[], services: CatalogService[], locale: string): string {
  const byId = new Map(services.map((s) => [s.id, s]));
  return lines
    .map((l) => {
      const s = byId.get(l.serviceId);
      return `${l.quantity} × ${s ? localName(s, locale) : l.serviceName}`;
    })
    .join(locale === "ar" ? "، " : ", ");
}
