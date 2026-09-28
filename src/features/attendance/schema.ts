import { z } from "zod";

import { isDateKey } from "@/lib/dates";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.invalid");
const dateKey = z.string().refine((v) => isDateKey(v), "validation.invalid");

export const clockInput = z.object({
  staffId: z.string().min(1),
  branchId: z.string().nullable().optional(),
});
export type ClockInput = z.input<typeof clockInput>;

export const correctAttendanceInput = z.object({
  id: z.string().min(1),
  clockIn: time,
  clockOut: z.union([time, z.literal("")]).default(""),
  breaks: z
    .array(z.object({ start: time, end: z.union([time, z.literal("")]).default("") }))
    .max(10)
    .default([]),
  reason: z.string().trim().min(3, "validation.required").max(300, "validation.tooLong"),
});
export type CorrectAttendanceInput = z.input<typeof correctAttendanceInput>;

export const LEAVE_TYPES = ["annual", "sick", "unpaid", "other"] as const;

export const leaveInput = z
  .object({
    staffId: z.string().min(1, "validation.required"),
    type: z.enum(LEAVE_TYPES),
    startDate: dateKey,
    endDate: dateKey,
    note: z.string().trim().max(500, "validation.tooLong").default(""),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "validation.endAfterStart" });
export type LeaveInput = z.input<typeof leaveInput>;

export const leaveDecisionInput = z.object({
  id: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
});
