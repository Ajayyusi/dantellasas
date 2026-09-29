"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/common/page-header";
import { useNowMinute } from "@/hooks/use-browser";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { addDaysToKey, eachDayKey, minutesOfDay, minutesToTime, startOfWeekKey, timeToMinutes, weekdayOfKey } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { AppointmentDTO, BlockedTimeDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { rescheduleAppointmentAction } from "../actions";
import { isActiveStatus } from "../status";
import { AppointmentDetailsSheet } from "./appointment-details-sheet";
import { BlockTimeDialog } from "./block-time-dialog";
import { BookingSheet } from "./booking-sheet";
import { CalendarToolbar } from "./calendar-toolbar";
import { DaySummary } from "./day-summary";
import { AppointmentListView } from "./list-view";
import { TimeGrid, type GridColumn, type GridEvent } from "./time-grid";
import type { CalendarCatalog, CalendarViewMode, SlotTarget } from "./types";
import { useLiveCalendar } from "./use-live-calendar";

const mobileQuery = "(max-width: 767px)";
function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(mobileQuery);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  );
}

export function CalendarView({
  view,
  date,
  today,
  staffFilter,
  catalog,
  appointments: serverAppointments,
  blocked,
  branchId,
  focusAppointmentId,
  openNew,
  prefillClientId,
}: {
  view: CalendarViewMode;
  date: string;
  today: string;
  staffFilter: string | null;
  catalog: CalendarCatalog;
  appointments: AppointmentDTO[];
  blocked: BlockedTimeDTO[];
  branchId: string;
  focusAppointmentId: string | null;
  openNew: boolean;
  prefillClientId: string | null;
}) {
  const { t, te } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const isMobile = useIsMobile();
  const tz = org.timezone;

  const [appointments, setAppointments] = useState(serverAppointments);
  const [synced, setSynced] = useState(serverAppointments);
  if (synced !== serverAppointments) {
    setSynced(serverAppointments);
    setAppointments(serverAppointments);
  }

  const [booking, setBooking] = useState<{ open: boolean; slot: SlotTarget | null; appointment: AppointmentDTO | null; key: number }>({
    open: openNew,
    slot: openNew ? { date, start: "" } : null,
    appointment: null,
    key: 0,
  });
  const [detailsId, setDetailsId] = useState<string | null>(focusAppointmentId);
  const [blockDialog, setBlockDialog] = useState(false);
  const [mobileStaffId, setMobileStaffId] = useState<string | null>(null);

  const canCreate = org.can("create_appointments");
  const canEdit = org.can("edit_appointments");
  const weekStart = startOfWeekKey(date, org.settings.locale.weekStartsOn);
  const rangeFrom = view === "day" || view === "list" ? date : weekStart;
  const rangeTo = view === "day" || view === "list" ? date : addDaysToKey(weekStart, 6);

  useLiveCalendar(org.orgId, branchId, rangeFrom, rangeTo, org.can("view_all_appointments"));

  function navigate(patch: { view?: CalendarViewMode; date?: string; staff?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const k of ["new", "appointment", "client"]) params.delete(k);
    if (patch.view) params.set("view", patch.view);
    if (patch.date) params.set("date", patch.date);
    if (patch.staff !== undefined) {
      if (patch.staff) params.set("staff", patch.staff);
      else params.delete("staff");
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  // Grid bounds: configured day, widened to fit any booking outside it.
  const settings = org.settings.appointments;
  const slot = settings.slotMinutes;
  const pxPerMin = org.settings.appearance.calendarDensity === "compact" ? 1.15 : 1.6;
  const visible = appointments.filter((a) => isActiveStatus(a.status));
  const allLineMinutes = visible.flatMap((a) =>
    a.items.map((i) => {
      const s = minutesOfDay(new Date(i.startAt), tz);
      return [s, s + i.durationMin];
    }),
  );
  const dayStart = Math.min(timeToMinutes(settings.dayStart), ...allLineMinutes.map((x) => Math.floor(x[0]! / 60) * 60));
  const dayEnd = Math.max(timeToMinutes(settings.dayEnd), ...allLineMinutes.map((x) => Math.ceil(x[1]! / 60) * 60));
  const nowEpochMinute = useNowMinute();
  const nowMinute = nowEpochMinute === null ? null : minutesOfDay(nowEpochMinute * 60_000, tz);

  const staffById = useMemo(() => new Map(catalog.staff.map((s) => [s.id, s])), [catalog.staff]);

  function shadingForStaff(staffId: string, dayKey: string): GridColumn["shaded"] {
    const person = staffById.get(staffId);
    const out: GridColumn["shaded"] = [];
    const sched = person?.schedule[String(weekdayOfKey(dayKey))];
    if (!sched || !sched.working) {
      out.push({ start: dayStart, end: dayEnd, kind: "off", label: t("appointments.offHours") });
    } else {
      const s = timeToMinutes(sched.start);
      const e = timeToMinutes(sched.end);
      if (s > dayStart) out.push({ start: dayStart, end: s, kind: "off" });
      if (e < dayEnd) out.push({ start: e, end: dayEnd, kind: "off" });
      if (sched.breakStart && sched.breakEnd) {
        out.push({ start: timeToMinutes(sched.breakStart), end: timeToMinutes(sched.breakEnd), kind: "break" });
      }
    }
    for (const b of blocked) {
      if (b.staffId !== staffId || b.dateKey !== dayKey) continue;
      out.push({
        start: minutesOfDay(new Date(b.startAt), tz),
        end: minutesOfDay(new Date(b.endAt), tz),
        kind: "blocked",
        label: b.reason || t("appointments.blocked"),
        id: b.id,
      });
    }
    return out;
  }

  function lineEvent(a: AppointmentDTO, line: AppointmentDTO["items"][number], columnKey: string, accent?: string): GridEvent {
    const start = minutesOfDay(new Date(line.startAt), tz);
    return { key: `${a.id}:${line.id}`, columnKey, start, end: start + line.durationMin, appointment: a, line, accent };
  }

  const staffHeader = (s: (typeof catalog.staff)[number], dayKey: string) => {
    const count = visible.filter((a) => a.dateKey === dayKey && a.items.some((i) => i.staffId === s.id)).length;
    return (
      <div className="flex items-center gap-2.5">
        <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-9 text-[13px]" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold leading-tight">{s.displayName}</div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">{t("appointments.appointmentsCount", { count })}</div>
        </div>
      </div>
    );
  };

  const dayHeader = (key: string) => (
    <div className={cn("text-center", key === today && "text-primary")}>
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{org.dateKey(key, "weekday")}</div>
      <div className="font-display text-[26px] font-semibold leading-tight tabular">{org.dateKey(key, "dayNumber")}</div>
    </div>
  );

  let columns: GridColumn[] = [];
  let events: GridEvent[] = [];
  let singleStaffId: string | null = null;

  if (view === "day") {
    const selected = isMobile ? (catalog.staff.find((s) => s.id === mobileStaffId) ?? catalog.staff[0]) : null;
    const staffCols = selected ? [selected] : catalog.staff;
    columns = staffCols.map((s) => ({ key: s.id, header: staffHeader(s, date), shaded: shadingForStaff(s.id, date), isToday: false }));
    events = visible.flatMap((a) => a.items.filter((i) => staffCols.some((s) => s.id === i.staffId)).map((i) => lineEvent(a, i, i.staffId)));
  } else if (view === "week" || view === "staff") {
    singleStaffId = view === "staff" ? (staffFilter ?? catalog.staff[0]?.id ?? null) : staffFilter;
    const days = eachDayKey(weekStart, addDaysToKey(weekStart, 6));
    const branch = org.branches.find((b) => b.id === branchId);
    columns = days.map((k) => {
      let shaded: GridColumn["shaded"] = [];
      if (singleStaffId) shaded = shadingForStaff(singleStaffId, k);
      else {
        const h = branch?.workingHours[String(weekdayOfKey(k))];
        if (h && !h.open) shaded = [{ start: dayStart, end: dayEnd, kind: "off" }];
        else if (h) {
          const s = timeToMinutes(h.start);
          const e = timeToMinutes(h.end);
          if (s > dayStart) shaded.push({ start: dayStart, end: s, kind: "off" });
          if (e < dayEnd) shaded.push({ start: e, end: dayEnd, kind: "off" });
        }
      }
      return { key: k, header: dayHeader(k), shaded, isToday: k === today };
    });
    events = visible.flatMap((a) =>
      a.items
        .filter((i) => !singleStaffId || i.staffId === singleStaffId)
        .map((i) => lineEvent(a, i, a.dateKey, singleStaffId ? undefined : staffById.get(i.staffId)?.color)),
    );
  }

  function openSlot(columnKey: string, minute: number) {
    const start = minutesToTime(minute);
    if (view === "day") setBooking({ open: true, slot: { date, start, staffId: columnKey }, appointment: null, key: booking.key + 1 });
    else setBooking({ open: true, slot: { date: columnKey, start, staffId: singleStaffId ?? undefined }, appointment: null, key: booking.key + 1 });
  }

  async function moveEvent(ev: GridEvent, columnKey: string, newLineStart: number) {
    const a = ev.appointment;
    const delta = newLineStart - ev.start;
    const earliest = Math.min(...a.items.map((i) => minutesOfDay(new Date(i.startAt), tz)));
    const singleStaff = new Set(a.items.map((i) => i.staffId)).size === 1;
    const targetDate = view === "day" ? a.dateKey : columnKey;
    const targetStaff = view === "day" && columnKey !== ev.line.staffId && singleStaff ? columnKey : undefined;
    if (view === "day" && columnKey !== ev.line.staffId && !singleStaff && delta === 0) return;
    const newStart = minutesToTime(earliest + delta);

    // Optimistic update
    const dayShift = (Date.parse(`${targetDate}T00:00:00Z`) - Date.parse(`${a.dateKey}T00:00:00Z`)) / 60000;
    const shiftMs = (delta + dayShift) * 60000;
    const moved: AppointmentDTO = {
      ...a,
      dateKey: targetDate,
      startAt: new Date(Date.parse(a.startAt) + shiftMs).toISOString(),
      endAt: new Date(Date.parse(a.endAt) + shiftMs).toISOString(),
      items: a.items.map((i) => ({
        ...i,
        startAt: new Date(Date.parse(i.startAt) + shiftMs).toISOString(),
        staffId: targetStaff ?? i.staffId,
        staffName: targetStaff ? (staffById.get(targetStaff)?.displayName ?? i.staffName) : i.staffName,
      })),
    };
    setAppointments((list) => list.map((x) => (x.id === a.id ? moved : x)));
    const res = await rescheduleAppointmentAction({ id: a.id, date: targetDate, start: newStart, staffId: targetStaff });
    if (res.ok) toast.success(t("appointments.moved", { time: newStart }));
    else {
      toast.error(te(res.error, res.vars));
      setAppointments((list) => list.map((x) => (x.id === a.id ? a : x)));
    }
  }

  const details = appointments.find((a) => a.id === detailsId) ?? null;

  return (
    <PageContainer wide className="pb-4">
      <CalendarToolbar
        view={view}
        date={date}
        today={today}
        staffId={singleStaffId}
        staff={catalog.staff}
        pending={pending}
        canCreate={canCreate}
        canBlock={canEdit && catalog.staff.length > 0}
        onNavigate={navigate}
        onNew={() => setBooking({ open: true, slot: { date, start: "" }, appointment: null, key: booking.key + 1 })}
        onBlock={() => setBlockDialog(true)}
      />

      {view === "day" ? <DaySummary appointments={appointments} /> : null}

      {view === "day" && isMobile && catalog.staff.length > 1 ? (
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin">
          {catalog.staff.map((s) => {
            const active = (mobileStaffId ?? catalog.staff[0]?.id) === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setMobileStaffId(s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border py-1.5 ps-1.5 pe-3.5 text-sm font-medium shadow-xs transition-colors",
                  active ? "border-primary/40 bg-primary-soft text-primary" : "bg-card text-foreground",
                )}
              >
                <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-7 text-[11px]" />
                {s.displayName}
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "list" ? (
        <AppointmentListView appointments={appointments} onOpen={(a) => setDetailsId(a.id)} />
      ) : (
        <TimeGrid
          columns={columns}
          events={events}
          dayStart={dayStart}
          dayEnd={dayEnd}
          slot={slot}
          pxPerMin={pxPerMin}
          nowMinute={nowMinute}
          canCreate={canCreate}
          canMove={canEdit}
          onSlotClick={openSlot}
          onEventClick={(a) => setDetailsId(a.id)}
          onEventMove={moveEvent}
          columnMinWidth={view === "day" ? 180 : 120}
        />
      )}

      <BookingSheet
        key={booking.key}
        open={booking.open}
        onOpenChange={(open) => setBooking((b) => ({ ...b, open }))}
        slot={booking.slot}
        appointment={booking.appointment}
        catalog={catalog}
        branchId={branchId}
        prefillClientId={booking.key === 0 ? prefillClientId : null}
        dayAppointments={appointments}
      />
      <AppointmentDetailsSheet
        appointment={details}
        open={!!details}
        onOpenChange={(open) => !open && setDetailsId(null)}
        onEdit={(a) => {
          setDetailsId(null);
          setBooking({ open: true, slot: null, appointment: a, key: booking.key + 1 });
        }}
      />
      <BlockTimeDialog open={blockDialog} onOpenChange={setBlockDialog} staff={catalog.staff} date={date} blocked={blocked} />
    </PageContainer>
  );
}
