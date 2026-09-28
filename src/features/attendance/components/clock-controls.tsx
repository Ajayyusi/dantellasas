"use client";

import { CoffeeIcon, Loader2Icon, LogInIcon, LogOutIcon, PlayIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import type { AttendanceDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { clockInAction, clockOutAction, endBreakAction, startBreakAction } from "../actions";
import { clockState } from "../utils";

/** Clock in / break / clock out buttons for one staff member's current record. */
export function ClockControls({
  staffId,
  record,
  branchId,
  size = "sm",
  className,
}: {
  staffId: string;
  record: AttendanceDTO | null;
  branchId?: string | null;
  size?: "sm" | "default";
  className?: string;
}) {
  const { t } = useI18n();
  const state = clockState(record);
  const clockIn = useAction(clockInAction, { success: t("attendance.toast.clockedIn") });
  const startBreak = useAction(startBreakAction, { success: t("attendance.toast.breakStarted") });
  const endBreak = useAction(endBreakAction, { success: t("attendance.toast.breakEnded") });
  const clockOut = useAction(clockOutAction, { success: t("attendance.toast.clockedOut") });
  const busy = clockIn.pending || startBreak.pending || endBreak.pending || clockOut.pending;
  const spin = <Loader2Icon className="animate-spin" />;
  const input = { staffId, branchId: branchId ?? null };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {state === "not_in" || state === "out" ? (
        <Button size={size} variant={state === "out" ? "outline" : "default"} disabled={busy} onClick={() => clockIn.run(input)}>
          {clockIn.pending ? spin : <LogInIcon className="rtl-flip" />}
          {t("attendance.actions.clockIn")}
        </Button>
      ) : null}
      {state === "in" ? (
        <Button size={size} variant="outline" disabled={busy} onClick={() => startBreak.run(input)}>
          {startBreak.pending ? spin : <CoffeeIcon />}
          {t("attendance.actions.startBreak")}
        </Button>
      ) : null}
      {state === "on_break" ? (
        <Button size={size} variant="outline" disabled={busy} onClick={() => endBreak.run(input)}>
          {endBreak.pending ? spin : <PlayIcon className="rtl-flip" />}
          {t("attendance.actions.endBreak")}
        </Button>
      ) : null}
      {state === "in" || state === "on_break" ? (
        <Button size={size} variant="secondary" disabled={busy} onClick={() => clockOut.run(input)}>
          {clockOut.pending ? spin : <LogOutIcon className="rtl-flip" />}
          {t("attendance.actions.clockOut")}
        </Button>
      ) : null}
    </div>
  );
}
