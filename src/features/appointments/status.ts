import type { Permission } from "@/lib/permissions";
import type { AppointmentStatus } from "@/lib/types";

/**
 * Appointment lifecycle. booked → confirmed → checked_in → in_service →
 * completed, with cancelled / no_show as exits. "Undo" steps exist for the
 * front desk's common mistakes (e.g. checked in the wrong person).
 */
export const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ["confirmed", "checked_in", "cancelled", "no_show"],
  confirmed: ["booked", "checked_in", "cancelled", "no_show"],
  checked_in: ["confirmed", "in_service", "completed", "cancelled"],
  in_service: ["checked_in", "completed"],
  completed: [],
  cancelled: ["booked"],
  no_show: ["booked"],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Permission required to move into a status. */
export function permissionForStatus(to: AppointmentStatus): Permission {
  return to === "cancelled" || to === "no_show" ? "cancel_appointments" : "edit_appointments";
}

/** Statuses that occupy the calendar (count for conflicts and utilisation). */
export function isActiveStatus(status: AppointmentStatus): boolean {
  return status !== "cancelled" && status !== "no_show";
}

/** Statuses whose lines can still be edited or moved. */
export function isEditableStatus(status: AppointmentStatus): boolean {
  return status === "booked" || status === "confirmed" || status === "checked_in";
}
