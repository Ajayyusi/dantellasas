import { z } from "zod";

export const categoryInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "validation.required").max(60, "validation.tooLong"),
  nameAr: z.string().trim().max(60, "validation.tooLong").default(""),
});

export const setActiveInput = z.object({ id: z.string().min(1), active: z.boolean() });

export const productInput = z.object({
  id: z.string().optional(),
  sku: z.string().trim().max(40, "validation.tooLong").default(""),
  barcode: z.string().trim().max(64, "validation.tooLong").default(""),
  name: z.string().trim().min(1, "validation.required").max(120, "validation.tooLong"),
  nameAr: z.string().trim().max(120, "validation.tooLong").default(""),
  brand: z.string().trim().max(60, "validation.tooLong").default(""),
  categoryId: z.string().default(""),
  supplierId: z.string().nullable().default(null),
  costMinor: z.number().int().min(0, "validation.nonNegative").max(100_000_000),
  priceMinor: z.number().int().min(0, "validation.nonNegative").max(100_000_000),
  taxMode: z.enum(["default", "exempt", "rate"]).default("default"),
  taxRateId: z.string().nullable().default(null),
  minStock: z.number().int("validation.invalid").min(0, "validation.nonNegative").max(1_000_000).default(0),
  trackStock: z.boolean().default(true),
  usage: z.enum(["retail", "professional", "both"]).default("retail"),
  active: z.boolean().default(true),
});
export type ProductInput = z.input<typeof productInput>;

export const supplierInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "validation.required").max(120, "validation.tooLong"),
  contactName: z.string().trim().max(80, "validation.tooLong").default(""),
  phone: z.string().trim().max(30, "validation.tooLong").default(""),
  email: z.union([z.literal(""), z.email("validation.email")]).default(""),
  trn: z.string().trim().max(20, "validation.tooLong").default(""),
  notes: z.string().trim().max(500, "validation.tooLong").default(""),
  active: z.boolean().default(true),
});
export type SupplierInput = z.input<typeof supplierInput>;

const quantity = z.number().int("validation.invalid").min(1, "validation.positive").max(1_000_000);
const note = z.string().trim().max(300, "validation.tooLong").default("");
const branchId = z.string().min(1, "errors.branchRequired");

export const stockOperationInput = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("receive"),
    productId: z.string().min(1),
    branchId,
    quantity,
    unitCostMinor: z.number().int().min(0, "validation.nonNegative").max(100_000_000),
    note,
  }),
  z.object({
    op: z.literal("adjust"),
    productId: z.string().min(1),
    branchId,
    direction: z.enum(["increase", "decrease"]),
    quantity,
    // A reason is required for adjustments.
    note: z.string().trim().min(1, "inventory.errors.reasonRequired").max(300, "validation.tooLong"),
  }),
  z.object({ op: z.literal("internal_use"), productId: z.string().min(1), branchId, quantity, note }),
  z.object({
    op: z.literal("return"),
    productId: z.string().min(1),
    branchId,
    direction: z.enum(["to_supplier", "from_client"]),
    quantity,
    note,
  }),
  z.object({
    op: z.literal("transfer"),
    productId: z.string().min(1),
    branchId,
    toBranchId: z.string().min(1, "errors.branchRequired"),
    quantity,
    note,
  }),
]);
export type StockOperationInput = z.input<typeof stockOperationInput>;
