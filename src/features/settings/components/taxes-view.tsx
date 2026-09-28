"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useI18n } from "@/lib/i18n/client";
import type { TaxRate } from "@/lib/settings";
import { newId } from "@/lib/utils";

import type { SectionValues } from "../schema";
import { SaveBar, SectionHeader, SettingsCard, ToggleRow } from "./form-parts";
import { useSettingsForm } from "./use-settings-form";

export function TaxesView({ initial }: { initial: SectionValues<"tax"> }) {
  const { t } = useI18n();
  const f = useSettingsForm("tax", initial);
  const v = f.values;
  const rates = v.rates;

  const setRates = (next: TaxRate[]) => f.set("rates", next);
  const update = (id: string, patch: Partial<TaxRate>) => setRates(rates.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const makeDefault = (id: string) => setRates(rates.map((r) => ({ ...r, isDefault: r.id === id })));
  const remove = (id: string) => {
    const next = rates.filter((r) => r.id !== id);
    if (next.length && !next.some((r) => r.isDefault)) next[0] = { ...next[0]!, isDefault: true };
    setRates(next);
  };
  const add = () =>
    setRates([...rates, { id: newId("tax"), name: t("settings.taxes.newRate"), rateBps: 0, isDefault: rates.length === 0 }]);

  return (
    <form onSubmit={f.onSubmit} className="grid gap-5" noValidate>
      <SectionHeader title={t("settings.sections.taxes.title")} description={t("settings.sections.taxes.description")} />
      <SettingsCard title={t("settings.taxes.vat")}>
        <div className="grid gap-3">
          <ToggleRow
            id="tax-enabled"
            label={t("settings.taxes.enabled")}
            hint={t("settings.taxes.enabledHint")}
            checked={v.enabled}
            onCheckedChange={(x) => f.set("enabled", x)}
          />
          <ToggleRow
            id="tax-incl"
            label={t("settings.taxes.pricesIncludeTax")}
            hint={t("settings.taxes.pricesIncludeTaxHint")}
            checked={v.pricesIncludeTax}
            onCheckedChange={(x) => f.set("pricesIncludeTax", x)}
            disabled={!v.enabled}
          />
          <Field
            label={t("settings.taxes.registrationLabel")}
            htmlFor="tax-label"
            hint={t("settings.taxes.registrationLabelHint")}
            error={f.errorFor("values.registrationLabel")}
            className="max-w-xs pt-2"
          >
            <Input id="tax-label" value={v.registrationLabel} onChange={(e) => f.set("registrationLabel", e.target.value)} />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("settings.taxes.rates")}
        description={t("settings.taxes.ratesHint")}
        action={
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={rates.length >= 10}>
            <PlusIcon />
            {t("settings.taxes.addRate")}
          </Button>
        }
      >
        <RadioGroup
          value={rates.find((r) => r.isDefault)?.id ?? ""}
          onValueChange={makeDefault}
          aria-label={t("settings.taxes.default")}
          className="grid gap-0 divide-y rounded-lg border"
        >
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_96px_36px] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase sm:grid">
            <span>{t("settings.taxes.rateName")}</span>
            <span>{t("settings.taxes.rate")}</span>
            <span>{t("settings.taxes.default")}</span>
            <span />
          </div>
          {rates.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_120px_96px_36px]">
              <Input
                value={r.name}
                onChange={(e) => update(r.id, { name: e.target.value })}
                aria-label={t("settings.taxes.rateName")}
                aria-invalid={!!f.errorFor(`values.rates.${i}.name`)}
              />
              <RateInput value={r.rateBps} onChange={(bps) => update(r.id, { rateBps: bps })} label={t("settings.taxes.rate")} />
              <label className="flex items-center gap-2 text-[13px]">
                <RadioGroupItem value={r.id} aria-label={`${t("settings.taxes.makeDefault")}: ${r.name}`} />
                <span className="sm:sr-only">{t("settings.taxes.default")}</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(r.id)}
                disabled={rates.length <= 1}
                aria-label={`${t("settings.taxes.removeRate")}: ${r.name}`}
                className="justify-self-end"
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </RadioGroup>
        {f.errorFor("values.rates") ? (
          <p role="alert" className="mt-2 text-[13px] text-destructive">
            {f.errorFor("values.rates")}
          </p>
        ) : null}
      </SettingsCard>
      <SaveBar dirty={f.dirty} pending={f.pending} onReset={f.reset} />
    </form>
  );
}

/** Percentage input (e.g. "5" or "2.5") stored as basis points. */
function RateInput({ value, onChange, label }: { value: number; onChange: (bps: number) => void; label: string }) {
  const [text, setText] = useState(() => String(value / 100));
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        dir="ltr"
        className="pe-7 tabular"
        aria-label={label}
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
          setText(raw);
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(Math.min(10_000, Math.max(0, Math.round(n * 100))));
        }}
        onBlur={() => setText(String(value / 100))}
      />
      <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
    </div>
  );
}
