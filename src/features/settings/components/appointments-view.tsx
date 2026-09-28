"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";

import { SLOT_OPTIONS, type SectionValues } from "../schema";
import { SaveBar, SectionHeader, SettingsCard, ToggleRow } from "./form-parts";
import { useSettingsForm } from "./use-settings-form";

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120];

export function AppointmentsView({ initial }: { initial: SectionValues<"appointments"> }) {
  const { t } = useI18n();
  const f = useSettingsForm("appointments", initial);
  const v = f.values;
  const reasons = v.cancellationReasons;
  const durations = DURATIONS.includes(v.defaultDurationMinutes)
    ? DURATIONS
    : [...DURATIONS, v.defaultDurationMinutes].sort((a, b) => a - b);

  const setReason = (i: number, text: string) => f.set("cancellationReasons", reasons.map((r, j) => (j === i ? text : r)));

  return (
    <form onSubmit={f.onSubmit} className="grid gap-5" noValidate>
      <SectionHeader
        title={t("settings.sections.appointments.title")}
        description={t("settings.sections.appointments.description")}
      />
      <SettingsCard title={t("settings.appointments.calendar")}>
        <FieldGroup>
          <Field label={t("settings.appointments.slotMinutes")} htmlFor="apt-slot" hint={t("settings.appointments.slotMinutesHint")}>
            <Select value={String(v.slotMinutes)} onValueChange={(x) => f.set("slotMinutes", Number(x))}>
              <SelectTrigger id="apt-slot">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {t("common.minutes", { count: m })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label={t("settings.appointments.defaultDuration")}
            htmlFor="apt-duration"
            hint={t("settings.appointments.defaultDurationHint")}
          >
            <Select value={String(v.defaultDurationMinutes)} onValueChange={(x) => f.set("defaultDurationMinutes", Number(x))}>
              <SelectTrigger id="apt-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durations.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {t("common.minutes", { count: m })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("settings.appointments.dayStart")} htmlFor="apt-start" error={f.errorFor("values.dayStart")}>
            <Input id="apt-start" type="time" dir="ltr" step={900} value={v.dayStart} onChange={(e) => f.set("dayStart", e.target.value)} />
          </Field>
          <Field label={t("settings.appointments.dayEnd")} htmlFor="apt-end" error={f.errorFor("values.dayEnd")}>
            <Input id="apt-end" type="time" dir="ltr" step={900} value={v.dayEnd} onChange={(e) => f.set("dayEnd", e.target.value)} />
          </Field>
        </FieldGroup>
      </SettingsCard>

      <SettingsCard title={t("settings.appointments.booking")}>
        <ToggleRow
          id="apt-overlap"
          label={t("settings.appointments.allowStaffOverlap")}
          hint={t("settings.appointments.allowStaffOverlapHint")}
          checked={v.allowStaffOverlap}
          onCheckedChange={(x) => f.set("allowStaffOverlap", x)}
        />
      </SettingsCard>

      <SettingsCard
        title={t("settings.appointments.reasons")}
        description={t("settings.appointments.reasonsHint")}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => f.set("cancellationReasons", [...reasons, ""])}
            disabled={reasons.length >= 30}
          >
            <PlusIcon />
            {t("settings.appointments.addReason")}
          </Button>
        }
      >
        <ul className="grid gap-2">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <Input
                value={r}
                onChange={(e) => setReason(i, e.target.value)}
                placeholder={t("settings.appointments.reasonPlaceholder")}
                aria-label={`${t("settings.appointments.reasons")} ${i + 1}`}
                aria-invalid={!!f.errorFor(`values.cancellationReasons.${i}`)}
                autoFocus={r === "" && i === reasons.length - 1}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={reasons.length <= 1}
                onClick={() => f.set("cancellationReasons", reasons.filter((_, j) => j !== i))}
                aria-label={`${t("settings.appointments.removeReason")}: ${r}`}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      </SettingsCard>
      <SaveBar
        dirty={f.dirty}
        pending={f.pending}
        onReset={f.reset}
        disabled={reasons.some((r) => !r.trim()) || v.dayEnd <= v.dayStart}
      />
    </form>
  );
}
