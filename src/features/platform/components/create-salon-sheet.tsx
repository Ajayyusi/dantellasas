"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";

import { createSalonAction, type CreatedSalon } from "../actions";

interface FormState {
  businessName: string;
  branchName: string;
  phone: string;
  defaultLocale: "en" | "ar";
  ownerName: string;
  ownerEmail: string;
  demoData: boolean;
}

export function CreateSalonSheet({
  open,
  onOpenChange,
  allowDemo,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowDemo: boolean;
  onCreated: (salon: CreatedSalon) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? <CreateSalonForm onOpenChange={onOpenChange} allowDemo={allowDemo} onCreated={onCreated} /> : null}
    </Sheet>
  );
}

function CreateSalonForm({
  onOpenChange,
  allowDemo,
  onCreated,
}: {
  onOpenChange: (open: boolean) => void;
  allowDemo: boolean;
  onCreated: (salon: CreatedSalon) => void;
}) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState<FormState>({
    businessName: "",
    branchName: "",
    phone: "",
    defaultLocale: locale,
    ownerName: "",
    ownerEmail: "",
    demoData: false,
  });
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const create = useAction(createSalonAction, {
    success: false,
    onSuccess: (salon) => {
      onOpenChange(false);
      onCreated(salon);
    },
  });
  const { pending, errorFor } = create;
  const ready = form.businessName.trim() && form.branchName.trim() && form.ownerName.trim() && form.ownerEmail.trim();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void create.run({ ...form, phone: form.phone || undefined, demoData: allowDemo && form.demoData });
  }

  return (
    <SheetContent className="sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>{t("platform.create.title")}</SheetTitle>
        <SheetDescription>{t("platform.create.description")}</SheetDescription>
      </SheetHeader>
      <form className="contents" onSubmit={submit} noValidate>
        <SheetBody className="grid gap-6">
          <FormSection title={t("platform.create.business")}>
            <Field label={t("platform.create.businessName")} htmlFor="sl-name" required error={errorFor("businessName")}>
              <Input id="sl-name" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} autoComplete="off" autoFocus />
            </Field>
            <FieldGroup>
              <Field label={t("platform.create.branchName")} htmlFor="sl-branch" required error={errorFor("branchName")}>
                <Input
                  id="sl-branch"
                  value={form.branchName}
                  onChange={(e) => set("branchName", e.target.value)}
                  placeholder={t("platform.create.branchNamePlaceholder")}
                  autoComplete="off"
                />
              </Field>
              <Field label={t("platform.create.phone")} htmlFor="sl-phone" optionalLabel={t("common.optional")} error={errorFor("phone")}>
                <Input id="sl-phone" type="tel" dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+971 4 000 0000" />
              </Field>
            </FieldGroup>
            <Field label={t("platform.create.language")}>
              <Segmented
                value={form.defaultLocale}
                onValueChange={(v) => set("defaultLocale", v as FormState["defaultLocale"])}
                aria-label={t("platform.create.language")}
                className="w-fit"
              >
                <SegmentedItem value="en">English</SegmentedItem>
                <SegmentedItem value="ar">العربية</SegmentedItem>
              </Segmented>
            </Field>
          </FormSection>
          <Separator />
          <FormSection title={t("platform.create.owner")}>
            <Field label={t("platform.create.ownerName")} htmlFor="sl-owner" required error={errorFor("ownerName")}>
              <Input id="sl-owner" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} autoComplete="off" />
            </Field>
            <Field
              label={t("platform.create.ownerEmail")}
              htmlFor="sl-email"
              required
              hint={t("platform.create.ownerEmailHint")}
              error={errorFor("ownerEmail")}
            >
              <Input id="sl-email" type="email" dir="ltr" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} autoComplete="off" />
            </Field>
          </FormSection>
          {allowDemo ? (
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border bg-muted/40 p-4">
              <span className="grid gap-1">
                <span className="text-sm font-medium">{t("platform.create.demoData")}</span>
                <span className="text-[14px] leading-relaxed text-muted-foreground">{t("platform.create.demoDataHint")}</span>
              </span>
              <Switch checked={form.demoData} onCheckedChange={(v) => set("demoData", v)} aria-label={t("platform.create.demoData")} />
            </label>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending || !ready}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {pending ? t("platform.create.creating") : t("platform.create.submit")}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
