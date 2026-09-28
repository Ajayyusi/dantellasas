"use client";

import { HistoryIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { timeOf } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { AttendanceDTO } from "@/lib/types";

import { correctAttendanceAction } from "../actions";

export function CorrectionDialog({
  record,
  onOpenChange,
}: {
  record: AttendanceDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const org = useOrg();
  return (
    <Dialog open={!!record} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("attendance.correct.title")}</DialogTitle>
          {record ? (
            <DialogDescription>
              {record.staffName} · {org.dateKey(record.dateKey, "weekdayDate")}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {record ? <CorrectionForm key={record.id} record={record} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CorrectionForm({ record, onDone }: { record: AttendanceDTO; onDone: () => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const tz = org.timezone;
  const hm = (v: string | null) => (v ? timeOf(new Date(v), tz) : "");
  const [clockIn, setClockIn] = useState(hm(record.clockInAt));
  const [clockOut, setClockOut] = useState(hm(record.clockOutAt));
  const [breaks, setBreaks] = useState(record.breaks.map((b) => ({ start: hm(b.startAt), end: hm(b.endAt) })));
  const [reason, setReason] = useState("");
  const { run, pending, errorFor } = useAction(correctAttendanceAction, { success: t("attendance.correct.saved"), onSuccess: onDone });

  const setBreak = (i: number, patch: Partial<{ start: string; end: string }>) =>
    setBreaks((list) => list.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run({ id: record.id, clockIn, clockOut, breaks: breaks.filter((b) => b.start), reason });
      }}
    >
      <FieldGroup>
        <Field label={t("attendance.columns.clockIn")} htmlFor="cor-in" required error={errorFor("clockIn")} className="content-start">
          <Input id="cor-in" type="time" dir="ltr" value={clockIn} onChange={(e) => setClockIn(e.target.value)} required />
        </Field>
        <Field label={t("attendance.columns.clockOut")} htmlFor="cor-out" hint={t("attendance.correct.clockOutHint")} error={errorFor("clockOut")} className="content-start">
          <Input id="cor-out" type="time" dir="ltr" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
        </Field>
      </FieldGroup>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium">{t("attendance.columns.breaks")}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setBreaks((l) => [...l, { start: clockIn || "13:00", end: "" }])}>
            <PlusIcon />
            {t("attendance.correct.addBreak")}
          </Button>
        </div>
        {breaks.length === 0 ? <p className="text-[13px] text-muted-foreground">{t("attendance.correct.noBreaks")}</p> : null}
        {breaks.map((b, i) => (
          <div key={i} className="grid gap-1">
            <div className="flex items-center gap-2">
              <Input
                type="time"
                dir="ltr"
                value={b.start}
                onChange={(e) => setBreak(i, { start: e.target.value })}
                aria-label={`${t("attendance.correct.breakStart")} ${i + 1}`}
                aria-invalid={!!errorFor(`breaks.${i}.start`) || undefined}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="time"
                dir="ltr"
                value={b.end}
                onChange={(e) => setBreak(i, { end: e.target.value })}
                aria-label={`${t("attendance.correct.breakEnd")} ${i + 1}`}
                aria-invalid={!!errorFor(`breaks.${i}.end`) || undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("common.remove")}
                onClick={() => setBreaks((l) => l.filter((_, j) => j !== i))}
              >
                <XIcon />
              </Button>
            </div>
            {errorFor(`breaks.${i}.start`) || errorFor(`breaks.${i}.end`) ? (
              <p role="alert" className="text-[13px] text-destructive">
                {errorFor(`breaks.${i}.start`) ?? errorFor(`breaks.${i}.end`)}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <Field label={t("attendance.correct.reason")} htmlFor="cor-reason" required error={errorFor("reason")}>
        <Textarea
          id="cor-reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("attendance.correct.reasonPlaceholder")}
        />
      </Field>

      {record.corrections.length > 0 ? (
        <div className="grid gap-1.5 rounded-lg border bg-muted/30 p-3">
          <span className="flex items-center gap-1.5 text-[13px] font-medium">
            <HistoryIcon className="size-3.5" />
            {t("attendance.correct.history")}
          </span>
          <ul className="grid gap-1 text-[13px]">
            {record.corrections.map((c, i) => (
              <li key={i}>
                <span className="text-muted-foreground">{t("attendance.correct.by", { name: c.byName, date: org.date(c.at, "datetime") })}</span>
                {" — "}
                {c.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !clockIn || reason.trim().length < 3}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t("attendance.correct.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
