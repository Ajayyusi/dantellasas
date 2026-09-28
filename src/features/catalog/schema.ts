import { z } from "zod";

const name = z.string().trim().min(1, "validation.required").max(80, "validation.tooLong");
const nameAr = z.string().trim().max(80, "validation.tooLong").default("");
const description = z.string().trim().max(500, "validation.tooLong").default("");
const money = z.number().int().min(0, "validation.nonNegative").max(100_000_000);
const bps = z.number().int().min(0, "validation.nonNegative").max(10000, "validation.invalid");
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "validation.invalid")
  .nullable()
  .default(null);

export const serviceItem = z.object({
  serviceId: z.string().min(1),
  serviceName: z.string().trim().max(120).default(""),
  quantity: z.number().int().min(1, "validation.positive").max(999),
});
export type ServiceItemInput = z.input<typeof serviceItem>;

export const packageInput = z
  .object({
    id: z.string().optional(),
    name,
    nameAr,
    description,
    kind: z.enum(["services", "credit"]),
    priceMinor: money,
    validityDays: z.number().int().min(0, "validation.nonNegative").max(3650),
    items: z.array(serviceItem).max(30).default([]),
    creditMinor: money.default(0),
    active: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "services" && v.items.length === 0) {
      ctx.addIssue({ code: "custom", path: ["items"], message: "validation.atLeastOneItem" });
    }
    if (v.kind === "credit" && v.creditMinor <= 0) {
      ctx.addIssue({ code: "custom", path: ["creditMinor"], message: "validation.positive" });
    }
  });
export type PackageInput = z.input<typeof packageInput>;

export const MEMBERSHIP_PERIODS = ["monthly", "quarterly", "yearly"] as const;

export const planInput = z.object({
  id: z.string().optional(),
  name,
  nameAr,
  description,
  priceMinor: money,
  period: z.enum(MEMBERSHIP_PERIODS),
  serviceDiscountBps: bps.default(0),
  productDiscountBps: bps.default(0),
  includedServices: z.array(serviceItem).max(30).default([]),
  active: z.boolean().default(true),
});
export type PlanInput = z.input<typeof planInput>;

export const issueGiftCardInput = z.object({
  amountMinor: z.number().int().min(1, "validation.positive").max(100_000_000),
  expiresOn: dateKey,
  purchaserClientId: z.string().nullable().default(null),
  purchaserName: z.string().trim().max(120, "validation.tooLong").default(""),
  recipientName: z.string().trim().max(120, "validation.tooLong").default(""),
  recipientEmail: z.union([z.literal(""), z.email("validation.email").max(200)]).default(""),
  message: z.string().trim().max(500, "validation.tooLong").default(""),
});
export type IssueGiftCardInput = z.input<typeof issueGiftCardInput>;

export const voidGiftCardInput = z.object({
  id: z.string().min(1),
  /** Required when the card has already been (partly) redeemed. */
  force: z.boolean().default(false),
});

export const discountInput = z
  .object({
    id: z.string().optional(),
    name,
    code: z
      .string()
      .trim()
      .toUpperCase()
      .max(30, "validation.tooLong")
      .regex(/^[A-Z0-9_-]*$/, "catalog.discounts.codeInvalid")
      .default(""),
    kind: z.enum(["percent", "fixed"]),
    valueBps: bps.default(0),
    valueMinor: money.default(0),
    appliesTo: z.enum(["all", "services", "products"]).default("all"),
    startsAt: dateKey,
    endsAt: dateKey,
    maxUses: z.number().int().min(1, "validation.positive").max(1_000_000).nullable().default(null),
    active: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "percent" && (v.valueBps <= 0 || v.valueBps > 10000)) {
      ctx.addIssue({ code: "custom", path: ["valueBps"], message: "validation.positive" });
    }
    if (v.kind === "fixed" && v.valueMinor <= 0) {
      ctx.addIssue({ code: "custom", path: ["valueMinor"], message: "validation.positive" });
    }
    if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "validation.endAfterStart" });
    }
  });
export type DiscountInput = z.input<typeof discountInput>;

export const commissionRuleInput = z.object({
  id: z.string().optional(),
  name,
  itemType: z.enum(["service", "product", "all"]),
  staffId: z.string().nullable().default(null),
  serviceId: z.string().nullable().default(null),
  rateBps: bps,
  priority: z.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
});
export type CommissionRuleInput = z.input<typeof commissionRuleInput>;

export const idInput = z.object({ id: z.string().min(1) });
export const activeInput = z.object({ id: z.string().min(1), active: z.boolean() });
