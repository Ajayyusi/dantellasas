"use client";

import { InfoIcon } from "lucide-react";

import { useI18n } from "@/lib/i18n/client";

import type { SectionValues } from "../schema";
import { SaveBar, SectionHeader, SettingsCard, ToggleRow } from "./form-parts";
import { useSettingsForm } from "./use-settings-form";

export function NotificationsView({ initial }: { initial: SectionValues<"notifications"> }) {
  const { t } = useI18n();
  const f = useSettingsForm("notifications", initial);
  return (
    <form onSubmit={f.onSubmit} className="grid gap-5" noValidate>
      <SectionHeader
        title={t("settings.sections.notifications.title")}
        description={t("settings.sections.notifications.description")}
      />
      <SettingsCard title={t("settings.notifications.alerts")}>
        <div className="grid gap-3">
          <ToggleRow
            id="ntf-stock"
            label={t("settings.notifications.lowStock")}
            hint={t("settings.notifications.lowStockHint")}
            checked={f.values.lowStockAlerts}
            onCheckedChange={(x) => f.set("lowStockAlerts", x)}
          />
          <ToggleRow
            id="ntf-docs"
            label={t("settings.notifications.documentExpiry")}
            hint={t("settings.notifications.documentExpiryHint")}
            checked={f.values.documentExpiryAlerts}
            onCheckedChange={(x) => f.set("documentExpiryAlerts", x)}
          />
        </div>
      </SettingsCard>
      <p className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-[14px] text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        {t("settings.notifications.futureNote")}
      </p>
      <SaveBar dirty={f.dirty} pending={f.pending} onReset={f.reset} />
    </form>
  );
}
