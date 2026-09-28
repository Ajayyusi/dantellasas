"use client";

import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";
import type { AttendanceDTO } from "@/lib/types";

import { clockState, formatMinutes, workedMinutes } from "../utils";

/** One line describing where a record stands: "In since 09:02 · 3:15 worked". */
export function ClockSummary({ record, now, earlierMinutes = 0 }: { record: AttendanceDTO | null; now: number; earlierMinutes?: number }) {
  const { t } = useI18n();
  const org = useOrg();
  const state = clockState(record);
  if (!record || state === "not_in") return <span className="text-muted-foreground">{t("attendance.summary.notIn")}</span>;
  const worked = formatMinutes(earlierMinutes + (state === "out" ? record.workedMinutes : workedMinutes(record, now)));
  const lastBreak = record.breaks[record.breaks.length - 1];
  const text =
    state === "in"
      ? t("attendance.summary.inSince", { time: org.date(record.clockInAt, "time") })
      : state === "on_break"
        ? t("attendance.summary.breakSince", { time: org.date(lastBreak?.startAt, "time") })
        : t("attendance.summary.outAt", { time: org.date(record.clockOutAt, "time") });
  return (
    <span className="text-muted-foreground">
      {text} · <span className="tabular text-foreground">{t("attendance.summary.worked", { time: worked })}</span>
    </span>
  );
}
