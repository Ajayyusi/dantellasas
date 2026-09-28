"use client";

import { CheckIcon, MoveIcon } from "lucide-react";
import { useRef, useState } from "react";

import { useI18n } from "@/lib/i18n/client";
import type { AppointmentDTO, AppointmentItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatClock, formatHour } from "@/lib/i18n/format";

import { packColumns, snap } from "../layout";
import { statusColor } from "./status-badge";

export interface GridColumn {
  key: string;
  header: React.ReactNode;
  /** Shaded ranges (minutes since midnight): off hours, breaks, blocked time. */
  shaded: { start: number; end: number; kind: "off" | "break" | "blocked"; label?: string; id?: string }[];
  isToday?: boolean;
}

export interface GridEvent {
  key: string;
  columnKey: string;
  start: number;
  end: number;
  appointment: AppointmentDTO;
  line: AppointmentItemDTO;
  /** Colour dot for week view (staff colour). */
  accent?: string;
}

interface DragState {
  event: GridEvent;
  pointerId: number;
  originX: number;
  originY: number;
  moved: boolean;
  columnKey: string;
  start: number;
}

export function TimeGrid({
  columns,
  events,
  dayStart,
  dayEnd,
  slot,
  pxPerMin,
  nowMinute,
  canCreate,
  canMove,
  onSlotClick,
  onEventClick,
  onEventMove,
  onBlockedClick,
  columnMinWidth = 180,
}: {
  columns: GridColumn[];
  events: GridEvent[];
  dayStart: number;
  dayEnd: number;
  slot: number;
  pxPerMin: number;
  nowMinute: number | null;
  canCreate: boolean;
  canMove: boolean;
  onSlotClick: (columnKey: string, minute: number) => void;
  onEventClick: (appointment: AppointmentDTO) => void;
  onEventMove: (event: GridEvent, columnKey: string, start: number) => void;
  onBlockedClick?: (id: string) => void;
  columnMinWidth?: number;
}) {
  const { t, locale } = useI18n();
  const [drag, setDrag] = useState<DragState | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const height = (dayEnd - dayStart) * pxPerMin;
  const hours: number[] = [];
  for (let m = Math.ceil(dayStart / 60) * 60; m < dayEnd; m += 60) hours.push(m);
  const labelHours = hours.filter((m) => m > dayStart);

  const y = (minute: number) => (minute - dayStart) * pxPerMin;

  function columnAt(clientX: number, clientY: number): string | null {
    const el = document
      .elementsFromPoint(clientX, clientY)
      .find((e) => (e as HTMLElement).dataset?.col) as HTMLElement | undefined;
    return el?.dataset.col ?? null;
  }

  // Drag is tracked with window listeners so it survives re-renders and
  // pointer capture changes; state mirrors the ref for rendering.
  const dragRef = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  function onPointerDown(e: React.PointerEvent, ev: GridEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const start: DragState = {
      event: ev,
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      moved: false,
      columnKey: ev.columnKey,
      start: ev.start,
    };
    dragRef.current = start;

    const onMove = (me: PointerEvent) => {
      const d = dragRef.current;
      if (!d || me.pointerId !== d.pointerId) return;
      const dx = me.clientX - d.originX;
      const dy = me.clientY - d.originY;
      if (!d.moved && Math.hypot(dx, dy) < 5) return;
      if (!canMove) return;
      const delta = snap(dy / pxPerMin, slot);
      const duration = d.event.end - d.event.start;
      const next: DragState = {
        ...d,
        moved: true,
        start: Math.min(Math.max(dayStart, d.event.start + delta), dayEnd - duration),
        columnKey: columnAt(me.clientX, me.clientY) ?? d.columnKey,
      };
      dragRef.current = next;
      setDrag(next);
    };
    const finish = (ue: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ue.pointerId !== d.pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      dragRef.current = null;
      setDrag(null);
      if (!d.moved) {
        onEventClick(d.event.appointment);
        return;
      }
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 50);
      if (d.start !== d.event.start || d.columnKey !== d.event.columnKey) onEventMove(d.event, d.columnKey, d.start);
    };
    const cancel = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
  }

  function onColumnClick(e: React.MouseEvent<HTMLDivElement>, columnKey: string) {
    if (!canCreate || drag || suppressClick.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = dayStart + Math.floor((e.clientY - rect.top) / pxPerMin / slot) * slot;
    onSlotClick(columnKey, Math.max(dayStart, Math.min(minute, dayEnd - slot)));
  }

  return (
    <div className="relative overflow-auto rounded-xl border bg-card shadow-sm scrollbar-thin" style={{ maxHeight: "calc(100dvh - 12rem)" }}>
      <div className="min-w-fit">
        {/* Header */}
        <div className="sticky top-0 z-20 flex border-b bg-card">
          <div className="sticky start-0 z-10 w-14 shrink-0 border-e bg-card" />
          {columns.map((c) => (
            <div
              key={c.key}
              className={cn("flex-1 border-e px-2 py-2 last:border-e-0", c.isToday && "bg-primary/5")}
              style={{ minWidth: columnMinWidth }}
            >
              {c.header}
            </div>
          ))}
        </div>

        {/* Body */}
        <div ref={bodyRef} className="relative flex" style={{ height }}>
          {/* Time labels */}
          <div className="sticky start-0 z-10 w-14 shrink-0 border-e bg-card">
            {labelHours.map((m) => (
              <div
                key={m}
                className="absolute inset-x-0 -translate-y-2 whitespace-nowrap pe-2 text-end text-[11px] font-medium tabular text-muted-foreground"
                style={{ top: y(m) }}
              >
                {formatHour(m, locale)}
              </div>
            ))}
          </div>

          {columns.map((c) => {
            const colEvents = packColumns(
              events.filter((ev) => ev.columnKey === c.key).map((ev) => ({ ...ev, id: ev.key })),
            );
            return (
              <div
                key={c.key}
                data-col={c.key}
                role="presentation"
                onClick={(e) => onColumnClick(e, c.key)}
                className={cn(
                  "relative flex-1 border-e last:border-e-0",
                  canCreate && "cursor-cell",
                  c.isToday && "bg-primary/[0.02]",
                )}
                style={{ minWidth: columnMinWidth }}
              >
                {/* Hour and half-hour lines */}
                {hours.map((m) => (
                  <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-border/70" style={{ top: y(m) }} />
                ))}
                {hours.map((m) => (
                  <div key={`h${m}`} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/40" style={{ top: y(m + 30) }} />
                ))}

                {c.shaded.map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute inset-x-0 hatch",
                      s.kind === "blocked" ? "z-[1] bg-muted/60" : "pointer-events-none bg-muted/35",
                    )}
                    style={{ top: y(Math.max(s.start, dayStart)), height: (Math.min(s.end, dayEnd) - Math.max(s.start, dayStart)) * pxPerMin }}
                    onClick={
                      s.kind === "blocked" && s.id
                        ? (e) => {
                            e.stopPropagation();
                            onBlockedClick?.(s.id!);
                          }
                        : undefined
                    }
                  >
                    {s.kind !== "off" && (s.end - s.start) * pxPerMin > 18 ? (
                      <span className="block truncate px-2 pt-1 text-[11px] font-medium text-muted-foreground">
                        {s.label ?? (s.kind === "break" ? t("appointments.break") : t("appointments.blocked"))}
                      </span>
                    ) : null}
                  </div>
                ))}

                {c.isToday && nowMinute !== null && nowMinute >= dayStart && nowMinute <= dayEnd ? (
                  <div className="pointer-events-none absolute inset-x-0 z-[5] flex items-center" style={{ top: y(nowMinute) }}>
                    <span className="-ms-1 size-2 rounded-full bg-destructive" />
                    <span className="h-px flex-1 bg-destructive" />
                  </div>
                ) : null}

                {colEvents.map((ev) => (
                  <EventBlock
                    key={ev.key}
                    ev={ev}
                    top={y(ev.start)}
                    height={Math.max(18, (ev.end - ev.start) * pxPerMin - 2)}
                    widthPct={100 / ev.columns}
                    offsetPct={(100 / ev.columns) * ev.column}
                    dragging={!!drag?.moved && drag.event.key === ev.key}
                    onPointerDown={(e) => onPointerDown(e, ev)}
                    onKeyOpen={() => onEventClick(ev.appointment)}
                  />
                ))}

                {drag?.moved && drag.columnKey === c.key ? (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-30 rounded-md border-2 border-dashed border-primary bg-primary/10"
                    style={{ top: y(drag.start), height: (drag.event.end - drag.event.start) * pxPerMin - 2 }}
                  >
                    <span className="flex items-center gap-1 px-2 pt-1 text-[11px] font-semibold text-primary">
                      <MoveIcon className="size-3" />
                      {formatClock(drag.start, locale)}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventBlock({
  ev,
  top,
  height,
  widthPct,
  offsetPct,
  dragging,
  onPointerDown,
  onKeyOpen,
}: {
  ev: GridEvent;
  top: number;
  height: number;
  widthPct: number;
  offsetPct: number;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onKeyOpen: () => void;
}) {
  const { locale } = useI18n();
  const a = ev.appointment;
  const color = statusColor(a.status);
  const compact = height < 44;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${a.clientName} · ${ev.line.serviceName} · ${formatClock(ev.start, locale)}–${formatClock(ev.end, locale)}`}
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onKeyOpen();
        }
      }}
      className={cn(
        "absolute z-10 cursor-pointer touch-none select-none overflow-hidden rounded-md border border-s-[3px] px-2 py-1 text-start shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
        a.status === "completed" && "opacity-75",
        dragging && "opacity-35",
      )}
      style={{
        top,
        height,
        insetInlineStart: `calc(${offsetPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        borderColor: `color-mix(in oklch, ${color} 35%, var(--border))`,
        borderInlineStartColor: color,
        backgroundColor: `color-mix(in oklch, ${color} 10%, var(--card))`,
      }}
    >
      <div className="flex items-center gap-1">
        {ev.accent ? <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: ev.accent }} /> : null}
        <span className="truncate text-[12.5px] font-semibold leading-tight">{a.clientName}</span>
        {a.status === "completed" ? <CheckIcon className="ms-auto size-3.5 shrink-0 text-success" /> : null}
      </div>
      {!compact ? (
        <>
          <div className="truncate text-xs leading-snug text-muted-foreground">{ev.line.serviceName}</div>
          <div className="truncate text-[11px] tabular text-muted-foreground">
            {formatClock(ev.start, locale)} – {formatClock(ev.end, locale)}
          </div>
        </>
      ) : null}
    </div>
  );
}
