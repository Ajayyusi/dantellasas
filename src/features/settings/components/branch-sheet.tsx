"use client";

import { CopyIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";

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
import type { BranchDTO, BranchHours } from "@/lib/types";

import { saveBranchAction } from "../branch-actions";
import { WEEKDAYS, type BranchInput } from "../schema";

const TIMEZONES = [
  "Asia/Dubai",
  "Asia/Muscat",
  "Asia/Qatar",
  "Asia/Bahrain",
  "Asia/Kuwait",
  "Asia/Riyadh",
  "Asia/Baghdad",
  "Asia/Amman",
  "Asia/Beirut",
  "Africa/Cairo",
  "Europe/Istanbul",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Europe/London",
  "UTC",
];

const DEFAULT_HOURS: BranchHours = { open: true, start: "10:00", end: "22:00" };

function toForm(branch: BranchDTO | null, timezone: string): BranchInput {
  const hours = Object.fromEntries(
    WEEKDAYS.map((d) => [d, { ...DEFAULT_HOURS, ...(branch?.workingHours?.[d] ?? {}) }]),
  ) as BranchInput["workingHours"];
  return {
    id: branch?.id,
    name: branch?.name ?? "",
    code: branch?.code ?? "",
    phone: branch?.phone ?? "",
    email: branch?.email ?? "",
    address: branch?.address ?? "",
    timezone: branch?.timezone || timezone,
    workingHours: hours,
  };
}

export function BranchSheet({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: BranchDTO | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? <BranchForm key={branch?.id ?? "new"} branch={branch} onDone={() => onOpenChange(false)} /> : null}
    </Sheet>
  );
}

function BranchForm({ branch, onDone }: { branch: BranchDTO | null; onDone: () => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const [form, setForm] = useState<BranchInput>(() => toForm(branch, org.settings.locale.timezone));
  const { run, pending, errorFor } = useAction(saveBranchAction, {
    success: branch ? t("settings.branches.saved") : t("settings.branches.created"),
    onSuccess: onDone,
  });
  const set = <K extends keyof BranchInput>(k: K, v: BranchInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setDay = (day: (typeof WEEKDAYS)[number], patch: Partial<BranchHours>) =>
    setForm((f) => ({ ...f, workingHours: { ...f.workingHours, [day]: { ...f.workingHours[day], ...patch } } }));
  const weekStart = org.settings.locale.weekStartsOn;
  const days = [...WEEKDAYS.slice(weekStart), ...WEEKDAYS.slice(0, weekStart)];
  const zones = TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES];
  const copyToAll = (day: (typeof WEEKDAYS)[number]) =>
    setForm((f) => ({
      ...f,
      workingHours: Object.fromEntries(WEEKDAYS.map((d) => [d, { ...f.workingHours[day] }])) as BranchInput["workingHours"],
    }));

  return (
    <SheetContent className="sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{branch ? t("settings.branches.edit") : t("settings.branches.new")}</SheetTitle>
        {branch ? <SheetDescription>{branch.name}</SheetDescription> : null}
      </SheetHeader>
      <form
        className="contents"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void run(form);
        }}
      >
        <SheetBody className="grid gap-6">
          <FormSection title={t("common.details")}>
            <FieldGroup>
              <Field label={t("settings.branches.name")} htmlFor="br-name" required error={errorFor("name")}>
                <Input
                  id="br-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder={t("settings.branches.namePlaceholder")}
                  autoFocus
                />
              </Field>
              <Field label={t("settings.branches.code")} htmlFor="br-code" hint={t("settings.branches.codeHint")} error={errorFor("code")}>
                <Input
                  id="br-code"
                  dir="ltr"
                  maxLength={8}
                  className="font-mono uppercase"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                />
              </Field>
              <Field label={t("settings.branches.phone")} htmlFor="br-phone" error={errorFor("phone")}>
                <Input id="br-phone" type="tel" dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label={t("settings.branches.email")} htmlFor="br-email" error={errorFor("email")}>
                <Input id="br-email" type="email" dir="ltr" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
            </FieldGroup>
            <Field label={t("settings.branches.address")} htmlFor="br-address" error={errorFor("address")}>
              <Textarea id="br-address" rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label={t("settings.branches.timezone")} htmlFor="br-tz" hint={t("settings.branches.timezoneHint")} error={errorFor("timezone")}>
              <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                <SelectTrigger id="br-tz" dir="ltr">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FormSection>

          <Separator />

          <FormSection title={t("settings.branches.hours")} description={t("settings.branches.hoursHint")}>
            <div className="-mt-2 flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => copyToAll(days[0]!)}>
                <CopyIcon />
                {t("settings.branches.applyToAll", { day: t(`common.weekdays.${days[0]!}`) })}
              </Button>
            </div>
            <ul className="grid gap-2">
              {days.map((d) => {
                const h = form.workingHours[d];
                const error = errorFor(`workingHours.${d}.end`);
                return (
                  <li key={d} className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <label className="flex w-32 items-center gap-2.5 text-sm">
                        <Switch checked={h.open} onCheckedChange={(open) => setDay(d, { open })} aria-label={t(`common.weekdays.${d}`)} />
                        <span className={h.open ? "font-medium" : "text-muted-foreground"}>{t(`common.weekdays.${d}`)}</span>
                      </label>
                      {h.open ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            dir="ltr"
                            step={900}
                            className="w-28"
                            value={h.start}
                            onChange={(e) => setDay(d, { start: e.target.value })}
                            aria-label={`${t(`common.weekdays.${d}`)} ${t("common.start")}`}
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            dir="ltr"
                            step={900}
                            className="w-28"
                            value={h.end}
                            onChange={(e) => setDay(d, { end: e.target.value })}
                            aria-label={`${t(`common.weekdays.${d}`)} ${t("common.end")}`}
                            aria-invalid={!!error || h.end <= h.start}
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t("settings.branches.closed")}</span>
                      )}
                    </div>
                    {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
                  </li>
                );
              })}
            </ul>
          </FormSection>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={onDone}>
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
