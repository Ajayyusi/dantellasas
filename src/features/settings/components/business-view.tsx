"use client";

import { ImageIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";

import { removeLogoAction, uploadLogoAction } from "../actions";
import type { SectionValues } from "../schema";
import { SaveBar, SectionHeader, SettingsCard } from "./form-parts";
import { useSettingsForm } from "./use-settings-form";

const MAX_LOGO_MB = 2;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function BusinessView({
  initial,
  logoUrl,
  registrationLabel,
}: {
  initial: SectionValues<"business">;
  logoUrl: string;
  registrationLabel: string;
}) {
  const { t } = useI18n();
  const f = useSettingsForm("business", initial);
  const v = f.values;

  return (
    <div className="grid gap-5">
      <SectionHeader title={t("settings.sections.business.title")} description={t("settings.sections.business.description")} />
      <LogoCard url={logoUrl} name={v.displayName} />
      <form onSubmit={f.onSubmit} className="grid gap-5" noValidate>
        <SettingsCard title={t("settings.business.identity")} description={t("settings.business.identityHint")}>
          <FieldGroup>
            <Field
              label={t("settings.business.displayName")}
              htmlFor="biz-display"
              hint={t("settings.business.displayNameHint")}
              required
              error={f.errorFor("values.displayName")}
            >
              <Input id="biz-display" value={v.displayName} onChange={(e) => f.set("displayName", e.target.value)} />
            </Field>
            <Field
              label={t("settings.business.legalName")}
              htmlFor="biz-legal"
              hint={t("settings.business.legalNameHint")}
              error={f.errorFor("values.legalName")}
            >
              <Input id="biz-legal" value={v.legalName ?? ""} onChange={(e) => f.set("legalName", e.target.value)} />
            </Field>
            <Field
              label={registrationLabel}
              htmlFor="biz-trn"
              hint={t("settings.business.trnHint")}
              error={f.errorFor("values.trn")}
            >
              <Input
                id="biz-trn"
                dir="ltr"
                inputMode="numeric"
                className="tabular"
                value={v.trn ?? ""}
                onChange={(e) => f.set("trn", e.target.value)}
                placeholder="100XXXXXXXXXXX3"
              />
            </Field>
          </FieldGroup>
        </SettingsCard>

        <SettingsCard title={t("settings.business.contact")}>
          <div className="grid gap-4">
            <FieldGroup>
              <Field label={t("settings.business.phone")} htmlFor="biz-phone" error={f.errorFor("values.phone")}>
                <Input
                  id="biz-phone"
                  type="tel"
                  dir="ltr"
                  value={v.phone ?? ""}
                  onChange={(e) => f.set("phone", e.target.value)}
                  placeholder="+971 4 000 0000"
                />
              </Field>
              <Field label={t("settings.business.email")} htmlFor="biz-email" error={f.errorFor("values.email")}>
                <Input id="biz-email" type="email" dir="ltr" value={v.email ?? ""} onChange={(e) => f.set("email", e.target.value)} />
              </Field>
              <Field label={t("settings.business.website")} htmlFor="biz-web" error={f.errorFor("values.website")}>
                <Input
                  id="biz-web"
                  dir="ltr"
                  value={v.website ?? ""}
                  onChange={(e) => f.set("website", e.target.value)}
                  placeholder="https://"
                />
              </Field>
            </FieldGroup>
            <Field label={t("settings.business.address")} htmlFor="biz-address" error={f.errorFor("values.address")}>
              <Textarea id="biz-address" rows={2} value={v.address ?? ""} onChange={(e) => f.set("address", e.target.value)} />
            </Field>
          </div>
        </SettingsCard>
        <SaveBar dirty={f.dirty} pending={f.pending} onReset={f.reset} disabled={!v.displayName.trim()} />
      </form>
    </div>
  );
}

function LogoCard({ url, name }: { url: string; name: string }) {
  const { t, te } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<"upload" | "remove" | null>(null);

  async function upload(file: File) {
    if (!LOGO_TYPES.includes(file.type)) return toast.error(t("errors.fileType"));
    if (file.size > MAX_LOGO_MB * 1024 * 1024) return toast.error(t("errors.fileTooLarge", { max: MAX_LOGO_MB }));
    const form = new FormData();
    form.set("file", file);
    setPending("upload");
    try {
      const res = await uploadLogoAction(form);
      if (res.ok) toast.success(t("settings.business.logoUploaded"));
      else toast.error(res.error === "errors.fileTooLarge" ? t("errors.fileTooLarge", { max: MAX_LOGO_MB }) : te(res.error));
    } finally {
      setPending(null);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setPending("remove");
    try {
      const res = await removeLogoAction({});
      if (res.ok) toast.success(t("settings.business.logoRemoved"));
      else toast.error(te(res.error));
    } finally {
      setPending(null);
    }
  }

  return (
    <SettingsCard>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar className="size-20 rounded-xl border bg-muted">
          {url ? <AvatarImage src={url} alt={name} className="object-contain" /> : null}
          <AvatarFallback className="rounded-xl bg-muted text-muted-foreground">
            <ImageIcon className="size-6" />
          </AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="text-sm font-medium">{t("settings.business.logo")}</p>
          <p className="text-[13px] text-muted-foreground">{url ? t("settings.business.logoHint") : `${t("settings.business.noLogo")} · ${t("settings.business.logoHint")}`}</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={input}
            type="file"
            accept={LOGO_TYPES.join(",")}
            className="sr-only"
            aria-label={t("settings.business.uploadLogo")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button type="button" variant="outline" disabled={!!pending} onClick={() => input.current?.click()}>
            {pending === "upload" ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
            {url ? t("settings.business.replaceLogo") : t("settings.business.uploadLogo")}
          </Button>
          {url ? (
            <Button type="button" variant="ghost" disabled={!!pending} onClick={remove} aria-label={t("settings.business.removeLogo")}>
              {pending === "remove" ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
              <span className="hidden sm:inline">{t("settings.business.removeLogo")}</span>
            </Button>
          ) : null}
        </div>
      </div>
    </SettingsCard>
  );
}
