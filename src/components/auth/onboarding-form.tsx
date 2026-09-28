"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { createOrganizationAction } from "@/features/org/actions";
import { signOutEverywhere } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

export function OnboardingForm({ defaultLocale, allowDemo }: { defaultLocale: Locale; allowDemo: boolean }) {
  const { t, te } = useI18n();
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [demo, setDemo] = useState(allowDemo);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFormError(null);
    const res = await createOrganizationAction({
      businessName,
      branchName,
      phone,
      defaultLocale: locale,
      demoData: demo,
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setErrors(res.fieldErrors ?? {});
    setFormError(te(res.error));
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("onboarding.title")}</h1>
        <p className="text-[15px] text-muted-foreground">{t("onboarding.subtitle")}</p>
      </div>
      <div className="grid gap-4">
        <Field label={t("onboarding.businessName")} htmlFor="businessName" error={errors.businessName ? te(errors.businessName) : null} required>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={t("onboarding.businessNamePlaceholder")}
            aria-invalid={!!errors.businessName}
            className="h-10"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("onboarding.branchName")} htmlFor="branchName" error={errors.branchName ? te(errors.branchName) : null} required>
            <Input
              id="branchName"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder={t("onboarding.branchNamePlaceholder")}
              aria-invalid={!!errors.branchName}
              className="h-10"
            />
          </Field>
          <Field label={t("onboarding.phone")} htmlFor="phone" optionalLabel={t("common.optional")}>
            <Input id="phone" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 4 000 0000" className="h-10" />
          </Field>
        </div>
        <Field label={t("onboarding.defaultLanguage")}>
          <Segmented value={locale} onValueChange={(v) => setLocale(v as Locale)} aria-label={t("onboarding.defaultLanguage")} className="w-fit">
            <SegmentedItem value="en">English</SegmentedItem>
            <SegmentedItem value="ar">العربية</SegmentedItem>
          </Segmented>
        </Field>
        {allowDemo ? (
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border bg-muted/40 p-4">
            <span className="grid gap-1">
              <span className="text-sm font-medium">{t("onboarding.demoData")}</span>
              <span className="text-[13px] leading-relaxed text-muted-foreground">{t("onboarding.demoDataHint")}</span>
            </span>
            <Switch checked={demo} onCheckedChange={setDemo} aria-label={t("onboarding.demoData")} />
          </label>
        ) : null}
      </div>
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            await signOutEverywhere();
            router.replace("/login");
          }}
        >
          {t("onboarding.useAnother")}
        </Button>
        <Button type="submit" size="lg" disabled={pending || !businessName || !branchName}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {pending ? t("onboarding.creating") : t("onboarding.create")}
        </Button>
      </div>
    </form>
  );
}
