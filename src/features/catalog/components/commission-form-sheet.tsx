"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import type { CommissionRuleDTO } from "@/lib/types";

import { saveCommissionRuleAction } from "../commission-actions";
import { ruleSpecificity } from "../commission";
import type { CommissionRuleInput } from "../schema";
import { PercentInput } from "./percent-input";
import type { CatalogService, CatalogStaff } from "./types";

const ANY = "__any";
const ITEM_TYPES = ["service", "product", "all"] as const;
export const LEVEL_KEYS = ["general", "staff", "service", "staffService"] as const;

function fromRule(r: CommissionRuleDTO | null): CommissionRuleInput {
  if (!r) return { name: "", itemType: "service", staffId: null, serviceId: null, rateBps: 1000, priority: 0, active: true };
  return {
    id: r.id,
    name: r.name,
    itemType: r.itemType,
    staffId: r.staffId,
    serviceId: r.serviceId,
    rateBps: r.rateBps,
    priority: r.priority,
    active: r.active,
  };
}

export function CommissionFormSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: CommissionRuleDTO | null;
  staff: CatalogStaff[];
  services: CatalogService[];
}) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <RuleForm key={props.rule?.id ?? "new"} {...props} /> : null}
    </Sheet>
  );
}

function RuleForm({
  onOpenChange,
  rule,
  staff,
  services,
}: {
  onOpenChange: (open: boolean) => void;
  rule: CommissionRuleDTO | null;
  staff: CatalogStaff[];
  services: CatalogService[];
}) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState(() => fromRule(rule));
  const { run, pending, errorFor } = useAction(saveCommissionRuleAction, {
    success: rule ? t("catalog.commissions.saved") : t("catalog.commissions.created"),
    onSuccess: () => onOpenChange(false),
  });
  const set = <K extends keyof CommissionRuleInput>(key: K, value: CommissionRuleInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const level =
    LEVEL_KEYS[
      ruleSpecificity({ staffId: form.staffId ?? null, serviceId: form.itemType === "product" ? null : (form.serviceId ?? null) })
    ];
  const staffOptions = staff.filter((s) => s.status !== "archived" || s.id === form.staffId);

  return (
    <SheetContent className="sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>{rule ? t("catalog.commissions.edit") : t("catalog.commissions.new")}</SheetTitle>
        {rule ? <SheetDescription>{rule.name}</SheetDescription> : null}
      </SheetHeader>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          void run({ ...form, serviceId: form.itemType === "product" ? null : form.serviceId });
        }}
      >
        <SheetBody className="grid gap-6">
          <Field label={t("common.name")} htmlFor="rule-name" required error={errorFor("name")}>
            <Input
              id="rule-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("catalog.commissions.namePlaceholder")}
              aria-invalid={!!errorFor("name")}
              autoFocus
            />
          </Field>

          <FormSection title={t("catalog.commissions.appliesTo")} description={t(`catalog.commissions.levelHint.${level}`)}>
            <Field label={t("catalog.commissions.itemType")} htmlFor="rule-type">
              <Select value={form.itemType} onValueChange={(v) => set("itemType", v as CommissionRuleInput["itemType"])}>
                <SelectTrigger id="rule-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((it) => (
                    <SelectItem key={it} value={it}>
                      {t(`catalog.commissions.itemTypes.${it}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <FieldGroup>
              <Field label={t("common.staff")} htmlFor="rule-staff" error={errorFor("staffId")}>
                <Select value={form.staffId ?? ANY} onValueChange={(v) => set("staffId", v === ANY ? null : v)}>
                  <SelectTrigger id="rule-staff">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>{t("catalog.commissions.anyStaff")}</SelectItem>
                    {staffOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {form.itemType !== "product" ? (
                <Field label={t("common.service")} htmlFor="rule-service" error={errorFor("serviceId")}>
                  <Select value={form.serviceId ?? ANY} onValueChange={(v) => set("serviceId", v === ANY ? null : v)}>
                    <SelectTrigger id="rule-service">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>{t("catalog.commissions.anyService")}</SelectItem>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {localName(s, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </FieldGroup>
          </FormSection>

          <Separator />

          <FieldGroup>
            <Field
              label={t("catalog.commissions.rate")}
              htmlFor="rule-rate"
              hint={t("catalog.commissions.rateHint")}
              error={errorFor("rateBps")}
            >
              <PercentInput
                id="rule-rate"
                value={form.rateBps}
                onChange={(v) => set("rateBps", v)}
                invalid={!!errorFor("rateBps")}
              />
            </Field>
            <Field
              label={t("catalog.commissions.priority")}
              htmlFor="rule-priority"
              hint={t("catalog.commissions.priorityHint")}
              error={errorFor("priority")}
            >
              <Input
                id="rule-priority"
                inputMode="numeric"
                dir="ltr"
                value={form.priority ?? 0}
                onChange={(e) => set("priority", Math.min(1000, Number(e.target.value.replace(/\D/g, "")) || 0))}
              />
            </Field>
          </FieldGroup>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">{t("common.active")}</span>
            <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
          </label>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending || !form.name.trim()}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
