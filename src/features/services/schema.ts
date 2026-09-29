import { z } from "zod";

export const categoryInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "validation.required").max(60, "validation.tooLong"),
  nameAr: z.string().trim().max(60, "validation.tooLong").default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "validation.invalid").default("#965660"),
});
export type CategoryInput = z.input<typeof categoryInput>;

export const serviceInput = z.object({
  id: z.string().optional(),
  categoryId: z.string().default(""),
  name: z.string().trim().min(1, "validation.required").max(80, "validation.tooLong"),
  nameAr: z.string().trim().max(80, "validation.tooLong").default(""),
  description: z.string().trim().max(500, "validation.tooLong").default(""),
  durationMin: z.number().int().min(5, "validation.positive").max(600),
  bufferMin: z.number().int().min(0).max(120).default(0),
  priceMinor: z.number().int().min(0, "validation.nonNegative").max(100_000_000),
  taxMode: z.enum(["default", "exempt", "rate"]).default("default"),
  taxRateId: z.string().nullable().default(null),
  branchIds: z.array(z.string()).max(50).default([]),
  staffIds: z.array(z.string()).max(200).default([]),
  onlineBookable: z.boolean().default(true),
  active: z.boolean().default(true),
});
export type ServiceInput = z.input<typeof serviceInput>;

export const reorderInput = z.object({ ids: z.array(z.string()).min(1).max(500) });
