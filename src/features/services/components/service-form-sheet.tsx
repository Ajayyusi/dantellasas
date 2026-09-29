"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { MoneyInput } from "@/components/common/money-input";
import { MultiSelect } from "@/components/common/multi-select";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { formatPercent } from "@/lib/money";
import type { ServiceCategoryDTO, ServiceDTO } from "@/lib/types";

import { saveServiceAction } from "../actions";
import type { ServiceInput } from "../schema";

export interface StaffOption {
  id: string;
  displayName: string;
  color: string;
  photoUrl: string | null;
}

const DURATIONS = [10, 15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240];

function emptyForm(categoryId: string, duration: number): ServiceInput {
  return {
    categoryId,
    name: "",
    nameAr: "",
    description: "",
    durationMin: duration,
    bufferMin: 0,
    priceMinor: 0,
    taxMode: "default",
    taxRateId: null,
    branchIds: [],
    staffIds: [],
    onlineBookable: true,
    active: true,
  };
}

function fromService(s: ServiceDTO): ServiceInput {
  return {
    id: s.id,
    categoryId: s.categoryId,
    name: s.name,
    nameAr: s.nameAr,
    description: s.description,
    durationMin: s.durationMin,
    bufferMin: s.bufferMin,
    priceMinor: s.priceMinor,
    taxMode: s.taxExempt ? "exempt" : s.taxRateId ? "rate" : "default",
    taxRateId: s.taxRateId,
    branchIds: s.branchIds,
    staffIds: s.staffIds,
    onlineBookable: s.onlineBookable,
    active: s.active,
  };
}

export function ServiceFormSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceDTO | null;
  defaultCategoryId: string;
  categories: ServiceCategoryDTO[];
  staff: StaffOption[];
}) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ServiceForm key={props.service?.id ?? `new-${props.defaultCategoryId}`} {...props} /> : null}
    </Sheet>
  );
}

