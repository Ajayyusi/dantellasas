import { z } from "zod";

import { isDateKey, timeToMinutes } from "@/lib/dates";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.invalid");
const optionalTime = z.union([time, z.literal("")]).optional();
const optionalDate = z
  .union([z.literal(""), z.string().refine((v) => isDateKey(v), "validation.invalid")])
  .nullable()
  .default(null)
  .transform((v) => v || null);

export const daySchedule = z
  .object({
    working: z.boolean(),
    start: time,
    end: time,
    breakStart: optionalTime,
    breakEnd: optionalTime,
  })
  .superRefine((d, ctx) => {
    if (!d.working) return;
    const start = timeToMinutes(d.start);
    const end = timeToMinutes(d.end);
    if (end <= start) ctx.addIssue({ code: "custom", path: ["end"], message: "validation.endAfterStart" });
    if (d.breakStart || d.breakEnd) {
      if (!d.breakStart || !d.breakEnd) {
        ctx.addIssue({ code: "custom", path: ["breakEnd"], message: "validation.required" });
        return;
      }
      const bs = timeToMinutes(d.breakStart);
      const be = timeToMinutes(d.breakEnd);
      if (be <= bs) ctx.addIssue({ code: "custom", path: ["breakEnd"], message: "validation.endAfterStart" });
      else if (bs < start || be > end) {
        ctx.addIssue({ code: "custom", path: ["breakStart"], message: "staff.errors.breakOutsideShift" });
      }
    }
  });

export const scheduleInput = z.object({
  "0": daySchedule,
  "1": daySchedule,
  "2": daySchedule,
  "3": daySchedule,
  "4": daySchedule,
  "5": daySchedule,
  "6": daySchedule,
});

const bps = z.number().int().min(0, "validation.nonNegative").max(10_000, "validation.invalid");

export const STAFF_STATUSES = ["active", "inactive", "archived"] as const;

export const staffInput = z.object({
  id: z.string().optional(),
  firstName: z.string().trim().min(1, "validation.required").max(40, "validation.tooLong"),
  lastName: z.string().trim().max(40, "validation.tooLong").default(""),
  displayName: z.string().trim().max(60, "validation.tooLong").default(""),
  phone: z
    .string()
    .trim()
    .max(30, "validation.tooLong")
    .refine((v) => v === "" || v.replace(/\D/g, "").length >= 7, "validation.phone")
    .default(""),
  email: z.union([z.literal(""), z.email("validation.email")]).default(""),
  position: z.string().trim().max(60, "validation.tooLong").default(""),
  branchIds: z.array(z.string().min(1)).min(1, "staff.errors.branchRequired").max(50),
  status: z.enum(STAFF_STATUSES).default("active"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "validation.invalid").default("#965660"),
  hireDate: optionalDate,
  bookable: z.boolean().default(true),
  schedule: scheduleInput,
  commission: z.object({ serviceRateBps: bps.default(0), productRateBps: bps.default(0) }),
  hr: z.object({
    dateOfBirth: optionalDate,
    nationality: z.string().trim().max(60, "validation.tooLong").default(""),
    passportExpiry: optionalDate,
    visaExpiry: optionalDate,
  }),
  /** Services this member performs (stored on services.staffIds). */
  serviceIds: z.array(z.string()).max(1000).default([]),
});
export type StaffInput = z.input<typeof staffInput>;

export const reorderStaffInput = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) });

export const staffStatusInput = z.object({ id: z.string().min(1), status: z.enum(STAFF_STATUSES) });

export const staffIdInput = z.object({ id: z.string().min(1) });
