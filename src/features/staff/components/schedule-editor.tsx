"use client";

import { CoffeeIcon, CopyIcon, XIcon } from "lucide-react";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

import { orderedWeekdays, shiftMinutes, timeOptions, type WeekdayKey } from "../utils";
import type { DayState } from "./form-state";

const TIMES = timeOptions(15);

function TimeSelect({
  value,
  onChange,
  label,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  invalid?: boolean;
}) {
  const options = TIMES.includes(value) ? TIMES : [...TIMES, value].sort();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-[5.5rem] tabular" aria-label={label} aria-invalid={invalid || undefined} dir="ltr">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((t) => (
          <SelectItem key={t} value={t} className="tabular">
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Seven weekday rows: working switch, one shift (15-minute steps) and an optional break. */
export function ScheduleEditor({
  value,
  onChange,
  errorFor,
}: {
  value: Record<WeekdayKey, DayState>;
  onChange: (next: Record<WeekdayKey, DayState>) => void;
  errorFor: (field: string) => string | null;
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const days = orderedWeekdays(org.settings.locale.weekStartsOn);
  const set = (k: WeekdayKey, patch: Partial<DayState>) => onChange({ ...value, [k]: { ...value[k], ...patch } });
  const total = days.reduce((s, k) => s + shiftMinutes(value[k]), 0);
  const first = days.find((k) => value[k].working);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] text-muted-foreground">
          {t("staff.schedule.weeklyTotal", { hours: formatDuration(total, locale) })}
        </p>
        {first ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange(
                Object.fromEntries(days.map((k) => [k, value[k].working ? { ...value[first] } : value[k]])) as Record<
                  WeekdayKey,
                  DayState
                >,
              )
            }
          >
            <CopyIcon />
            {t("staff.schedule.copyFirst", { day: t(`common.weekdays.${first}`) })}
          </Button>
        ) : null}
      </div>
      <ul className="divide-y rounded-lg border">
        {days.map((k) => {
          const d = value[k];
          const hasBreak = d.breakStart !== "" || d.breakEnd !== "";
          const err = errorFor(`schedule.${k}.end`) ?? errorFor(`schedule.${k}.breakEnd`) ?? errorFor(`schedule.${k}.breakStart`);
          return (
            <li key={k} className={cn("grid gap-2 px-3 py-2.5", !d.working && "bg-muted/30")}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <label className="flex w-32 items-center gap-2.5">
                  <Switch
                    checked={d.working}
                    onCheckedChange={(v) => set(k, { working: v })}
                    aria-label={t(`common.weekdays.${k}`)}
                  />
                  <span className={cn("text-sm font-medium", !d.working && "text-muted-foreground")}>
                    {t(`common.weekdays.${k}`)}
                  </span>
                </label>
                {d.working ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <TimeSelect value={d.start} onChange={(v) => set(k, { start: v })} label={t("common.start")} />
                    <span className="text-muted-foreground">–</span>
                    <TimeSelect
                      value={d.end}
                      onChange={(v) => set(k, { end: v })}
                      label={t("common.end")}
                      invalid={!!errorFor(`schedule.${k}.end`)}
                    />
                    {!hasBreak ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => set(k, { breakStart: "14:00", breakEnd: "15:00" })}
                      >
                        <CoffeeIcon />
                        {t("staff.schedule.addBreak")}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("staff.schedule.dayOff")}</span>
                )}
              </div>
              {d.working && hasBreak ? (
                <div className="flex flex-wrap items-center gap-2 ps-[8.75rem] max-sm:ps-0">
                  <span className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
                    <CoffeeIcon className="size-3.5" />
                    {t("staff.schedule.break")}
                  </span>
                  <TimeSelect
                    value={d.breakStart || "14:00"}
                    onChange={(v) => set(k, { breakStart: v })}
                    label={t("staff.schedule.breakStart")}
                    invalid={!!errorFor(`schedule.${k}.breakStart`)}
                  />
                  <span className="text-muted-foreground">–</span>
                  <TimeSelect
                    value={d.breakEnd || "15:00"}
                    onChange={(v) => set(k, { breakEnd: v })}
                    label={t("staff.schedule.breakEnd")}
                    invalid={!!errorFor(`schedule.${k}.breakEnd`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("staff.schedule.removeBreak")}
                    onClick={() => set(k, { breakStart: "", breakEnd: "" })}
                  >
                    <XIcon />
                  </Button>
                </div>
              ) : null}
              {d.working && err ? (
                <p role="alert" className="text-[14px] text-destructive">
                  {err}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
