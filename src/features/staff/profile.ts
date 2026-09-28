import "server-only";

import { isActiveStatus } from "@/features/appointments/status";
import { eachDayKey, weekdayOfKey } from "@/lib/dates";
import type { AppointmentDTO, TransactionDTO, WeeklySchedule } from "@/lib/types";

import type { StaffLine, StaffMonthStats, StaffSaleLine } from "./types";
import { shiftMinutes } from "./utils";

/** Appointment lines assigned to one staff member, oldest first. */
export function toStaffLines(appointments: AppointmentDTO[], staffId: string): StaffLine[] {
  return appointments
    .flatMap((a) =>
      a.items
        .filter((i) => i.staffId === staffId)
        .map(
          (i): StaffLine => ({
            id: `${a.id}:${i.id}`,
            appointmentId: a.id,
            branchId: a.branchId,
            dateKey: a.dateKey,
            startAt: i.startAt,
            durationMin: i.durationMin,
            serviceName: i.serviceName,
            clientName: a.clientName,
            status: a.status,
            priceMinor: Math.max(0, i.priceMinor - i.discountMinor),
          }),
        ),
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Invoice lines credited to one staff member (void invoices excluded), newest first. */
export function toSaleLines(transactions: TransactionDTO[], staffId: string): StaffSaleLine[] {
  return transactions
    .filter((t) => t.status !== "void")
    .flatMap((t) =>
      t.items
        .filter((i) => i.staffId === staffId)
        .map(
          (i): StaffSaleLine => ({
            id: `${t.id}:${i.id}`,
            transactionId: t.id,
            number: t.number,
            dateKey: t.dateKey,
            clientName: t.clientName,
            name: i.name,
            type: i.type,
            quantity: i.quantity,
            amountMinor: i.totalMinor,
            commissionMinor: i.commissionMinor,
            status: t.status,
          }),
        ),
    )
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.number.localeCompare(a.number));
}

/**
 * This month so far: services performed, revenue and commission from invoice
 * lines, and utilisation = booked minutes ÷ scheduled minutes (weekly schedule).
 */
export function monthStats(input: {
  lines: StaffLine[];
  schedule: WeeklySchedule;
  month: { from: string; to: string };
  transactions: TransactionDTO[] | null;
  staffId: string;
}): StaffMonthStats {
  const { from, to } = input.month;
  const inMonth = input.lines.filter((l) => l.dateKey >= from && l.dateKey <= to);
  const sales = input.transactions ? toSaleLines(input.transactions, input.staffId) : null;
  return {
    performed: inMonth.filter((l) => l.status === "completed").length,
    bookedMinutes: inMonth.filter((l) => isActiveStatus(l.status)).reduce((s, l) => s + l.durationMin, 0),
    scheduledMinutes: eachDayKey(from, to).reduce((s, k) => s + shiftMinutes(input.schedule[String(weekdayOfKey(k))]), 0),
    revenueMinor: sales ? sales.reduce((s, l) => s + l.amountMinor, 0) : null,
    commissionMinor: sales ? sales.reduce((s, l) => s + l.commissionMinor, 0) : null,
  };
}
