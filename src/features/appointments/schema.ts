import { z } from "zod";

import { APPOINTMENT_SOURCES, APPOINTMENT_STATUSES } from "@/lib/types";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.invalid");
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.invalid");

export const appointmentLineInput = z.object({
  id: z.string().optional(),
  serviceId: z.string().min(1, "validation.required"),
  staffId: z.string().min(1, "validation.required"),
  start: time,
  durationMin: z.number().int().min(5).max(720),
  priceMinor: z.number().int().min(0).max(100_000_000),
  discountMinor: z.number().int().min(0).max(100_000_000).default(0),
});
export type AppointmentLineInput = z.input<typeof appointmentLineInput>;

export const appointmentInput = z
  .object({
    id: z.string().optional(),
    branchId: z.string().optional(),
    date: dateKey,
    clientId: z.string().nullable().default(null),
    walkInName: z.string().trim().max(120).default(""),
    source: z.enum(APPOINTMENT_SOURCES).default("phone"),
    notes: z.string().trim().max(1000, "validation.tooLong").default(""),
    items: z.array(appointmentLineInput).min(1, "validation.atLeastOneItem").max(12),
  })
  .refine((v) => v.items.every((i) => i.discountMinor <= i.priceMinor), {
    message: "validation.invalid",
    path: ["items"],
  });
export type AppointmentInput = z.input<typeof appointmentInput>;

export const rescheduleInput = z.object({
  id: z.string().min(1),
  date: dateKey,
  start: time,
  /** Reassign every line to this staff member (single-staff appointments). */
  staffId: z.string().optional(),
});

export const statusInput = z.object({
  id: z.string().min(1),
  status: z.enum(APPOINTMENT_STATUSES),
  reason: z.string().trim().max(120).default(""),
  note: z.string().trim().max(500).default(""),
});

export const blockedTimeInput = z.object({
  staffId: z.string().min(1, "validation.required"),
  date: dateKey,
  start: time,
  end: time,
  reason: z.string().trim().max(120).default(""),
});
