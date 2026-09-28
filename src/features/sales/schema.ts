import { z } from "zod";

const minor = z.number().int().min(0).max(100_000_000);

export const saleLineInput = z.object({
  key: z.string().min(1).max(40),
  type: z.enum(["service", "product", "package", "membership", "gift_card"]),
  refId: z.string().max(80).default(""),
  staffId: z.string().nullable().default(null),
  quantity: z.number().int().min(1).max(99),
  unitPriceMinor: minor,
  discountMinor: minor.default(0),
  /** Service line covered by one of the client's service packages. */
  redeemClientPackageId: z.string().nullable().default(null),
  /** Appointment line this came from (keeps staff/price provenance). */
  appointmentLineId: z.string().nullable().default(null),
  giftCard: z
    .object({
      recipientName: z.string().trim().max(120).default(""),
      recipientEmail: z.union([z.literal(""), z.email("validation.email")]).default(""),
      message: z.string().trim().max(300).default(""),
    })
    .nullable()
    .default(null),
});
export type SaleLineInput = z.input<typeof saleLineInput>;

export const salePaymentInput = z.object({
  methodId: z.string().min(1),
  amountMinor: minor.refine((v) => v > 0, "validation.positive"),
  reference: z.string().trim().max(80).default(""),
  giftCardCode: z.string().trim().max(40).default(""),
  clientPackageId: z.string().nullable().default(null),
});
export type SalePaymentInput = z.input<typeof salePaymentInput>;

export const saleInput = z.object({
  branchId: z.string().optional(),
  clientId: z.string().nullable().default(null),
  appointmentId: z.string().nullable().default(null),
  lines: z.array(saleLineInput).min(1, "validation.atLeastOneItem").max(60),
  orderDiscount: z
    .object({
      kind: z.enum(["none", "percent", "fixed", "code"]),
      valueBps: z.number().int().min(0).max(10000).default(0),
      valueMinor: minor.default(0),
      code: z.string().trim().max(40).default(""),
    })
    .default({ kind: "none", valueBps: 0, valueMinor: 0, code: "" }),
  tip: z.object({ amountMinor: minor.default(0), staffId: z.string().nullable().default(null) }).default({ amountMinor: 0, staffId: null }),
  payments: z.array(salePaymentInput).max(10).default([]),
  allowBalance: z.boolean().default(false),
  notes: z.string().trim().max(500).default(""),
});
export type SaleInput = z.input<typeof saleInput>;

export const refundInput = z.object({
  id: z.string().min(1),
  lines: z.array(z.object({ itemId: z.string(), quantity: z.number().int().min(1).max(99) })).max(60),
  includeTip: z.boolean().default(false),
  methodId: z.string().min(1),
  reason: z.string().trim().min(1, "validation.required").max(200),
  restock: z.boolean().default(true),
});

export const addPaymentInput = z.object({
  id: z.string().min(1),
  payments: z.array(salePaymentInput).min(1).max(5),
});
