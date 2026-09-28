"use client";

import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CheckIcon,
  Loader2Icon,
  LogInIcon,
  PencilIcon,
  PhoneIcon,
  PlayIcon,
  ReceiptIcon,
  RotateCcwIcon,
  ShoppingBagIcon,
  UserXIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/i18n/format";
import type { AppointmentDTO, AppointmentStatus } from "@/lib/types";

import { setAppointmentStatusAction } from "../actions";
import { canTransition, isEditableStatus } from "../status";
import { AppointmentStatusBadge } from "./status-badge";

type StatusAction = { to: AppointmentStatus; label: string; icon: React.ReactNode; primary?: boolean };

export function AppointmentDetailsSheet({
  appointment,
  open,
  onOpenChange,
  onEdit,
}: {
  appointment: AppointmentDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (a: AppointmentDTO) => void;
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [reason, setReason] = useState(org.settings.appointments.cancellationReasons[0] ?? "");
  const [note, setNote] = useState("");
  const { run, pending } = useAction(setAppointmentStatusAction, { success: false });
  const [runningTo, setRunningTo] = useState<AppointmentStatus | null>(null);

  if (!appointment) return <Sheet open={false} onOpenChange={onOpenChange} />;
  const a = appointment;

  async function change(to: AppointmentStatus, extra: { reason?: string; note?: string } = {}) {
    setRunningTo(to);
    const res = await run({ id: a.id, status: to, reason: extra.reason ?? "", note: extra.note ?? "" });
    setRunningTo(null);
    if (res.ok) {
      toast.success(to === "cancelled" ? t("appointments.cancelled") : t("appointments.statusChanged", { status: t(`appointments.status.${to}`) }));
    }
  }

  const canEdit = org.can("edit_appointments");
  const canCancel = org.can("cancel_appointments");
  const allowed = (to: AppointmentStatus) =>
    canTransition(a.status, to) && (to === "cancelled" || to === "no_show" ? canCancel : canEdit);

  const forward: StatusAction[] = (
    [
      { to: "confirmed", label: t("appointments.actions.confirm"), icon: <CheckIcon /> },
      { to: "checked_in", label: t("appointments.actions.checkIn"), icon: <LogInIcon />, primary: true },
      { to: "in_service", label: t("appointments.actions.start"), icon: <PlayIcon />, primary: true },
      { to: "completed", label: t("appointments.actions.complete"), icon: <CheckCircle2Icon /> },
    ] as StatusAction[]
  ).filter((x) => allowed(x.to) && !(a.status === "checked_in" && x.to === "confirmed"));

  const secondary: StatusAction[] = [];
  if (a.status === "confirmed" && allowed("booked")) secondary.push({ to: "booked", label: t("appointments.actions.unconfirm"), icon: <RotateCcwIcon /> });
  if (a.status === "checked_in" && allowed("confirmed")) secondary.push({ to: "confirmed", label: t("appointments.actions.undoCheckIn"), icon: <RotateCcwIcon /> });
  if (a.status === "in_service" && allowed("checked_in")) secondary.push({ to: "checked_in", label: t("appointments.actions.backToCheckedIn"), icon: <RotateCcwIcon /> });
  if ((a.status === "cancelled" || a.status === "no_show") && allowed("booked")) secondary.push({ to: "booked", label: t("appointments.actions.restore"), icon: <RotateCcwIcon /> });

  const staffList = [...new Map(a.items.map((i) => [i.staffId, i.staffName])).values()];
  const canCheckout = org.can("create_sales") && !a.transactionId && (a.status === "checked_in" || a.status === "in_service" || a.status === "completed" || a.status === "confirmed" || a.status === "booked");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle>{t("appointments.details.title")}</SheetTitle>
              <AppointmentStatusBadge status={a.status} />
            </div>
            <SheetDescription className="flex items-center gap-1.5">
              <CalendarClockIcon className="size-4" />
              {org.dateKey(a.dateKey, "weekdayDate")} · {org.date(a.startAt, "time")}–{org.date(a.endAt, "time")}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="grid gap-5">
            <section className="flex items-start gap-3">
              <PersonAvatar name={a.clientName} className="size-11" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{a.clientName}</div>
                {a.clientPhone ? (
                  <a href={`tel:${a.clientPhone}`} className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground" dir="ltr">
                    <PhoneIcon className="size-3" />
                    {a.clientPhone}
                  </a>
                ) : null}
                <div className="mt-0.5 text-xs text-muted-foreground">{t(`appointments.source.${a.source}`)}</div>
              </div>
              {a.clientId && org.can("view_customers") ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/clients/${a.clientId}`}>{t("appointments.details.viewProfile")}</Link>
                </Button>
              ) : null}
            </section>

            {a.cancellation && a.status === "cancelled" ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm">
                {t("appointments.details.cancelledBecause", { reason: a.cancellation.reason || "—" })}
                {a.cancellation.note ? <span className="block text-muted-foreground">{a.cancellation.note}</span> : null}
              </p>
            ) : null}

            <section className="grid gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("appointments.details.services")}</h3>
              <ul className="divide-y rounded-lg border">
                {a.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{i.serviceName}</div>
                      <div className="text-xs tabular text-muted-foreground">
                        {org.date(i.startAt, "time")} · {formatDuration(i.durationMin, locale)} · {i.staffName}
                      </div>
                    </div>
                    <div className="text-end text-sm tabular">
                      {org.money(i.priceMinor - i.discountMinor)}
                      {i.discountMinor > 0 ? <div className="text-xs text-muted-foreground line-through">{org.money(i.priceMinor)}</div> : null}
                    </div>
                  </li>
                ))}
                <li className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold">
                  <span>{t("appointments.details.total")}</span>
                  <span className="tabular">{org.money(a.totalMinor)}</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">{staffList.join(" · ")}</p>
            </section>

            {a.notes ? (
              <section className="grid gap-1">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("appointments.details.notes")}</h3>
                <p className="whitespace-pre-wrap text-sm">{a.notes}</p>
              </section>
            ) : null}

            {a.transactionId ? (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/sales/${a.transactionId}`}>
                  <ReceiptIcon />
                  {t("appointments.actions.viewInvoice")}
                </Link>
              </Button>
            ) : null}

            {a.createdAt ? <p className="text-xs text-muted-foreground">{t("appointments.details.createdAt", { date: org.date(a.createdAt, "datetime") })}</p> : null}
          </SheetBody>
          <SheetFooter className="flex-col items-stretch gap-2 sm:flex-col">
            {forward.length > 0 || canCheckout ? (
              <div className="grid grid-cols-2 gap-2">
                {forward.map((x) => (
                  <Button key={x.to} variant={x.primary ? "default" : "outline"} disabled={pending} onClick={() => change(x.to)}>
                    {runningTo === x.to ? <Loader2Icon className="animate-spin" /> : x.icon}
                    {x.label}
                  </Button>
                ))}
                {canCheckout ? (
                  <Button asChild variant={forward.length === 0 ? "default" : "secondary"} className={forward.length % 2 === 0 ? "col-span-2" : ""}>
                    <Link href={`/pos?appointment=${a.id}`}>
                      <ShoppingBagIcon />
                      {t("appointments.actions.checkout")}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              {canEdit && isEditableStatus(a.status) ? (
                <Button variant="ghost" size="sm" onClick={() => onEdit(a)}>
                  <PencilIcon />
                  {t("appointments.actions.edit")}
                </Button>
              ) : null}
              {secondary.map((x) => (
                <Button key={x.to} variant="ghost" size="sm" disabled={pending} onClick={() => change(x.to)}>
                  {x.icon}
                  {x.label}
                </Button>
              ))}
              {allowed("no_show") || allowed("cancelled") ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="ms-auto text-destructive hover:text-destructive">
                      {t("appointments.moreActions")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {allowed("no_show") ? (
                      <DropdownMenuItem onSelect={() => setNoShowOpen(true)}>
                        <UserXIcon />
                        {t("appointments.actions.noShow")}
                      </DropdownMenuItem>
                    ) : null}
                    {allowed("cancelled") ? (
                      <DropdownMenuItem destructive onSelect={() => setCancelOpen(true)}>
                        <XCircleIcon />
                        {t("appointments.actions.cancel")}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("appointments.cancelTitle")}
        description={t("appointments.cancelBody")}
        destructive
        confirmLabel={t("appointments.confirmCancel")}
        onConfirm={() => change("cancelled", { reason, note })}
      >
        <div className="grid gap-3">
          <Field label={t("appointments.cancelReason")}>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {org.settings.appointments.cancellationReasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("appointments.cancelNote")} optionalLabel={t("common.optional")}>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={noShowOpen}
        onOpenChange={setNoShowOpen}
        title={t("appointments.noShowTitle")}
        description={t("appointments.noShowBody")}
        destructive
        confirmLabel={t("appointments.actions.noShow")}
        onConfirm={() => change("no_show")}
      />
    </>
  );
}
