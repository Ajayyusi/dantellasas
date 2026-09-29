"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import type { SectionValues } from "../schema";
import { SaveBar, SectionHeader, SettingsCard } from "./form-parts";
import { useSettingsForm } from "./use-settings-form";

export const ACCENT_PRESETS = ["#965660", "#7d5279", "#7a323b", "#a25c43", "#90693b", "#507357", "#715f53", "#4b6d8a", "#553b32"];
const HEX = /^#[0-9a-fA-F]{6}$/;

export function AppearanceView({ initial }: { initial: SectionValues<"appearance"> }) {
  const { t } = useI18n();
  const f = useSettingsForm("appearance", initial);
  const accent = f.values.accentColor;
  const [hex, setHex] = useState(accent);
  const valid = HEX.test(accent);

  const pick = (c: string) => {
    setHex(c);
    f.set("accentColor", c.toLowerCase());
  };

  return (
    <form onSubmit={f.onSubmit} className="grid gap-5" noValidate>
      <SectionHeader title={t("settings.sections.appearance.title")} description={t("settings.sections.appearance.description")} />
      <SettingsCard title={t("settings.appearance.accent")} description={t("settings.appearance.accentHint")}>
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t("settings.appearance.accent")}>
            {ACCENT_PRESETS.map((c) => {
              const selected = accent.toLowerCase() === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={c}
                  onClick={() => pick(c)}
                  className={cn(
                    "grid size-9 place-items-center rounded-full text-white outline-none ring-offset-2 ring-offset-card focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "ring-2 ring-foreground/70",
                  )}
                  style={{ backgroundColor: c }}
                >
                  {selected ? <CheckIcon className="size-4" strokeWidth={3} /> : null}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field label={t("settings.appearance.custom")} htmlFor="app-hex" error={f.errorFor("values.accentColor")} className="sm:w-48">
              <div className="relative">
                <span
                  className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 rounded-full border"
                  style={{ backgroundColor: valid ? accent : "transparent" }}
                />
                <Input
                  id="app-hex"
                  dir="ltr"
                  className="ps-8 font-mono uppercase"
                  value={hex}
                  maxLength={7}
                  aria-invalid={!HEX.test(hex)}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    const next = raw.startsWith("#") ? raw : `#${raw}`;
                    setHex(next);
                    if (HEX.test(next)) f.set("accentColor", next.toLowerCase());
                  }}
                />
              </div>
            </Field>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5" aria-hidden>
              <span className="inline-flex h-8 items-center rounded-md px-3 text-[14px] font-medium text-white shadow-sm" style={{ backgroundColor: accent }}>
                {t("settings.appearance.previewButton")}
              </span>
              <Badge style={{ backgroundColor: `color-mix(in oklch, ${accent} 12%, transparent)`, color: accent }}>
                {t("settings.appearance.previewBadge")}
              </Badge>
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title={t("settings.appearance.density")} description={t("settings.appearance.densityHint")}>
        <Segmented
          value={f.values.calendarDensity}
          onValueChange={(x) => f.set("calendarDensity", x as "comfortable" | "compact")}
          aria-label={t("settings.appearance.density")}
        >
          <SegmentedItem value="comfortable">{t("settings.appearance.comfortable")}</SegmentedItem>
          <SegmentedItem value="compact">{t("settings.appearance.compact")}</SegmentedItem>
        </Segmented>
      </SettingsCard>
      <SaveBar
        dirty={f.dirty}
        pending={f.pending}
        onReset={() => {
          f.reset();
          setHex(initial.accentColor);
        }}
        disabled={!HEX.test(hex)}
      />
    </form>
  );
}
