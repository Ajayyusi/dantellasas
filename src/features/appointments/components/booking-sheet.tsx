"use client";

import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getClientAction } from "@/features/clients/actions";
import { useAction } from "@/hooks/use-action";
import { minutesOfDay, minutesToTime, timeToMinutes, weekdayOfKey } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatClock, formatDuration } from "@/lib/i18n/format";
import { APPOINTMENT_SOURCES, type AppointmentDTO, type AppointmentSource } from "@/lib/types";
import { newId } from "@/lib/utils";

import { saveAppointmentAction } from "../actions";
import { overlaps } from "../layout";
import { isActiveStatus } from "../status";
import { ClientPicker, type ClientSelection } from "./client-picker";
import { ServiceCombobox } from "./service-combobox";
import type { CalendarCatalog, SlotTarget } from "./types";

interface Line {
  key: string;
  id?: string;
  serviceId: string;
  staffId: string;
  start: string;
  durationMin: number;
  priceMinor: number;
  discountMinor: number;
}

const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300];

export function BookingSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: SlotTarget | null;
  appointment: AppointmentDTO | null;
  catalog: CalendarCatalog;
  branchId: string;
  prefillClientId: string | null;
  dayAppointments: AppointmentDTO[];
}) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <BookingForm {...props} /> : null}
    </Sheet>
  );
}

