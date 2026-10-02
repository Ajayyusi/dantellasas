import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createSalonInput = z.object({
  businessName: z.string().trim().min(2, "validation.required").max(80, "validation.tooLong"),
  branchName: z.string().trim().min(1, "validation.required").max(60, "validation.tooLong"),
  ownerName: z.string().trim().min(1, "validation.required").max(80, "validation.tooLong"),
  ownerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, "validation.tooLong")
    .refine((v) => EMAIL_RE.test(v), "validation.email"),
  phone: z.string().trim().max(30, "validation.tooLong").optional(),
  defaultLocale: z.enum(["en", "ar"]),
  demoData: z.boolean().default(false),
});
export type CreateSalonInput = z.input<typeof createSalonInput>;

const orgId = z.string().trim().min(1).max(128);

export const salonStatusInput = z.object({ orgId, status: z.enum(["active", "suspended"]) });
export const salonIdInput = z.object({ orgId });
