"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import type { MembershipPlanDTO } from "@/lib/types";

import { savePlanAction } from "../membership-actions";
import { MEMBERSHIP_PERIODS, type PlanInput } from "../schema";
import { PercentInput } from "./percent-input";
import { ServiceLinesEditor } from "./service-lines-editor";
import type { CatalogService, ServiceLine } from "./types";

function fromPlan(p: MembershipPlanDTO | null): PlanInput & { includedServices: ServiceLine[] } {
  if (!p) {
    return {
      name: "",
      nameAr: "",
      description: "",
      priceMinor: 0,
      period: "monthly",
      serviceDiscountBps: 0,
      productDiscountBps: 0,
      includedServices: [],
      active: true,
    };
  }
  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr,
    description: p.description,
    priceMinor: p.priceMinor,
    period: p.period,
    serviceDiscountBps: p.serviceDiscountBps,
    productDiscountBps: p.productDiscountBps,
    includedServices: p.includedServices,
    active: p.active,
  };
}

export function PlanFormSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MembershipPlanDTO | null;
  services: CatalogService[];
}) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <PlanForm key={props.plan?.id ?? "new"} {...props} /> : null}
    </Sheet>
  );
}

function PlanForm({
  onOpenChange,
  plan,
  services,
}: {
  onOpenChange: (open: boolean) => void;
  plan: MembershipPlanDTO | null;
  services: CatalogService[];
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const [form, setForm] = useState(() => fromPlan(plan));
  const { run, pending, errorFor } = useAction(savePlanAction, {
    success: plan ? t("catalog.memberships.saved") : t("catalog.memberships.created"),
    onSuccess: () => onOpenChange(false),
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <SheetContent className="sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{plan ? t("catalog.memberships.edit") : t("catalog.memberships.new")}</SheetTitle>
        {plan ? <SheetDescription>{localName(plan, locale)}</SheetDescription> : null}
      </SheetHeader>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          void run(form);
        }}
      >
        <SheetBody className="grid gap-6">
          <FormSection title={t("common.details")}>
            <Field label={t("common.name")} htmlFor="plan-name" required error={errorFor("name")}>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("catalog.memberships.namePlaceholder")}
                aria-invalid={!!errorFor("name")}
                autoFocus
              />
            </Field>
            <Field
              label={t("common.nameAr")}
              htmlFor="plan-name-ar"
              hint={t("common.nameArHint")}
              optionalLabel={t("common.optional")}
            >
              <Input id="plan-name-ar" dir="rtl" lang="ar" value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} />
            </Field>
            <Field label={t("common.description")} htmlFor="plan-desc" optionalLabel={t("common.optional")}>
              <Textarea id="plan-desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </FormSection>

          <Separator />

          <FormSection title={t("catalog.memberships.pricing")}>
            <FieldGroup>
              <Field label={t("common.price")} htmlFor="plan-price" error={errorFor("priceMinor")}>
                <MoneyInput
                  id="plan-price"
                  value={form.priceMinor}
                  onChange={(v) => set("priceMinor", v)}
                  currency={org.currency}
                />
              </Field>
              <Field label={t("catalog.memberships.period")} htmlFor="plan-period">
                <Select value={form.period} onValueChange={(v) => set("period", v as PlanInput["period"])}>
                  <SelectTrigger id="plan-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBERSHIP_PERIODS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`catalog.memberships.periods.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </FormSection>

          <Separator />

          <FormSection title={t("catalog.memberships.benefits")} description={t("catalog.memberships.benefitsHint")}>
            <FieldGroup>
              <Field
                label={t("catalog.memberships.serviceDiscount")}
                htmlFor="plan-svc-disc"
                error={errorFor("serviceDiscountBps")}
              >
                <PercentInput
                  id="plan-svc-disc"
                  value={form.serviceDiscountBps ?? 0}
                  onChange={(v) => set("serviceDiscountBps", v)}
                />
              </Field>
              <Field
                label={t("catalog.memberships.productDiscount")}
                htmlFor="plan-prd-disc"
                error={errorFor("productDiscountBps")}
              >
                <PercentInput
                  id="plan-prd-disc"
                  value={form.productDiscountBps ?? 0}
                  onChange={(v) => set("productDiscountBps", v)}
                />
              </Field>
            </FieldGroup>
            <div className="grid gap-2">
              <div className="text-[13px] font-medium">
                {t("catalog.memberships.includedPerPeriod", { period: t(`catalog.memberships.periodNouns.${form.period}`) })}
              </div>
              <ServiceLinesEditor
                idPrefix="plan"
                value={form.includedServices}
                onChange={(v) => set("includedServices", v)}
                services={services}
                error={errorFor("includedServices")}
              />
            </div>
          </FormSection>

          <Separator />

          <label className="flex items-center justify-between gap-4">
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{t("common.active")}</span>
              <span className="text-[13px] text-muted-foreground">{t("catalog.memberships.activeHint")}</span>
            </span>
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
