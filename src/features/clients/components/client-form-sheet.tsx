"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { ClientDTO } from "@/lib/types";

import { saveClientAction } from "../actions";
import type { ClientInput } from "../schema";
import type { StaffOption } from "../types";
import { BirthdayField, type BirthdayDraft } from "./birthday-field";
import { TagInput } from "./tag-input";

const NONE = "__none";

function fromClient(c: ClientDTO | null): ClientInput {
  return {
    id: c?.id,
    firstName: c?.firstName ?? "",
    lastName: c?.lastName ?? "",
    phone: c?.phone ?? "",
    email: c?.email ?? "",
    birthday: c?.birthday ?? null,
    gender: c?.gender ?? "",
    nationality: c?.nationality ?? "",
    source: c?.source ?? "",
    tags: c?.tags ?? [],
    notes: c?.notes ?? "",
    preferredStaffId: c?.preferredStaffId ?? null,
    marketingConsent: c?.marketingConsent ?? false,
  };
}

export function ClientFormSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientDTO | null;
  staff: StaffOption[];
  tagSuggestions?: string[];
}) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ClientForm key={props.client?.id ?? "new"} {...props} /> : null}
    </Sheet>
  );
}

function ClientForm({
  onOpenChange,
  client,
  staff,
  tagSuggestions = [],
}: {
  onOpenChange: (open: boolean) => void;
  client: ClientDTO | null;
  staff: StaffOption[];
  tagSuggestions?: string[];
}) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const [form, setForm] = useState<ClientInput>(() => fromClient(client));
  const [birthday, setBirthday] = useState<BirthdayDraft>(() => ({
    day: client?.birthday?.day ? String(client.birthday.day) : "",
    month: client?.birthday?.month ? String(client.birthday.month) : "",
    year: client?.birthday?.year ? String(client.birthday.year) : "",
  }));
  const { run, pending, errorFor } = useAction(saveClientAction, {
    success: client ? t("clients.form.saved") : t("clients.form.created"),
    onSuccess: ({ id }) => {
      onOpenChange(false);
      if (!client) router.push(`/clients/${id}`);
    },
  });

  const set = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const { askGender, sources } = org.settings.clients;
  const sourceOptions = form.source && !sources.includes(form.source) ? [...sources, form.source] : sources;
  // Inactive staff stay selectable only when already chosen for this client.
  const staffOptions = staff.filter((s) => s.active || s.id === form.preferredStaffId);

  function submit() {
    const year = Number(birthday.year);
    const composed =
      birthday.day && birthday.month
        ? {
            day: Number(birthday.day),
            month: Number(birthday.month),
            ...(birthday.year && year >= 1900 && year <= 2100 ? { year } : {}),
          }
        : null;
    void run({ ...form, birthday: composed });
  }

  return (
    <SheetContent className="sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{client ? t("clients.editClient") : t("clients.newClient")}</SheetTitle>
        {client ? <SheetDescription>{client.fullName}</SheetDescription> : null}
      </SheetHeader>
      <form
        id="client-form"
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <SheetBody className="grid gap-6">
          <FormSection title={t("clients.form.contact")}>
            <FieldGroup>
              <Field label={t("common.firstName")} htmlFor="cl-first" required error={errorFor("firstName")}>
                <Input
                  id="cl-first"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  aria-invalid={!!errorFor("firstName")}
                  autoComplete="off"
                  autoFocus
                />
              </Field>
              <Field label={t("common.lastName")} htmlFor="cl-last" error={errorFor("lastName")}>
                <Input id="cl-last" value={form.lastName ?? ""} onChange={(e) => set("lastName", e.target.value)} autoComplete="off" />
              </Field>
              <Field
                label={t("common.phone")}
                htmlFor="cl-phone"
                hint={t("clients.form.phoneHint", { code: org.settings.locale.phoneCountryCode })}
                error={errorFor("phone")}
              >
                <Input
                  id="cl-phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  className="text-start rtl:text-end"
                  value={form.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder={t("clients.form.phonePlaceholder")}
                  aria-invalid={!!errorFor("phone")}
                  autoComplete="off"
                />
              </Field>
              <Field label={t("common.email")} htmlFor="cl-email" error={errorFor("email")}>
                <Input
                  id="cl-email"
                  type="email"
                  dir="ltr"
                  className="text-start rtl:text-end"
                  value={form.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder={t("clients.form.emailPlaceholder")}
                  aria-invalid={!!errorFor("email")}
                  autoComplete="off"
                />
              </Field>
            </FieldGroup>
          </FormSection>

          <Separator />

          <FormSection title={t("clients.form.details")}>
            <BirthdayField value={birthday} onChange={setBirthday} error={errorFor("birthday") ?? errorFor("birthday.day")} />
            <FieldGroup>
              {askGender ? (
                <Field label={t("clients.form.gender")} htmlFor="cl-gender">
                  <Select value={form.gender || NONE} onValueChange={(v) => set("gender", v === NONE ? "" : (v as ClientInput["gender"]))}>
                    <SelectTrigger id="cl-gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("clients.form.genderUnset")}</SelectItem>
                      <SelectItem value="female">{t("common.gender.female")}</SelectItem>
                      <SelectItem value="male">{t("common.gender.male")}</SelectItem>
                      <SelectItem value="other">{t("common.gender.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field label={t("clients.form.nationality")} htmlFor="cl-nat">
                <Input
                  id="cl-nat"
                  value={form.nationality ?? ""}
                  onChange={(e) => set("nationality", e.target.value)}
                  placeholder={t("clients.form.nationalityPlaceholder")}
                />
              </Field>
              <Field label={t("clients.form.source")} htmlFor="cl-source">
                <Select value={form.source || NONE} onValueChange={(v) => set("source", v === NONE ? "" : v)}>
                  <SelectTrigger id="cl-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("clients.form.sourceNone")}</SelectItem>
                    {sourceOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("clients.form.preferredStaff")} htmlFor="cl-staff">
                <Select value={form.preferredStaffId ?? NONE} onValueChange={(v) => set("preferredStaffId", v === NONE ? null : v)}>
                  <SelectTrigger id="cl-staff">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("clients.form.anyStaff")}</SelectItem>
                    {staffOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-5 text-[9px]" />
                        {s.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </FormSection>

          <Separator />

          <FormSection title={t("clients.form.tagsNotes")}>
            <Field label={t("clients.form.tags")} htmlFor="cl-tags" hint={t("clients.form.tagsHint")} error={errorFor("tags")}>
              <TagInput
                id="cl-tags"
                value={form.tags ?? []}
                onChange={(v) => set("tags", v)}
                suggestions={tagSuggestions}
                placeholder={t("clients.form.tagsPlaceholder")}
              />
            </Field>
            <Field label={t("clients.form.notes")} htmlFor="cl-notes" error={errorFor("notes")}>
              <Textarea
                id="cl-notes"
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder={t("clients.form.notesPlaceholder")}
              />
            </Field>
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{t("clients.form.consent")}</span>
                <span className="text-[13px] text-muted-foreground">{t("clients.form.consentHint")}</span>
              </span>
              <Switch checked={form.marketingConsent} onCheckedChange={(v) => set("marketingConsent", v)} />
            </label>
          </FormSection>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending || !form.firstName.trim()}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {pending ? t("common.saving") : client ? t("common.saveChanges") : t("clients.form.create")}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
