import { z } from "zod";

import { isPermission } from "@/lib/permissions";

const text = (max: number) => z.string().trim().max(max, "validation.tooLong");
const required = (max: number) => text(max).min(1, "validation.required");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const optionalEmail = text(120).refine((v) => v === "" || EMAIL_RE.test(v), "validation.email");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.invalid");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "validation.invalid");

export function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ── Settings sections ──────────────────────────────────────────────────

export const businessInput = z.object({
  displayName: required(80),
  legalName: text(120),
  trn: text(30),
  phone: text(30),
  email: optionalEmail,
  website: text(200),
  address: text(300),
});

export const taxRateInput = z.object({
  id: z.string().trim().min(1).max(40),
  name: required(40),
  rateBps: z.number().int().min(0, "validation.nonNegative").max(10_000, "validation.invalid"),
  isDefault: z.boolean(),
});

export const taxInput = z
  .object({
    enabled: z.boolean(),
    pricesIncludeTax: z.boolean(),
    registrationLabel: required(20),
    rates: z.array(taxRateInput).min(1, "validation.atLeastOneItem").max(10),
  })
  .superRefine((v, ctx) => {
    if (v.rates.filter((r) => r.isDefault).length !== 1) {
      ctx.addIssue({ code: "custom", path: ["rates"], message: "settings.errors.oneDefault" });
    }
    if (new Set(v.rates.map((r) => r.id)).size !== v.rates.length) {
      ctx.addIssue({ code: "custom", path: ["rates"], message: "validation.invalid" });
    }
  });

export const BUILT_IN_METHOD_TYPES = ["cash", "card", "bank_transfer", "gift_card", "package"] as const;

export const paymentMethodInput = z.object({
  id: z.string().trim().min(1).max(40),
  label: required(40),
  type: z.enum([...BUILT_IN_METHOD_TYPES, "other"]),
  enabled: z.boolean(),
});

export const paymentsInput = z
  .object({
    methods: z.array(paymentMethodInput).min(1).max(20),
    allowClientDebt: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.methods.some((m) => m.enabled)) {
      ctx.addIssue({ code: "custom", path: ["methods"], message: "settings.errors.oneMethod" });
    }
    if (new Set(v.methods.map((m) => m.id)).size !== v.methods.length) {
      ctx.addIssue({ code: "custom", path: ["methods"], message: "validation.invalid" });
    }
  });

export const SLOT_OPTIONS = [5, 10, 15, 20, 30] as const;

export const appointmentsInput = z
  .object({
    slotMinutes: z.number().refine((n) => (SLOT_OPTIONS as readonly number[]).includes(n), "validation.invalid"),
    defaultDurationMinutes: z.number().int().min(5, "validation.positive").max(480),
    dayStart: time,
    dayEnd: time,
    allowStaffOverlap: z.boolean(),
    cancellationReasons: z.array(required(80)).min(1, "validation.atLeastOneItem").max(30),
  })
  .superRefine((v, ctx) => {
    if (v.dayEnd <= v.dayStart) ctx.addIssue({ code: "custom", path: ["dayEnd"], message: "validation.endAfterStart" });
  });

export const receiptsInput = z.object({
  invoicePrefix: text(12).regex(/^[A-Za-z0-9\-_/#]*$/, "validation.invalid"),
  header: text(300),
  footer: text(300),
  showStaffOnReceipt: z.boolean(),
  showTaxBreakdown: z.boolean(),
});

export const notificationsInput = z.object({
  lowStockAlerts: z.boolean(),
  documentExpiryAlerts: z.boolean(),
});

export const appearanceInput = z.object({
  accentColor: hex,
  calendarDensity: z.enum(["comfortable", "compact"]),
});

export const localeInput = z.object({
  defaultLocale: z.enum(["en", "ar"]),
});

export const updateSettingsInput = z.discriminatedUnion("section", [
  z.object({ section: z.literal("business"), values: businessInput }),
  z.object({ section: z.literal("tax"), values: taxInput }),
  z.object({ section: z.literal("payments"), values: paymentsInput }),
  z.object({ section: z.literal("appointments"), values: appointmentsInput }),
  z.object({ section: z.literal("receipts"), values: receiptsInput }),
  z.object({ section: z.literal("notifications"), values: notificationsInput }),
  z.object({ section: z.literal("appearance"), values: appearanceInput }),
  z.object({ section: z.literal("locale"), values: localeInput }),
]);
export type UpdateSettingsInput = z.input<typeof updateSettingsInput>;
export type SettingsSectionKey = UpdateSettingsInput["section"];
type SectionValuesMap = { [U in UpdateSettingsInput as U["section"]]: U["values"] };
export type SectionValues<S extends SettingsSectionKey> = SectionValuesMap[S];

// ── Branches ───────────────────────────────────────────────────────────

export const WEEKDAYS = ["0", "1", "2", "3", "4", "5", "6"] as const;

const dayHours = z
  .object({ open: z.boolean(), start: time, end: time })
  .refine((d) => !d.open || d.end > d.start, { message: "validation.endAfterStart", path: ["end"] });

export const branchInput = z.object({
  id: z.string().optional(),
  name: required(60),
  code: text(8).transform((v) => v.toUpperCase()),
  phone: text(30),
  email: optionalEmail,
  address: text(300),
  timezone: z.string().refine(isTimeZone, "settings.errors.invalidTimezone"),
  workingHours: z.object(Object.fromEntries(WEEKDAYS.map((d) => [d, dayHours])) as Record<(typeof WEEKDAYS)[number], typeof dayHours>),
});
export type BranchInput = z.input<typeof branchInput>;

export const reorderInput = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) });
export const idInput = z.object({ id: z.string().min(1).max(128) });

// ── Members ────────────────────────────────────────────────────────────

const memberAccess = {
  displayName: required(80),
  roleId: z.string().min(1, "validation.required").max(128),
  allBranches: z.boolean(),
  branchIds: z.array(z.string().min(1)).max(100),
  staffId: z.string().min(1).max(128).nullable(),
};

export const inviteMemberInput = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, "validation.tooLong")
    .refine((v) => EMAIL_RE.test(v), "validation.email"),
  ...memberAccess,
});
export type InviteMemberInput = z.input<typeof inviteMemberInput>;

export const updateMemberInput = z.object({ uid: z.string().min(1).max(128), ...memberAccess });
export type UpdateMemberInput = z.input<typeof updateMemberInput>;

export const memberStatusInput = z.object({
  uid: z.string().min(1).max(128),
  status: z.enum(["active", "suspended"]),
});
export const uidInput = z.object({ uid: z.string().min(1).max(128) });

// ── Roles ──────────────────────────────────────────────────────────────

export const createRoleInput = z.object({
  name: required(40),
  nameAr: text(40),
  cloneFromId: z.string().min(1).max(128),
});

export const saveRoleInput = z.object({
  id: z.string().min(1).max(128),
  name: required(40),
  nameAr: text(40),
  description: text(200),
  permissions: z.array(z.string().refine(isPermission, "validation.invalid")).max(100),
});
export type SaveRoleInput = z.input<typeof saveRoleInput>;

// ── Audit log ──────────────────────────────────────────────────────────

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
