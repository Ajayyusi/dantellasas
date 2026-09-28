"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import { localeNames, locales, type Locale } from "@/lib/i18n/config";

import type { SectionValues } from "../schema";
import { SaveBar, SectionHeader, SettingsCard } from "./form-parts";
import { useSettingsForm } from "./use-settings-form";

export function LanguageView({ orgDefault }: { orgDefault: SectionValues<"locale"> | null }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const change = (next: string) => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-5">
      <SectionHeader title={t("settings.sections.language.title")} description={t("settings.sections.language.description")} />
      <SettingsCard
        title={t("settings.language.mine")}
        description={t("settings.language.mineHint")}
        action={pending ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" /> : null}
      >
        <LocalePicker value={locale} onChange={change} label={t("settings.language.mine")} />
      </SettingsCard>
      {orgDefault ? <OrgDefaultForm key={orgDefault.defaultLocale} initial={orgDefault} /> : null}
    </div>
  );
}

function LocalePicker({ value, onChange, label }: { value: Locale; onChange: (v: string) => void; label: string }) {
  return (
    <Segmented value={value} onValueChange={onChange} aria-label={label}>
      {locales.map((l) => (
        <SegmentedItem key={l} value={l} lang={l} className="px-4">
          {localeNames[l]}
        </SegmentedItem>
      ))}
    </Segmented>
  );
}

function OrgDefaultForm({ initial }: { initial: SectionValues<"locale"> }) {
  const { t } = useI18n();
  const f = useSettingsForm("locale", initial);
  return (
    <form onSubmit={f.onSubmit} className="grid gap-5" noValidate>
      <SettingsCard title={t("settings.language.orgDefault")} description={t("settings.language.orgDefaultHint")}>
        <LocalePicker
          value={f.values.defaultLocale}
          onChange={(v) => f.set("defaultLocale", v as Locale)}
          label={t("settings.language.orgDefault")}
        />
      </SettingsCard>
      <SaveBar dirty={f.dirty} pending={f.pending} onReset={f.reset} />
    </form>
  );
}
