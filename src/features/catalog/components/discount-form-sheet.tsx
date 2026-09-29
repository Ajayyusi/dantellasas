"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import type { DiscountDTO } from "@/lib/types";

import { saveDiscountAction } from "../discount-actions";
import type { DiscountInput } from "../schema";
import { PercentInput } from "./percent-input";

const APPLIES = ["all", "services", "products"] as const;

function fromDiscount(d: DiscountDTO | null): DiscountInput {
  if (!d) {
    return {
      name: "",
      code: "",
      kind: "percent",
      valueBps: 1000,
      valueMinor: 0,
      appliesTo: "all",
      startsAt: null,
      endsAt: null,
      maxUses: null,
      active: true,
    };
  }
  return {
    id: d.id,
    name: d.name,
    code: d.code,
    kind: d.kind,
    valueBps: d.valueBps,
    valueMinor: d.valueMinor,
    appliesTo: d.appliesTo,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
    maxUses: d.maxUses,
    active: d.active,
  };
}

export function DiscountFormSheet(props: { open: boolean; onOpenChange: (open: boolean) => void; discount: DiscountDTO | null }) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <DiscountForm key={props.discount?.id ?? "new"} {...props} /> : null}
    </Sheet>
  );
}

function DiscountForm({ onOpenChange, discount }: { onOpenChange: (open: boolean) => void; discount: DiscountDTO | null }) {
  const { t } = useI18n();
  const org = useOrg();
  const [form, setForm] = useState(() => fromDiscount(discount));
  const { run, pending, errorFor } = useAction(saveDiscountAction, {
    success: discount ? t("catalog.discounts.saved") : t("catalog.discounts.created"),
    onSuccess: () => onOpenChange(false),
  });
  const set = <K extends keyof DiscountInput>(key: K, value: DiscountInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <SheetContent className="sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>{discount ? t("catalog.discounts.edit") : t("catalog.discounts.new")}</SheetTitle>
        {discount ? <SheetDescription>{discount.name}</SheetDescription> : null}
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
            <Field label={t("common.name")} htmlFor="disc-name" required error={errorFor("name")}>
              <Input
                id="disc-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("catalog.discounts.namePlaceholder")}
                aria-invalid={!!errorFor("name")}
                autoFocus
              />
            </Field>
            <Field
              label={t("catalog.discounts.code")}
              htmlFor="disc-code"
              hint={t("catalog.discounts.codeHint")}
              optionalLabel={t("common.optional")}
              error={errorFor("code")}
            >
              <Input
                id="disc-code"
                dir="ltr"
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="WELCOME10"
                className="font-mono uppercase tracking-wide"
                aria-invalid={!!errorFor("code")}
                maxLength={30}
              />
            </Field>
          </FormSection>

          <Separator />

          <FormSection title={t("catalog.discounts.value")}>
            <Segmented
              value={form.kind}
              onValueChange={(v) => set("kind", v as DiscountInput["kind"])}
              aria-label={t("catalog.discounts.kind")}
              className="justify-self-start"
            >
              <SegmentedItem value="percent">{t("catalog.discounts.kinds.percent")}</SegmentedItem>
              <SegmentedItem value="fixed">{t("catalog.discounts.kinds.fixed")}</SegmentedItem>
            </Segmented>
            <FieldGroup>
              {form.kind === "percent" ? (
                <Field label={t("catalog.discounts.percentOff")} htmlFor="disc-value" error={errorFor("valueBps")}>
                  <PercentInput
                    id="disc-value"
                    value={form.valueBps ?? 0}
                    onChange={(v) => set("valueBps", v)}
                    invalid={!!errorFor("valueBps")}
                  />
                </Field>
              ) : (
                <Field label={t("catalog.discounts.amountOff")} htmlFor="disc-value" error={errorFor("valueMinor")}>
                  <MoneyInput
                    id="disc-value"
                    value={form.valueMinor ?? 0}
                    onChange={(v) => set("valueMinor", v)}
                    currency={org.currency}
                    invalid={!!errorFor("valueMinor")}
                  />
                </Field>
              )}
              <Field label={t("catalog.discounts.appliesTo")} htmlFor="disc-applies">
                <Select value={form.appliesTo} onValueChange={(v) => set("appliesTo", v as DiscountInput["appliesTo"])}>
                  <SelectTrigger id="disc-applies">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLIES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {t(`catalog.discounts.applies.${a}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </FormSection>

          <Separator />

          <FormSection title={t("catalog.discounts.limits")} description={t("catalog.discounts.limitsHint")}>
            <FieldGroup>
              <Field label={t("catalog.discounts.startsAt")} htmlFor="disc-start" optionalLabel={t("common.optional")}>
                <Input
                  id="disc-start"
                  type="date"
                  value={form.startsAt ?? ""}
                  onChange={(e) => set("startsAt", e.target.value || null)}
                />
              </Field>
              <Field
                label={t("catalog.discounts.endsAt")}
                htmlFor="disc-end"
                optionalLabel={t("common.optional")}
                error={errorFor("endsAt")}
              >
                <Input
                  id="disc-end"
                  type="date"
                  min={form.startsAt ?? undefined}
                  value={form.endsAt ?? ""}
                  onChange={(e) => set("endsAt", e.target.value || null)}
                />
              </Field>
              <Field
                label={t("catalog.discounts.maxUses")}
                htmlFor="disc-max"
                hint={t("catalog.discounts.maxUsesHint")}
                error={errorFor("maxUses")}
              >
                <Input
                  id="disc-max"
                  inputMode="numeric"
                  dir="ltr"
                  value={form.maxUses ?? ""}
                  placeholder={t("catalog.discounts.unlimited")}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    set("maxUses", digits ? Math.min(1_000_000, Number(digits)) : null);
                  }}
                />
              </Field>
              {discount ? (
                <Field label={t("catalog.discounts.used")} htmlFor="disc-used">
                  <Input id="disc-used" readOnly disabled value={discount.usedCount} dir="ltr" />
                </Field>
              ) : null}
            </FieldGroup>
          </FormSection>

          <Separator />

          <label className="flex items-center justify-between gap-4">
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{t("common.active")}</span>
              <span className="text-[14px] text-muted-foreground">{t("catalog.discounts.activeHint")}</span>
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