function ServiceForm({
  onOpenChange,
  service,
  defaultCategoryId,
  categories,
  staff,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceDTO | null;
  defaultCategoryId: string;
  categories: ServiceCategoryDTO[];
  staff: StaffOption[];
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const [form, setForm] = useState<ServiceInput>(() =>
    service ? fromService(service) : emptyForm(defaultCategoryId, org.settings.appointments.defaultDurationMinutes),
  );
  const { run, pending, errorFor } = useAction(saveServiceAction, {
    success: service ? t("services.saved") : t("services.created"),
    onSuccess: () => onOpenChange(false),
  });

  const set = <K extends keyof ServiceInput>(key: K, value: ServiceInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const tax = org.settings.tax;
  const defaultRate = tax.rates.find((r) => r.isDefault) ?? tax.rates[0];
  const durations = DURATIONS.includes(form.durationMin) ? DURATIONS : [...DURATIONS, form.durationMin].sort((a, b) => a - b);

  return (
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{service ? t("services.editService") : t("services.newService")}</SheetTitle>
          {service ? <SheetDescription>{localName(service, locale)}</SheetDescription> : null}
        </SheetHeader>
        <form
          id="service-form"
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            void run(form);
          }}
        >
          <SheetBody className="grid gap-6">
            <FormSection title={t("common.details")}>
              <Field label={t("services.name")} htmlFor="svc-name" required error={errorFor("name")}>
                <Input
                  id="svc-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder={t("services.namePlaceholder")}
                  aria-invalid={!!errorFor("name")}
                  autoFocus
                />
              </Field>
              <Field label={t("common.nameAr")} htmlFor="svc-name-ar" hint={t("common.nameArHint")} optionalLabel={t("common.optional")}>
                <Input id="svc-name-ar" dir="rtl" lang="ar" value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} />
              </Field>
              <Field label={t("common.category")} htmlFor="svc-category">
                <Select value={form.categoryId || "__none"} onValueChange={(v) => set("categoryId", v === "__none" ? "" : v)}>
                  <SelectTrigger id="svc-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">{t("services.uncategorized")}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {localName(c, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("common.description")} htmlFor="svc-desc" optionalLabel={t("common.optional")}>
                <Textarea id="svc-desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </FormSection>

            <Separator />

            <FormSection title={`${t("services.price")} & ${t("services.duration").toLowerCase()}`}>
              <FieldGroup>
                <Field
                  label={t("services.price")}
                  htmlFor="svc-price"
                  hint={tax.enabled ? (tax.pricesIncludeTax ? t("services.priceInclTax") : t("services.priceExclTax")) : undefined}
                  error={errorFor("priceMinor")}
                >
                  <MoneyInput id="svc-price" value={form.priceMinor ?? 0} onChange={(v) => set("priceMinor", v)} currency={org.currency} />
                </Field>
                <Field label={t("services.duration")} htmlFor="svc-duration">
                  <Select value={String(form.durationMin)} onValueChange={(v) => set("durationMin", Number(v))}>
                    <SelectTrigger id="svc-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {durations.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {t("common.minutes", { count: d })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("services.buffer")} htmlFor="svc-buffer" hint={t("services.bufferHint")}>
                  <Select value={String(form.bufferMin ?? 0)} onValueChange={(v) => set("bufferMin", Number(v))}>
                    <SelectTrigger id="svc-buffer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 5, 10, 15, 20, 30].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {t("common.minutes", { count: d })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {tax.enabled ? (
                  <Field label={t("services.tax")} htmlFor="svc-tax">
                    <Select
                      value={form.taxMode === "rate" ? `rate:${form.taxRateId}` : form.taxMode}
                      onValueChange={(v) => {
                        if (v.startsWith("rate:")) setForm((f) => ({ ...f, taxMode: "rate", taxRateId: v.slice(5) }));
                        else setForm((f) => ({ ...f, taxMode: v as "default" | "exempt", taxRateId: null }));
                      }}
                    >
                      <SelectTrigger id="svc-tax">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">
                          {t("services.taxDefault", { rate: defaultRate ? formatPercent(defaultRate.rateBps / 10000, locale, 2) : "0%" })}
                        </SelectItem>
                        {tax.rates
                          .filter((r) => !r.isDefault)
                          .map((r) => (
                            <SelectItem key={r.id} value={`rate:${r.id}`}>
                              {r.name} ({formatPercent(r.rateBps / 10000, locale, 2)})
                            </SelectItem>
                          ))}
                        <SelectItem value="exempt">{t("services.taxExempt")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}
              </FieldGroup>
            </FormSection>

            <Separator />

            <FormSection title={t("services.staff")} description={t("services.staffHint")}>
              <MultiSelect
                id="svc-staff"
                options={staff.map((s) => ({
                  value: s.id,
                  label: s.displayName,
                  icon: <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-5 text-[9px]" />,
                }))}
                value={form.staffIds ?? []}
                onChange={(v) => set("staffIds", v)}
                emptyLabel={t("services.anyStaff")}
              />
            </FormSection>

            {org.branches.length > 1 ? (
              <FormSection title={t("services.branches")} description={t("services.allBranchesHint")}>
                <MultiSelect
                  options={org.branches.map((b) => ({ value: b.id, label: b.name }))}
                  value={form.branchIds ?? []}
                  onChange={(v) => set("branchIds", v)}
                  emptyLabel={t("common.allBranches")}
                />
              </FormSection>
            ) : null}

            <Separator />

            <div className="grid gap-3">
              <label className="flex items-center justify-between gap-4">
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">{t("services.active")}</span>
                  <span className="text-[14px] text-muted-foreground">{t("services.activeHint")}</span>
                </span>
                <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
              </label>
              <label className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">{t("services.onlineBookable")}</span>
                <Switch checked={form.onlineBookable} onCheckedChange={(v) => set("onlineBookable", v)} />
              </label>
            </div>
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
