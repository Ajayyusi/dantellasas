import { DEFAULT_TIMEZONE } from "./dates";

/**
 * Organization settings object. Stored on `organizations/{orgId}.settings`;
 * everything is optional in Firestore and resolved against these defaults, so
 * adding a setting never needs a migration.
 */

export type Locale = "en" | "ar";

export interface TaxRate {
  id: string;
  name: string;
  rateBps: number;
  isDefault: boolean;
}

export type PaymentMethodType =
  | "cash"
  | "card"
  | "bank_transfer"
  | "gift_card"
  | "package"
  | "other";

export interface PaymentMethod {
  id: string;
  label: string;
  type: PaymentMethodType;
  enabled: boolean;
}

export interface OrgSettings {
  business: {
    displayName: string;
    legalName: string;
    phone: string;
    email: string;
    website: string;
    address: string;
    trn: string;
    logoPath: string;
    logoUrl: string;
  };
  locale: {
    defaultLocale: Locale;
    currency: string;
    timezone: string;
    /** 0 = Sunday, 1 = Monday, 6 = Saturday */
    weekStartsOn: number;
    phoneCountryCode: string;
  };
  tax: {
    enabled: boolean;
    pricesIncludeTax: boolean;
    registrationLabel: string;
    rates: TaxRate[];
  };
  payments: {
    methods: PaymentMethod[];
    allowClientDebt: boolean;
  };
  appointments: {
    slotMinutes: number;
    defaultDurationMinutes: number;
    allowStaffOverlap: boolean;
    dayStart: string;
    dayEnd: string;
    cancellationReasons: string[];
  };
  receipts: {
    invoicePrefix: string;
    header: string;
    footer: string;
    showStaffOnReceipt: boolean;
    showTaxBreakdown: boolean;
  };
  notifications: {
    lowStockAlerts: boolean;
    documentExpiryAlerts: boolean;
  };
  appearance: {
    /** hex colour for the tenant accent */
    accentColor: string;
    calendarDensity: "comfortable" | "compact";
  };
  clients: {
    askGender: boolean;
    sources: string[];
  };
}

export const DEFAULT_SETTINGS: OrgSettings = {
  business: {
    displayName: "",
    legalName: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    trn: "",
    logoPath: "",
    logoUrl: "",
  },
  locale: {
    defaultLocale: "en",
    currency: "AED",
    timezone: DEFAULT_TIMEZONE,
    weekStartsOn: 1,
    phoneCountryCode: "971",
  },
  tax: {
    enabled: true,
    pricesIncludeTax: true,
    registrationLabel: "TRN",
    rates: [{ id: "vat5", name: "VAT", rateBps: 500, isDefault: true }],
  },
  payments: {
    methods: [
      { id: "cash", label: "Cash", type: "cash", enabled: true },
      { id: "card", label: "Card", type: "card", enabled: true },
      { id: "bank_transfer", label: "Bank transfer", type: "bank_transfer", enabled: true },
      { id: "gift_card", label: "Gift card", type: "gift_card", enabled: true },
      { id: "package", label: "Package credit", type: "package", enabled: true },
    ],
    allowClientDebt: false,
  },
  appointments: {
    slotMinutes: 15,
    defaultDurationMinutes: 60,
    allowStaffOverlap: false,
    dayStart: "09:00",
    dayEnd: "22:00",
    cancellationReasons: [
      "Client request",
      "Client unwell",
      "Staff unavailable",
      "Rescheduled",
      "Booked by mistake",
    ],
  },
  receipts: {
    invoicePrefix: "INV-",
    header: "",
    footer: "Thank you for visiting us.",
    showStaffOnReceipt: true,
    showTaxBreakdown: true,
  },
  notifications: {
    lowStockAlerts: true,
    documentExpiryAlerts: true,
  },
  appearance: {
    accentColor: "#a8406a",
    calendarDensity: "comfortable",
  },
  clients: {
    askGender: true,
    sources: ["Walk-in", "Instagram", "Facebook", "Google", "Referral", "Returning", "Other"],
  },
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function merge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined || override === null ? base : override) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v === undefined) continue;
    out[k] = k in base ? merge((base as Record<string, unknown>)[k], v) : v;
  }
  return out as T;
}

/** Accents that were the product default in earlier versions; they now follow the current default. */
const PREVIOUS_DEFAULT_ACCENTS = new Set(["#965660", "#8b3a62"]);

export function resolveSettings(raw: unknown): OrgSettings {
  const settings = merge(DEFAULT_SETTINGS, raw);
  if (PREVIOUS_DEFAULT_ACCENTS.has(settings.appearance.accentColor.toLowerCase())) {
    return { ...settings, appearance: { ...settings.appearance, accentColor: DEFAULT_SETTINGS.appearance.accentColor } };
  }
  return settings;
}

export function defaultTaxRate(settings: OrgSettings): TaxRate | undefined {
  if (!settings.tax.enabled) return undefined;
  return settings.tax.rates.find((r) => r.isDefault) ?? settings.tax.rates[0];
}

/** Effective tax rate (bps) for an item with an optional explicit rate id. */
export function taxRateFor(
  settings: OrgSettings,
  item: { taxRateId?: string | null; taxExempt?: boolean },
): number {
  if (!settings.tax.enabled || item.taxExempt) return 0;
  if (item.taxRateId) {
    const r = settings.tax.rates.find((x) => x.id === item.taxRateId);
    if (r) return r.rateBps;
  }
  return defaultTaxRate(settings)?.rateBps ?? 0;
}
