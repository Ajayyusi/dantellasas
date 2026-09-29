"use client";

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon, LockIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDaysToKey, parseKey, startOfWeekKey } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";

import type { CalendarStaff, CalendarViewMode } from "./types";

function keyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarToolbar({
  view,
  date,
  today,
  staffId,
  staff,
  pending,
  canCreate,
  canBlock,
  onNavigate,
  onNew,
  onBlock,
}: {
  view: CalendarViewMode;
  date: string;
  today: string;
  staffId: string | null;
  staff: CalendarStaff[];
  pending: boolean;
  canCreate: boolean;
  canBlock: boolean;
  onNavigate: (patch: { view?: CalendarViewMode; date?: string; staff?: string | null }) => void;
  onNew: () => void;
  onBlock: () => void;
}) {
  const { t } = useI18n();
  const org = useOrg();
  const [pickerOpen, setPickerOpen] = useState(false);
  const weekMode = view === "week" || view === "staff";
  const weekStart = startOfWeekKey(date, org.settings.locale.weekStartsOn);
  const step = weekMode ? 7 : 1;
  const label = weekMode
    ? `${org.dateKey(weekStart, "monthDay")} – ${org.dateKey(addDaysToKey(weekStart, 6), "date")}`
    : org.dateKey(date, "dateLong");
  const shortLabel = weekMode
    ? `${org.dateKey(weekStart, "monthDay")} – ${org.dateKey(addDaysToKey(weekStart, 6), "monthDay")}`
    : org.dateKey(date, "weekdayDate");
  const { y, m, d } = parseKey(date);

  return (
    <div className="flex flex-wrap items-center gap-2.5 pb-5">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onNavigate({ date: today })} disabled={date === today && !weekMode}>
          {t("appointments.today")}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={weekMode ? t("appointments.previousWeek") : t("appointments.previousDay")}
          onClick={() => onNavigate({ date: addDaysToKey(date, -step) })}
        >
          <ChevronLeftIcon className="rtl-flip" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={weekMode ? t("appointments.nextWeek") : t("appointments.nextDay")}
          onClick={() => onNavigate({ date: addDaysToKey(date, step) })}
        >
          <ChevronRightIcon className="rtl-flip" />
        </Button>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-12 gap-2.5 px-2.5 font-display text-[26px] font-semibold tracking-normal" aria-label={t("appointments.pickDate")}>
              <CalendarIcon className="size-5 text-primary" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <Calendar
              mode="single"
              selected={new Date(y, m - 1, d)}
              defaultMonth={new Date(y, m - 1, d)}
              weekStartsOn={org.settings.locale.weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6}
              onSelect={(day) => {
                if (day) {
                  onNavigate({ date: keyFromDate(day) });
                  setPickerOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        {pending ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-hidden /> : null}
      </div>

      <div className="ms-auto flex flex-wrap items-center gap-2">
        {view === "staff" || view === "week" ? (
          <Select value={staffId ?? "__all"} onValueChange={(v) => onNavigate({ staff: v === "__all" ? null : v })}>
            <SelectTrigger size="sm" className="w-44" aria-label={t("appointments.chooseStaff")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {view === "week" ? <SelectItem value="__all">{t("appointments.allStaff")}</SelectItem> : null}
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Segmented value={view} onValueChange={(v) => onNavigate({ view: v as CalendarViewMode })} aria-label="View">
          <SegmentedItem value="day">{t("appointments.views.day")}</SegmentedItem>
          <SegmentedItem value="week">{t("appointments.views.week")}</SegmentedItem>
          <SegmentedItem value="staff">{t("appointments.views.staff")}</SegmentedItem>
          <SegmentedItem value="list">{t("appointments.views.list")}</SegmentedItem>
        </Segmented>
        {canBlock ? (
          <Button variant="outline" size="sm" onClick={onBlock}>
            <LockIcon />
            <span className="hidden lg:inline">{t("appointments.blocked_time.add")}</span>
          </Button>
        ) : null}
        {canCreate ? (
          <Button size="sm" onClick={onNew}>
            <PlusIcon />
            {t("appointments.newAppointment")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
