"use client";

import { ClockIcon } from "lucide-react";

import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import type { AttendanceDTO } from "@/lib/types";

import { clockState } from "../utils";
import { ClockControls } from "./clock-controls";
import { ClockStatusBadge } from "./clock-status-badge";
import { ClockSummary } from "./clock-summary";
import { useNow } from "./use-now";

/**
 * Self-service time clock for the signed-in member's linked staff record.
 * The server actions re-check that `staff.id` is the caller's own `staffId`.
 */
export function TimeClockCard({
  staff,
  records,
  today,
  nowIso,
  shift,
}: {
  staff: { id: string; displayName: string; photoUrl: string | null; color: string };
  /** Today's records for this staff member. */
  records: AttendanceDTO[];
  today: string;
  nowIso: string;
  shift: { start: string; end: string } | null;
}) {
  const { t } = useI18n();
  const org = useOrg();
  const now = useNow(nowIso);
  const record = records.find((r) => r.status === "open") ?? records[0] ?? null;
  const earlier = records.filter((r) => r !== record && r.status === "closed").reduce((s, r) => s + r.workedMinutes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            {t("attendance.timeClock.title")}
          </CardTitle>
          <CardDescription>
            {org.dateKey(today, "dateLong")}
            {shift ? (
              <>
                {" · "}
                {t("attendance.timeClock.shift")}{" "}
                <span dir="ltr" className="tabular">
                  {shift.start}–{shift.end}
                </span>
              </>
            ) : (
              ` · ${t("attendance.board.notScheduled")}`
            )}
          </CardDescription>
        </div>
        <ClockStatusBadge state={clockState(record)} />
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-3">
          <PersonAvatar name={staff.displayName} src={staff.photoUrl} color={staff.color} className="size-10" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{staff.displayName}</div>
            <div className="text-[13px]">
              <ClockSummary record={record} now={now} earlierMinutes={earlier} />
            </div>
          </div>
        </div>
        <ClockControls staffId={staff.id} record={record} size="default" />
      </CardContent>
    </Card>
  );
}
