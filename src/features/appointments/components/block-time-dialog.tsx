"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { minutesToTime, timeToMinutes } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatClock } from "@/lib/i18n/format";

import { createBlockedTimeAction, deleteBlockedTimeAction } from "../actions";
import type { BlockedTimeDTO, CalendarStaff } from "./types";

export function BlockTimeDialog({
  open,
  onOpenChange,
  staff,
  date,
  blocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: CalendarStaff[];
  date: string;
  blocked: BlockedTimeDTO[];
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("appointments.blocked_time.title")}</DialogTitle>
          <DialogDescription>{t("appointments.blocked_time.description")}</DialogDescription>
        </DialogHeader>
        {open ? <BlockTimeForm staff={staff} date={date} blocked={blocked} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function BlockTimeForm({ staff, date, blocked, onDone }: { staff: CalendarStaff[]; date: string; blocked: BlockedTimeDTO[]; onDone: () => void }) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const step = org.settings.appointments.slotMinutes;
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [day, setDay] = useState(date);
  const [start, setStart] = useState("13:00");
  const [end, setEnd] = useState("14:00");
  const [reason, setReason] = useState("");
  const { run, pending, errorFor } = useAction(createBlockedTimeAction, { success: t("appointments.blocked_time.created"), onSuccess: onDone });
  const slots: string[] = [];
  for (let m = 6 * 60; m <= 23 * 60; m += step) slots.push(minutesToTime(m));
  const existing = blocked.filter((b) => b.dateKey === day);

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run({ staffId, date: day, start, end, reason });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("appointments.form.staff")} className="col-span-2">
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("appointments.form.date")} className="col-span-2">
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label={t("common.from")}>
          <Select value={start} onValueChange={(v) => { setStart(v); if (timeToMinutes(end) <= timeToMinutes(v)) setEnd(minutesToTime(timeToMinutes(v) + 60)); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {slots.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatClock(timeToMinutes(s), locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("common.to")} error={errorFor("end")}>
          <Select value={end} onValueChange={setEnd}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {slots.filter((s) => timeToMinutes(s) > timeToMinutes(start)).map((s) => (
                <SelectItem key={s} value={s}>
                  {formatClock(timeToMinutes(s), locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("appointments.blocked_time.reason")} className="col-span-2" optionalLabel={t("common.optional")}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("appointments.blocked_time.reasonPlaceholder")} />
        </Field>
      </div>
      {existing.length > 0 ? (
        <ul className="divide-y rounded-lg border text-sm">
          {existing.map((b) => (
            <li key={b.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 truncate">
                {staff.find((s) => s.id === b.staffId)?.displayName ?? "—"} · {org.date(b.startAt, "time")}–{org.date(b.endAt, "time")}
                {b.reason ? ` · ${b.reason}` : ""}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("appointments.blocked_time.remove")}
                onClick={async () => {
                  const res = await deleteBlockedTimeAction({ id: b.id });
                  if (res.ok) toast.success(t("appointments.blocked_time.removed"));
                  else toast.error(te(res.error));
                }}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !staffId}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t("appointments.blocked_time.add")}
        </Button>
      </DialogFooter>
    </form>
  );
}
