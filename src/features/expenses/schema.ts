import { z } from "zod";

import { isDateKey } from "@/lib/dates";

export const expenseInput = z
  .object({
    id: z.string().optional(),
    categoryId: z.string().min(1, "validation.required"),
    amountMinor: z.number().int().min(1, "validation.positive").max(1_000_000_000),
    taxMinor: z.number().int().min(0, "validation.nonNegative").max(1_000_000_000).default(0),
    dateKey: z.string().refine((v) => isDateKey(v), "validation.invalid"),
    branchId: z.string().min(1, "errors.branchRequired"),
    vendor: z.string().trim().max(120, "validation.tooLong").default(""),
    supplierId: z.string().nullable().default(null),
    paymentMethod: z.string().max(60).default(""),
    description: z.string().trim().max(500, "validation.tooLong").default(""),
    /** Drop the current attachment (ignored when a new file is uploaded). */
    removeAttachment: z.boolean().default(false),
  })
  .refine((v) => v.taxMinor <= v.amountMinor, { path: ["taxMinor"], message: "expenses.errors.vatExceedsAmount" });
export type ExpenseInput = z.input<typeof expenseInput>;

export const expenseCategoryInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "validation.required").max(60, "validation.tooLong"),
  nameAr: z.string().trim().max(60, "validation.tooLong").default(""),
});
export type ExpenseCategoryInput = z.input<typeof expenseCategoryInput>;

export const RECEIPT_MAX_MB = 5;
export const RECEIPT_ACCEPT = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
