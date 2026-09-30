"use client";

import { CalendarOffIcon, UsersIcon } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";
import type { AttendanceDTO, LeaveDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { clockState } from "../utils";
import { ClockControls } from "./clock-controls";
import { ClockStatusBadge } from "./clock-status-badge";
import { ClockSummary } from "./clock-summary";

export interface BoardEntry {
  staff: { id: string; displayName: string; position: string; photoUrl: string | null; color: string };
  shift: { start: string; end: string; breakStart?: string; breakEnd?: string } | null;
  /** The record the clock acts on (open, else latest today). */
  record: AttendanceDTO | null;
  /** Minutes from other, closed records today. */
  earlierMinutes: number;
  leaveType: LeaveDTO["type"] | null;
}

function BoardCard({ entry, now, canClock }: { entry: BoardEntry; now: number; canClock: boolean }) {
  const { t } = useI18n();
  const org = useOrg();
  const { staff, shift, record, leaveType } = entry;
  const state = clockState(record);
  return (
    <li
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-5",
        state === "in" && "border-[color-mix(in_oklch,var(--success)_35%,var(--border))]",
        state === "on_break" && "border-[color-mix(in_oklch,var(--warning)_45%,var(--border))]",
      )}
    >
      <div className="flex items-start gap-3">
        <PersonAvatar name={staff.displayName} src={staff.photoUrl} color={staff.color} className="size-10 text-[13px]" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{staff.displayName}</div>
          <div className="truncate text-[14px] text-muted-foreground">
            {shift ? (
              <span dir="ltr" className="tabular">
                {shift.start}–{shift.end}
              </span>
            ) : (
              t("attendance.board.notScheduled")
            )}
            {staff.position ? ` · ${staff.position}` : ""}
          </div>
        </div>
        <ClockStatusBadge state={state} />
      </div>
      {leaveType ? (
        <Badge variant="info" className="w-fit">
          <CalendarOffIcon />
          {t("attendance.board.onLeave", { type: t(`attendance.leaveType.${leaveType}`) })}
        </Badge>
      ) : null}
      <div className="text-[14px]">
        <ClockSummary record={record} now={now} earlierMinutes={entry.earlierMinutes} />
      </div>
      {canClock ? <ClockControls staffId={staff.id} record={record} branchId={org.branchId} className="mt-auto" /> : null}
    </li>
  );
}

export function TodayBoard({ scheduled, others, now }: { scheduled: BoardEntry[]; others: BoardEntry[]; now: number }) {
  const { t } = useI18n();
  const org = useOrg();
  const canClock = org.can("manage_attendance");
  const counts = {
    in: scheduled.concat(others).filter((e) => clockState(e.record) === "in").length,
    on_break: scheduled.concat(others).filter((e) => clockState(e.record) === "on_break").length,
  };
  return (
    <div className="grid gap-6">
      <ul className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
        {[
          { label: t("attendance.board.scheduledCount", { count: scheduled.length }), color: "var(--primary)" },
          { label: t("attendance.board.inCount", { count: counts.in }), color: "var(--success)" },
          { label: t("attendance.board.breakCount", { count: counts.on_break }), color: "var(--warning)" },
        ].map((p) => (
          <li key={p.label} className="inline-flex h-9 items-center gap-2 rounded-full border bg-card px-3.5 shadow-xs">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.label}
          </li>
        ))}
      </ul>
      {scheduled.length === 0 ? (
        <div className="rounded-2xl border bg-card">
          <EmptyState compact icon={UsersIcon} title={t("attendance.board.empty")} description={t("attendance.board.emptyHint")} />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {scheduled.map((e) => (
            <BoardCard key={e.staff.id} entry={e} now={now} canClock={canClock} />
          ))}
        </ul>
      )}
      {others.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">{t("attendance.board.othersTitle")}</h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {others.map((e) => (
              <BoardCard key={e.staff.id} entry={e} now={now} canClock={canClock} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
