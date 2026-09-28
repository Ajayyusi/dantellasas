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
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { formatPercent } from "@/lib/money";
import type { PackageDTO } from "@/lib/types";

import { savePackageAction } from "../package-actions";
import { packageValueMinor, savingRatio } from "../periods";
import type { PackageInput } from "../schema";
import { ServiceLinesEditor } from "./service-lines-editor";
import type { CatalogService, ServiceLine } from "./types";

const VALIDITY_PRESETS = [30, 90, 180, 365, 0];

function fromPackage(p: PackageDTO | null): PackageInput & { items: ServiceLine[] } {
  if (!p) {
    return {
      name: "",
      nameAr: "",
      description: "",
      kind: "services",
      priceMinor: 0,
      validityDays: 365,
      items: [],
      creditMinor: 0,
      active: true,
    };
  }
  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr,
    description: p.description,
    kind: p.kind,
    priceMinor: p.priceMinor,
    validityDays: p.validityDays,
    items: p.items,
    creditMinor: p.creditMinor,
    active: p.active,
  };
}

export function PackageFormSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: PackageDTO | null;
  services: CatalogService[];
}) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <PackageForm key={props.pkg?.id ?? "new"} {...props} /> : null}
    </Sheet>
  );
}

function PackageForm({
  onOpenChange,
  pkg,
  services,
}: {
  onOpenChange: (open: boolean) => void;
  pkg: PackageDTO | null;
  services: CatalogService[];
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const [form, setForm] = useState(() => fromPackage(pkg));
  const { run, pending, errorFor } = useAction(savePackageAction, {
    success: pkg ? t("catalog.packages.saved") : t("catalog.packages.created"),
    onSuccess: () => onOpenChange(false),
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const prices = new Map(services.map((s) => [s.id, s.priceMinor]));
  const value = packageValueMinor({ kind: form.kind, creditMinor: form.creditMinor ?? 0, items: form.items }, (id) =>
    prices.get(id),
  );
  const saving = savingRatio(value, form.priceMinor);
  const validityOptions = VALIDITY_PRESETS.includes(form.validityDays)
    ? VALIDITY_PRESETS
    : [...VALIDITY_PRESETS, form.validityDays];

  return (
    <SheetContent className="sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{pkg ? t("catalog.packages.edit") : t("catalog.packages.new")}</SheetTitle>
        {pkg ? <SheetDescription>{localName(pkg, locale)}</SheetDescription> : null}
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
            <Field label={t("common.name")} htmlFor="pkg-name" required error={errorFor("name")}>
              <Input
                id="pkg-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("catalog.packages.namePlaceholder")}
                aria-invalid={!!errorFor("name")}
                autoFocus
              />
            </Field>
            <Field
              label={t("common.nameAr")}
              htmlFor="pkg-name-ar"
              hint={t("common.nameArHint")}
              optionalLabel={t("common.optional")}
            >
              <Input id="pkg-name-ar" dir="rtl" lang="ar" value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} />
            </Field>
            <Field label={t("common.description")} htmlFor="pkg-desc" optionalLabel={t("common.optional")}>
              <Textarea id="pkg-desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </FormSection>

          <Separator />

          <FormSection title={t("catalog.packages.contents")}>
            <Segmented
              value={form.kind}
              onValueChange={(v) => set("kind", v as "services" | "credit")}
              aria-label={t("catalog.packages.kind")}
              className="justify-self-start"
            >
              <SegmentedItem value="services">{t("catalog.packages.kinds.services")}</SegmentedItem>
              <SegmentedItem value="credit">{t("catalog.packages.kinds.credit")}</SegmentedItem>
            </Segmented>
            {form.kind === "services" ? (
              <>
                <p className="text-[13px] text-muted-foreground">{t("catalog.packages.servicesHint")}</p>
                <ServiceLinesEditor
                  idPrefix="pkg"
                  value={form.items}
                  onChange={(items) => set("items", items)}
                  services={services}
                  error={errorFor("items")}
                />
              </>
            ) : (
              <Field
                label={t("catalog.packages.creditValue")}
                htmlFor="pkg-credit"
                hint={t("catalog.packages.creditHint")}
                error={errorFor("creditMinor")}
              >
                <MoneyInput
                  id="pkg-credit"
                  value={form.creditMinor ?? 0}
                  onChange={(v) => set("creditMinor", v)}
                  currency={org.currency}
                  invalid={!!errorFor("creditMinor")}
                />
              </Field>
            )}
          </FormSection>

          <Separator />

          <FormSection title={t("catalog.packages.pricing")}>
            <FieldGroup>
              <Field label={t("catalog.packages.price")} htmlFor="pkg-price" error={errorFor("priceMinor")}>
                <MoneyInput
                  id="pkg-price"
                  value={form.priceMinor}
                  onChange={(v) => set("priceMinor", v)}
                  currency={org.currency}
                />
              </Field>
              <Field label={t("catalog.packages.validity")} htmlFor="pkg-validity" hint={t("catalog.packages.validityHint")}>
                <Select value={String(form.validityDays)} onValueChange={(v) => set("validityDays", Number(v))}>
                  <SelectTrigger id="pkg-validity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {validityOptions.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d === 0 ? t("catalog.packages.noExpiry") : t("common.days", { count: d })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-3">
              <div>
                <div className="text-[13px] text-muted-foreground">{t("catalog.packages.value")}</div>
                <div className="font-medium tabular">{org.money(value)}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">{t("catalog.packages.price")}</div>
                <div className="font-medium tabular">{org.money(form.priceMinor)}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">{t("catalog.packages.clientSaves")}</div>
                <div className="font-medium tabular text-success">
                  {saving ? `${org.money(value - form.priceMinor)} (${formatPercent(saving, locale, 1)})` : "—"}
                </div>
              </div>
            </div>
          </FormSection>

          <Separator />

          <label className="flex items-center justify-between gap-4">
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{t("common.active")}</span>
              <span className="text-[13px] text-muted-foreground">{t("catalog.packages.activeHint")}</span>
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
