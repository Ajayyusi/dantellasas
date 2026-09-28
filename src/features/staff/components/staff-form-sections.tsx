"use client";

import { PercentIcon } from "lucide-react";

import { MultiSelect } from "@/components/common/multi-select";
import { useOrg } from "@/components/providers/org-provider";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/client";
import type { StaffDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { STAFF_STATUSES } from "../schema";
import { STAFF_COLORS } from "../utils";
import type { StaffFormState } from "./form-state";
import { PhotoField } from "./photo-field";

type SetForm = React.Dispatch<React.SetStateAction<StaffFormState>>;
type ErrorFor = (field: string) => string | null;

export function ProfileSection({
  form,
  setForm,
  staff,
  onPickPhoto,
  errorFor,
}: {
  form: StaffFormState;
  setForm: SetForm;
  staff: StaffDTO | null;
  onPickPhoto: (file: File | null) => void;
  errorFor: ErrorFor;
}) {
  const { t } = useI18n();
  const org = useOrg();
  const set = <K extends keyof StaffFormState>(key: K, value: StaffFormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const name = form.displayName || `${form.firstName} ${form.lastName}`.trim();

  return (
    <div className="grid gap-6">
      <PhotoField
        staffId={staff?.id ?? null}
        name={name}
        color={form.color}
        photoUrl={staff?.photoUrl ?? null}
        onPick={onPickPhoto}
      />
      <FormSection title={t("staff.form.personal")}>
        <FieldGroup>
          <Field label={t("common.firstName")} htmlFor="st-first" required error={errorFor("firstName")}>
            <Input id="st-first" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} autoFocus aria-invalid={!!errorFor("firstName")} />
          </Field>
          <Field label={t("common.lastName")} htmlFor="st-last" error={errorFor("lastName")}>
            <Input id="st-last" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </Field>
          <Field
            label={t("staff.form.displayName")}
            htmlFor="st-display"
            hint={t("staff.form.displayNameHint")}
            optionalLabel={t("common.optional")}
            error={errorFor("displayName")}
            className="content-start"
          >
            <Input
              id="st-display"
              value={form.displayName}
              placeholder={`${form.firstName} ${form.lastName}`.trim()}
              onChange={(e) => set("displayName", e.target.value)}
            />
          </Field>
          <Field label={t("staff.form.position")} htmlFor="st-position" error={errorFor("position")} className="content-start">
            <Input
              id="st-position"
              value={form.position}
              placeholder={t("staff.form.positionPlaceholder")}
              onChange={(e) => set("position", e.target.value)}
            />
          </Field>
          <Field label={t("common.phone")} htmlFor="st-phone" error={errorFor("phone")}>
            <Input id="st-phone" type="tel" dir="ltr" className="text-start" value={form.phone} placeholder="+971 50 123 4567" onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label={t("common.email")} htmlFor="st-email" error={errorFor("email")}>
            <Input id="st-email" type="email" dir="ltr" className="text-start" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </FieldGroup>
      </FormSection>

      <Separator />

      <FormSection title={t("staff.form.work")}>
        <FieldGroup>
          {org.branches.length > 1 ? (
            <Field label={t("common.branches")} htmlFor="st-branches" required error={errorFor("branchIds")} className="sm:col-span-2">
              <MultiSelect
                id="st-branches"
                options={org.branches.map((b) => ({ value: b.id, label: b.name }))}
                value={form.branchIds}
                onChange={(v) => set("branchIds", v)}
                placeholder={t("staff.form.selectBranches")}
              />
            </Field>
          ) : errorFor("branchIds") ? (
            <p role="alert" className="text-[13px] text-destructive sm:col-span-2">
              {errorFor("branchIds")}
            </p>
          ) : null}
          <Field label={t("staff.form.hireDate")} htmlFor="st-hire" error={errorFor("hireDate")}>
            <Input id="st-hire" type="date" value={form.hireDate} onChange={(e) => set("hireDate", e.target.value)} />
          </Field>
          <Field label={t("common.status")} htmlFor="st-status">
            <Select value={form.status} onValueChange={(v) => set("status", v as StaffFormState["status"])}>
              <SelectTrigger id="st-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`staff.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <Field label={t("staff.form.color")} hint={t("staff.form.colorHint")}>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("staff.form.color")}>
            {STAFF_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={form.color === c}
                aria-label={c}
                onClick={() => set("color", c)}
                className={cn(
                  "size-7 rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
                  form.color === c && "ring-2 ring-foreground/60",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
        <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">{t("staff.form.bookable")}</span>
            <span className="text-[13px] text-muted-foreground">{t("staff.form.bookableHint")}</span>
          </span>
          <Switch checked={form.bookable} onCheckedChange={(v) => set("bookable", v)} />
        </label>
      </FormSection>
    </div>
  );
}

function PercentInput({ id, value, onChange, invalid }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="decimal"
        dir="ltr"
        value={value}
        placeholder="0"
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        className="pe-9 tabular"
      />
      <PercentIcon className="pointer-events-none absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function CommissionSection({ form, setForm, errorFor }: { form: StaffFormState; setForm: SetForm; errorFor: ErrorFor }) {
  const { t } = useI18n();
  const set = (key: "service" | "product", v: string) => setForm((f) => ({ ...f, commission: { ...f.commission, [key]: v } }));
  return (
    <FormSection title={t("staff.form.commissionTitle")} description={t("staff.form.commissionHint")}>
      <FieldGroup>
        <Field label={t("staff.form.serviceRate")} htmlFor="st-com-svc" error={errorFor("commission.serviceRateBps")}>
          <PercentInput id="st-com-svc" value={form.commission.service} onChange={(v) => set("service", v)} invalid={!!errorFor("commission.serviceRateBps")} />
        </Field>
        <Field label={t("staff.form.productRate")} htmlFor="st-com-prd" error={errorFor("commission.productRateBps")}>
          <PercentInput id="st-com-prd" value={form.commission.product} onChange={(v) => set("product", v)} invalid={!!errorFor("commission.productRateBps")} />
        </Field>
      </FieldGroup>
    </FormSection>
  );
}

export function HrSection({ form, setForm, errorFor }: { form: StaffFormState; setForm: SetForm; errorFor: ErrorFor }) {
  const { t } = useI18n();
  const set = (key: keyof StaffFormState["hr"], v: string) => setForm((f) => ({ ...f, hr: { ...f.hr, [key]: v } }));
  return (
    <FormSection title={t("staff.form.hrTitle")} description={t("staff.form.hrHint")}>
      <FieldGroup>
        <Field label={t("staff.form.dateOfBirth")} htmlFor="st-dob" error={errorFor("hr.dateOfBirth")}>
          <Input id="st-dob" type="date" value={form.hr.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
        </Field>
        <Field label={t("staff.form.nationality")} htmlFor="st-nat" error={errorFor("hr.nationality")}>
          <Input id="st-nat" value={form.hr.nationality} onChange={(e) => set("nationality", e.target.value)} />
        </Field>
        <Field label={t("staff.form.passportExpiry")} htmlFor="st-passport" error={errorFor("hr.passportExpiry")}>
          <Input id="st-passport" type="date" value={form.hr.passportExpiry} onChange={(e) => set("passportExpiry", e.target.value)} />
        </Field>
        <Field label={t("staff.form.visaExpiry")} htmlFor="st-visa" error={errorFor("hr.visaExpiry")}>
          <Input id="st-visa" type="date" value={form.hr.visaExpiry} onChange={(e) => set("visaExpiry", e.target.value)} />
        </Field>
      </FieldGroup>
    </FormSection>
  );
}