function BookingForm({
  onOpenChange,
  slot,
  appointment,
  catalog,
  branchId,
  prefillClientId,
  dayAppointments,
}: {
  onOpenChange: (open: boolean) => void;
  slot: SlotTarget | null;
  appointment: AppointmentDTO | null;
  catalog: CalendarCatalog;
  branchId: string;
  prefillClientId: string | null;
  dayAppointments: AppointmentDTO[];
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const tz = org.timezone;
  const step = org.settings.appointments.slotMinutes;
  const services = useMemo(
    () => catalog.services.filter((s) => s.active && (s.branchIds.length === 0 || s.branchIds.includes(branchId))),
    [catalog.services, branchId],
  );

  const [client, setClient] = useState<ClientSelection>(() => {
    if (!appointment) return null;
    if (appointment.clientId) return { mode: "client", client: { id: appointment.clientId, fullName: appointment.clientName, phone: appointment.clientPhone } };
    return { mode: "walkin", name: appointment.clientName };
  });
  const [date, setDate] = useState(appointment?.dateKey ?? slot?.date ?? "");
  const [source, setSource] = useState<AppointmentSource>(appointment?.source ?? "phone");
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() => {
    if (appointment) {
      return appointment.items.map((i) => ({
        key: i.id,
        id: i.id,
        serviceId: i.serviceId,
        staffId: i.staffId,
        start: minutesToTime(minutesOfDay(new Date(i.startAt), tz)),
        durationMin: i.durationMin,
        priceMinor: i.priceMinor,
        discountMinor: i.discountMinor,
      }));
    }
    return [
      {
        key: newId("l"),
        serviceId: "",
        staffId: slot?.staffId ?? "",
        start: slot?.start || org.settings.appointments.dayStart,
        durationMin: org.settings.appointments.defaultDurationMinutes,
        priceMinor: 0,
        discountMinor: 0,
      },
    ];
  });
  const [checkoutAfter, setCheckoutAfter] = useState(false);

  useEffect(() => {
    if (!prefillClientId || appointment) return;
    let active = true;
    getClientAction({ id: prefillClientId }).then((res) => {
      if (active && res.ok) {
        const c = res.data;
        setClient({ mode: "client", client: { id: c.id, fullName: c.fullName, phone: c.phone, stats: c.stats, notes: c.notes, tags: c.tags } });
      }
    });
    return () => {
      active = false;
    };
  }, [prefillClientId, appointment]);

  const { run, pending, errorFor } = useAction(saveAppointmentAction, {
    success: appointment ? t("appointments.updated") : t("appointments.booked"),
    onSuccess: (data) => {
      onOpenChange(false);
      if (checkoutAfter) router.push(`/pos?appointment=${data.id}`);
    },
  });

  const slots = useMemo(() => {
    const out: string[] = [];
    const s = timeToMinutes(org.settings.appointments.dayStart);
    const e = timeToMinutes(org.settings.appointments.dayEnd);
    for (let m = Math.min(s, 6 * 60); m < Math.max(e, 23 * 60); m += step) out.push(minutesToTime(m));
    return out;
  }, [org.settings.appointments.dayStart, org.settings.appointments.dayEnd, step]);

  function availability(staffId: string, start: string, duration: number): "free" | "busy" | "off" | "break" {
    const person = catalog.staff.find((s) => s.id === staffId);
    if (!person || !date) return "free";
    const sched = person.schedule[String(weekdayOfKey(date))];
    const win = { start: timeToMinutes(start), end: timeToMinutes(start) + duration };
    if (!sched?.working || win.start < timeToMinutes(sched.start) || win.end > timeToMinutes(sched.end)) return "off";
    if (sched.breakStart && sched.breakEnd && overlaps(win, { start: timeToMinutes(sched.breakStart), end: timeToMinutes(sched.breakEnd) })) return "break";
    const busy = dayAppointments.some(
      (a) =>
        a.id !== appointment?.id &&
        a.dateKey === date &&
        isActiveStatus(a.status) &&
        a.items.some((i) => {
          if (i.staffId !== staffId) return false;
          const s = minutesOfDay(new Date(i.startAt), tz);
          return overlaps(win, { start: s, end: s + i.durationMin });
        }),
    );
    return busy ? "busy" : "free";
  }

  function update(key: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function chooseService(key: string, serviceId: string) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const eligible = catalog.staff.filter((s) => service.staffIds.length === 0 || service.staffIds.includes(s.id));
        const keep = eligible.some((s) => s.id === l.staffId);
        const staffId = keep ? l.staffId : (eligible.find((s) => availability(s.id, l.start, service.durationMin) === "free") ?? eligible[0])?.id ?? l.staffId;
        return { ...l, serviceId, staffId, durationMin: service.durationMin, priceMinor: service.priceMinor, discountMinor: 0 };
      }),
    );
  }

  function addLine() {
    const last = lines[lines.length - 1];
    const start = last ? minutesToTime(timeToMinutes(last.start) + last.durationMin) : org.settings.appointments.dayStart;
    setLines((ls) => [
      ...ls,
      { key: newId("l"), serviceId: "", staffId: last?.staffId ?? "", start, durationMin: org.settings.appointments.defaultDurationMinutes, priceMinor: 0, discountMinor: 0 },
    ]);
  }

  const complete = lines.every((l) => l.serviceId && l.staffId);
  const total = lines.reduce((s, l) => s + l.priceMinor - l.discountMinor, 0);
  const spanStart = Math.min(...lines.map((l) => timeToMinutes(l.start)));
  const spanEnd = Math.max(...lines.map((l) => timeToMinutes(l.start) + l.durationMin));

  function submit(checkout: boolean) {
    setCheckoutAfter(checkout);
    void run({
      id: appointment?.id,
      branchId,
      date,
      clientId: client?.mode === "client" ? client.client.id : null,
      walkInName: client?.mode === "walkin" ? client.name : "",
      source: client?.mode === "walkin" && source === "phone" ? "walk_in" : source,
      notes,
      items: lines.map((l) => ({
        id: l.id,
        serviceId: l.serviceId,
        staffId: l.staffId,
        start: l.start,
        durationMin: l.durationMin,
        priceMinor: l.priceMinor,
        discountMinor: l.discountMinor,
      })),
    });
  }

  const statusLabel = { busy: t("appointments.form.busy"), off: t("appointments.form.off"), break: t("appointments.form.onBreak"), free: "" };

  return (
    <SheetContent className="sm:max-w-2xl">
      <SheetHeader>
        <SheetTitle>{appointment ? t("appointments.editAppointment") : t("appointments.newAppointment")}</SheetTitle>
      </SheetHeader>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        <SheetBody className="grid gap-6">
          <Field label={t("appointments.form.client")} error={errorFor("clientId")}>
            <ClientPicker value={client} onChange={setClient} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("appointments.form.date")} htmlFor="appt-date" error={errorFor("date")}>
              <Input id="appt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label={t("appointments.form.source")} htmlFor="appt-source">
              <Select value={source} onValueChange={(v) => setSource(v as AppointmentSource)}>
                <SelectTrigger id="appt-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`appointments.source.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("appointments.form.services")}</h3>
              {lines.some((l) => l.serviceId) ? (
                <span className="text-[13px] text-muted-foreground">
                  {t("appointments.form.summary", { count: lines.length, duration: formatDuration(spanEnd - spanStart, locale) })}
                </span>
              ) : null}
            </div>
            <ol className="grid gap-3">
              {lines.map((l, idx) => {
                const service = services.find((s) => s.id === l.serviceId);
                const eligible = catalog.staff.filter((s) => !service || service.staffIds.length === 0 || service.staffIds.includes(s.id));
                const others = catalog.staff.filter((s) => !eligible.includes(s));
                const avail = l.staffId ? availability(l.staffId, l.start, l.durationMin) : "free";
                return (
                  <li key={l.key} className="grid gap-3 rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <span className="mt-2 grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <ServiceCombobox
                          services={services}
                          categories={catalog.categories}
                          value={l.serviceId}
                          onChange={(s) => chooseService(l.key, s.id)}
                          invalid={!!errorFor(`items.${idx}.serviceId`)}
                        />
                      </div>
                      {lines.length > 1 ? (
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label={t("appointments.form.removeLine")}>
                          <Trash2Icon />
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3 ps-7 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
                      <Field label={t("appointments.form.staff")} className="col-span-2 sm:col-span-1" error={errorFor(`items.${idx}.staffId`)}>
                        <Select value={l.staffId} onValueChange={(v) => update(l.key, { staffId: v })}>
                          <SelectTrigger size="sm" className="min-w-0" aria-label={t("appointments.form.staff")}>
                            <SelectValue placeholder={t("appointments.form.chooseStaff")}>
                              {catalog.staff.find((s) => s.id === l.staffId)?.displayName}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {service ? <SelectLabel>{t("appointments.form.anyAvailable")}</SelectLabel> : null}
                              {eligible.map((s) => {
                                const a = availability(s.id, l.start, l.durationMin);
                                return (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.displayName}
                                    {a !== "free" ? <span className="ms-1 text-xs text-muted-foreground">· {statusLabel[a]}</span> : null}
                                  </SelectItem>
                                );
                              })}
                            </SelectGroup>
                            {others.length > 0 ? (
                              <SelectGroup>
                                <SelectLabel>{t("appointments.form.otherStaff")}</SelectLabel>
                                {others.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.displayName}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ) : null}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label={t("appointments.form.start")}>
                        <Select value={l.start} onValueChange={(v) => update(l.key, { start: v })}>
                          <SelectTrigger size="sm" aria-label={t("appointments.form.start")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(slots.includes(l.start) ? slots : [...slots, l.start].sort()).map((s) => (
                              <SelectItem key={s} value={s}>
                                {formatClock(timeToMinutes(s), locale)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label={t("appointments.form.duration")}>
                        <Select value={String(l.durationMin)} onValueChange={(v) => update(l.key, { durationMin: Number(v) })}>
                          <SelectTrigger size="sm" aria-label={t("appointments.form.duration")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(DURATIONS.includes(l.durationMin) ? DURATIONS : [...DURATIONS, l.durationMin].sort((a, b) => a - b)).map((d) => (
                              <SelectItem key={d} value={String(d)}>
                                {formatDuration(d, locale)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label={t("appointments.form.price")}>
                        <MoneyInput value={l.priceMinor} onChange={(v) => update(l.key, { priceMinor: v })} currency={org.currency} aria-label={t("appointments.form.price")} />
                      </Field>
                    </div>
                    {avail !== "free" ? (
                      <p className="ps-7 text-[13px] text-warning">
                        {catalog.staff.find((s) => s.id === l.staffId)?.displayName}: {statusLabel[avail]}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="w-fit">
              <PlusIcon />
              {t("appointments.form.addService")}
            </Button>
          </div>

          <Field label={t("appointments.form.notes")} htmlFor="appt-notes">
            <Textarea id="appt-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("appointments.form.notesPlaceholder")} />
          </Field>
        </SheetBody>
        <SheetFooter className="flex-wrap justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">{t("appointments.form.total")} </span>
            <span className="text-base font-semibold tabular">{org.money(total)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            {!appointment && org.can("create_sales") ? (
              <Button type="button" variant="secondary" disabled={pending || !client || !complete || !date} onClick={() => submit(true)}>
                {t("appointments.form.saveAndCheckout")}
              </Button>
            ) : null}
            <Button type="submit" disabled={pending || !client || !complete || !date} title={!client ? t("appointments.form.pickClientFirst") : undefined}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {appointment ? t("appointments.form.saveChanges") : t("appointments.form.save")}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
