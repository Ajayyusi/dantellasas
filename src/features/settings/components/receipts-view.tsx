"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";

import type { SectionValues } from "../schema";
import { SaveBar, SectionHeader, SettingsCard, ToggleRow } from "./form-parts";
import { ReceiptPreview } from "./receipt-preview";
import { useSettingsForm } from "./use-settings-form";

export function ReceiptsView({ initial }: { initial: SectionValues<"receipts"> }) {
  const { t } = useI18n();
  const f = useSettingsForm("receipts", initial);
  const v = f.values;

  return (
    <form onSubmit={f.onSubmit} className="grid gap-5" noValidate>
      <SectionHeader title={t("settings.sections.receipts.title")} description={t("settings.sections.receipts.description")} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <SettingsCard title={t("settings.receipts.numbering")}>
            <Field
              label={t("settings.receipts.invoicePrefix")}
              htmlFor="rcp-prefix"
              hint={t("settings.receipts.invoicePrefixHint", { example: `${v.invoicePrefix}000123` })}
              error={f.errorFor("values.invoicePrefix")}
              className="max-w-xs"
            >
              <Input
                id="rcp-prefix"
                dir="ltr"
                className="font-mono"
                maxLength={12}
                value={v.invoicePrefix}
                onChange={(e) => f.set("invoicePrefix", e.target.value.toUpperCase())}
              />
            </Field>
          </SettingsCard>
          <SettingsCard title={t("settings.receipts.content")}>
            <div className="grid gap-4">
              <Field label={t("settings.receipts.header")} htmlFor="rcp-header" hint={t("settings.receipts.headerHint")} error={f.errorFor("values.header")}>
                <Textarea id="rcp-header" rows={2} maxLength={300} value={v.header} onChange={(e) => f.set("header", e.target.value)} />
              </Field>
              <Field label={t("settings.receipts.footer")} htmlFor="rcp-footer" hint={t("settings.receipts.footerHint")} error={f.errorFor("values.footer")}>
                <Textarea id="rcp-footer" rows={2} maxLength={300} value={v.footer} onChange={(e) => f.set("footer", e.target.value)} />
              </Field>
              <ToggleRow
                id="rcp-staff"
                label={t("settings.receipts.showStaff")}
                hint={t("settings.receipts.showStaffHint")}
                checked={v.showStaffOnReceipt}
                onCheckedChange={(x) => f.set("showStaffOnReceipt", x)}
              />
              <ToggleRow
                id="rcp-tax"
                label={t("settings.receipts.showTaxBreakdown")}
                hint={t("settings.receipts.showTaxBreakdownHint")}
                checked={v.showTaxBreakdown}
                onCheckedChange={(x) => f.set("showTaxBreakdown", x)}
              />
            </div>
          </SettingsCard>
        </div>
        <div className="xl:sticky xl:top-20">
          <div className="pb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">{t("settings.receipts.preview")}</div>
          <ReceiptPreview receipts={v} />
        </div>
      </div>
      <SaveBar dirty={f.dirty} pending={f.pending} onReset={f.reset} />
    </form>
  );
}
