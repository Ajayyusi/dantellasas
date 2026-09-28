import { z } from "zod";

export const clientInput = z.object({
  id: z.string().optional(),
  firstName: z.string().trim().min(1, "validation.required").max(60, "validation.tooLong"),
  lastName: z.string().trim().max(60, "validation.tooLong").default(""),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || v.replace(/\D/g, "").length >= 7, "validation.phone")
    .default(""),
  email: z.union([z.literal(""), z.email("validation.email")]).default(""),
  birthday: z
    .object({ month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31), year: z.number().int().min(1900).max(2100).optional() })
    .nullable()
    .default(null),
  gender: z.enum(["", "female", "male", "other"]).default(""),
  nationality: z.string().trim().max(60).default(""),
  source: z.string().trim().max(60).default(""),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
  notes: z.string().trim().max(2000, "validation.tooLong").default(""),
  preferredStaffId: z.string().nullable().default(null),
  marketingConsent: z.boolean().default(false),
});
export type ClientInput = z.input<typeof clientInput>;

/** Minimal inline creation from the booking drawer / checkout. */
export const quickClientInput = z.object({
  fullName: z.string().trim().min(1, "validation.required").max(120, "validation.tooLong"),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || v.replace(/\D/g, "").length >= 7, "validation.phone")
    .default(""),
  email: z.union([z.literal(""), z.email("validation.email")]).default(""),
});
export type QuickClientInput = z.input<typeof quickClientInput>;
