"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";

import { createLeaveAction } from "../actions";
import { LEAVE_TYPES, type LeaveInput } from "../schema";

export interface StaffPick {
  id: string;
  displayName: string;
}

export function LeaveDialog({
  open,
  onOpenChange,
  staff,
  defaultStaffId,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffPick[];
  defaultStaffId: string | null;
  today: string;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("attendance.leave.new")}</DialogTitle>
        </DialogHeader>
        {open ? (
          <LeaveForm staff={staff} defaultStaffId={defaultStaffId} today={today} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LeaveForm({
  staff,
  defaultStaffId,
  today,
  onDone,
}: {
  staff: StaffPick[];
  defaultStaffId: string | null;
  today: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<Required<LeaveInput>>({
    staffId: defaultStaffId ?? staff[0]?.id ?? "",
    type: "annual",
    startDate: today,
    endDate: today,
    note: "",
  });
  const set = <K extends keyof LeaveInput>(k: K, v: Required<LeaveInput>[K]) => setForm((f) => ({ ...f, [k]: v }));
  const { run, pending, errorFor } = useAction(createLeaveAction, { success: t("attendance.leave.requested"), onSuccess: onDone });

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(form);
      }}
    >
      {staff.length > 1 ? (
        <Field label={t("common.staff")} htmlFor="lv-staff" required error={errorFor("staffId")}>
          <Select value={form.staffId} onValueChange={(v) => set("staffId", v)}>
            <SelectTrigger id="lv-staff">
              <SelectValue placeholder={t("common.selectPlaceholder")} />
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
      ) : null}
      <Field label={t("attendance.leave.type")} htmlFor="lv-type">
        <Select value={form.type} onValueChange={(v) => set("type", v as LeaveInput["type"])}>
          <SelectTrigger id="lv-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAVE_TYPES.map((ty) => (
              <SelectItem key={ty} value={ty}>
                {t(`attendance.leaveType.${ty}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <FieldGroup>
        <Field label={t("attendance.leave.startDate")} htmlFor="lv-start" required error={errorFor("startDate")}>
          <Input
            id="lv-start"
            type="date"
            value={form.startDate}
            onChange={(e) => {
              const v = e.target.value;
              setForm((f) => ({ ...f, startDate: v, endDate: f.endDate < v ? v : f.endDate }));
            }}
          />
        </Field>
        <Field label={t("attendance.leave.endDate")} htmlFor="lv-end" required error={errorFor("endDate")}>
          <Input id="lv-end" type="date" value={form.endDate} min={form.startDate} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
      </FieldGroup>
      <Field label={t("common.notes")} htmlFor="lv-note" optionalLabel={t("common.optional")} error={errorFor("note")}>
        <Textarea id="lv-note" rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !form.staffId}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t("attendance.leave.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
