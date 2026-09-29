"use client";

import { useOrg } from "@/components/providers/org-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/i18n/format";
import type { WeeklySchedule } from "@/lib/types";
import { cn } from "@/lib/utils";

import { orderedWeekdays, weeklyMinutes } from "../utils";

export function ScheduleSummary({ schedule, todayWeekday }: { schedule: WeeklySchedule; todayWeekday: string }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("staff.profile.weeklySchedule")}</CardTitle>
        <span className="text-[14px] tabular text-muted-foreground">{formatDuration(weeklyMinutes(schedule), locale)}</span>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1.5 text-sm">
          {orderedWeekdays(org.settings.locale.weekStartsOn).map((k) => {
            const d = schedule[k];
            return (
              <li
                key={k}
                className={cn("flex items-center justify-between gap-3 rounded-md px-2 py-1", k === todayWeekday && "bg-primary/8 font-medium")}
              >
                <span>{t(`common.weekdaysShort.${k}`)}</span>
                {d?.working ? (
                  <span className="text-end">
                    <span dir="ltr" className="tabular">
                      {d.start}–{d.end}
                    </span>
                    {d.breakStart && d.breakEnd ? (
                      <span className="block text-xs text-muted-foreground">
                        {t("staff.schedule.break")}{" "}
                        <span dir="ltr" className="tabular">
                          {d.breakStart}–{d.breakEnd}
                        </span>
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t("staff.schedule.dayOff")}</span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
