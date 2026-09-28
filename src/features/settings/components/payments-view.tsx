"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { SortableList } from "@/components/common/sortable-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/client";
import type { PaymentMethod } from "@/lib/settings";
import { cn, newId } from "@/lib/utils";

import type { SectionValues } from "../schema";
import { SaveBar, SectionHeader, SettingsCard, ToggleRow } from "./form-parts";
import { useHydrated } from "./use-hydrated";
import { useSettingsForm } from "./use-settings-form";

export function PaymentsView({ initial }: { initial: SectionValues<"payments"> }) {
  const { t } = useI18n();
  const f = useSettingsForm("payments", initial);
  const hydrated = useHydrated();
  const methods = f.values.methods;

  const setMethods = (next: PaymentMethod[]) => f.set("methods", next);
  const update = (id: string, patch: Partial<PaymentMethod>) =>
    setMethods(methods.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const add = () =>
    setMethods([...methods, { id: newId("pm"), label: t("settings.payments.newMethod"), type: "other", enabled: true }]);

  return (
    <form onSubmit={f.onSubmit} className="grid gap-5" noValidate>
      <SectionHeader title={t("settings.sections.payments.title")} description={t("settings.sections.payments.description")} />
      <SettingsCard
        title={t("settings.payments.methods")}
        description={t("settings.payments.methodsHint")}
        action={
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={methods.length >= 20}>
            <PlusIcon />
            {t("settings.payments.addMethod")}
          </Button>
        }
      >
        <SortableList
          disabled={!hydrated}
          items={methods}
          onReorder={(ids) => setMethods(ids.map((id) => methods.find((m) => m.id === id)!))}
          className="divide-y rounded-lg border"
          render={(m, handle) => (
            <div className={cn("flex items-center gap-2 p-2 sm:gap-3 sm:pe-3", !m.enabled && "bg-muted/30")}>
              {handle ?? <span className="size-7 shrink-0" aria-hidden />}
              <Input
                value={m.label}
                onChange={(e) => update(m.id, { label: e.target.value })}
                aria-label={t("settings.payments.methodLabel")}
                className={cn("min-w-0 flex-1", !m.enabled && "text-muted-foreground")}
              />
              <Badge variant={m.type === "other" ? "outline" : "neutral"} className="hidden sm:inline-flex">
                {m.type === "other" ? t("settings.payments.customMethod") : t(`settings.payments.types.${m.type}`)}
              </Badge>
              <Switch
                checked={m.enabled}
                onCheckedChange={(enabled) => update(m.id, { enabled })}
                aria-label={`${t("common.enabled")}: ${m.label}`}
              />
              {m.type === "other" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setMethods(methods.filter((x) => x.id !== m.id))}
                  aria-label={`${t("settings.payments.removeMethod")}: ${m.label}`}
                >
                  <Trash2Icon />
                </Button>
              ) : (
                <span className="size-8 shrink-0" aria-hidden />
              )}
            </div>
          )}
        />
        {f.errorFor("values.methods") ? (
          <p role="alert" className="mt-2 text-[13px] text-destructive">
            {f.errorFor("values.methods")}
          </p>
        ) : null}
      </SettingsCard>

      <SettingsCard title={t("settings.payments.debt")}>
        <ToggleRow
          id="pay-debt"
          label={t("settings.payments.allowClientDebt")}
          hint={t("settings.payments.allowClientDebtHint")}
          checked={f.values.allowClientDebt}
          onCheckedChange={(x) => f.set("allowClientDebt", x)}
        />
      </SettingsCard>
      <SaveBar dirty={f.dirty} pending={f.pending} onReset={f.reset} disabled={!methods.some((m) => m.enabled)} />
    </form>
  );
}
