import type { Permission } from "@/lib/permissions";
import type { PaymentMethodType } from "@/lib/settings";
import type { AppointmentSource, AppointmentStatus, SaleItemDTO, TransactionDTO } from "@/lib/types";

/**
 * Report centre types. Everything here is serialisable: the server loads and
 * aggregates (pure functions in ./aggregate), the client only renders.
 *
 * Attribution rules used by every report:
 * - Invoices count on their invoice date (`dateKey`); void invoices are ignored.
 * - Credit notes (refunds) count on the date they were issued, even when the
 *   invoice is older (the same way a credit note reduces output VAT in the
 *   period it is issued). Older invoices are found with a look-back window.
 * - "Revenue" on line-level reports (services, staff, products) is excluding
 *   VAT and after discounts; the Revenue report also shows the VAT-inclusive
 *   figures that match the Sales page.
 */

export const REPORT_IDS = [
  "revenue",
  "services",
  "products",
  "packages",
  "payments",
  "staff",
  "commissions",
  "clients",
  "appointments",
  "expenses",
  "vat",
] as const;
export type ReportId = (typeof REPORT_IDS)[number];

export const REPORT_GROUPS: { key: "sales" | "team" | "clients" | "finance"; reports: ReportId[] }[] = [
  { key: "sales", reports: ["revenue", "services", "products", "packages", "payments"] },
  { key: "team", reports: ["staff", "commissions"] },
  { key: "clients", reports: ["clients", "appointments"] },
  { key: "finance", reports: ["expenses", "vat"] },
];

/** Extra permission a report needs on top of `view_reports`. */
export const REPORT_PERMISSION: Partial<Record<ReportId, Permission>> = {
  commissions: "view_commissions",
  expenses: "view_expenses",
};

export function isReportId(v: string | undefined | null): v is ReportId {
  return !!v && (REPORT_IDS as readonly string[]).includes(v);
}

// ── Inputs ────────────────────────────────────────────────────────────

/** Invoice line plus whether it redeemed a prepaid package session. */
export interface ReportItem extends SaleItemDTO {
  redeemed: boolean;
}

export interface ReportTransaction extends Omit<TransactionDTO, "items"> {
  items: ReportItem[];
}

/** Read caps hit while loading (shown as a notice in the UI). */
export interface ReportMeta {
  capped: boolean;
  /** Days before the range searched for invoices refunded inside the range. */
  lookbackDays: number;
  /** Appointments limited to the member's own (no view_all_appointments). */
  ownAppointmentsOnly?: boolean;
}

// ── Outputs ───────────────────────────────────────────────────────────

export interface RevenueTotals {
  invoices: number;
  grossMinor: number;
  discountMinor: number;
  refundsMinor: number;
  netMinor: number;
  vatMinor: number;
  netExVatMinor: number;
  tipsMinor: number;
}
export interface RevenueDay extends RevenueTotals {
  dateKey: string;
}
export interface RevenueReport {
  days: RevenueDay[];
  totals: RevenueTotals;
  previous: RevenueTotals;
  previousRange: { from: string; to: string };
}

export interface ServiceRow {
  serviceId: string;
  name: string;
  nameAr: string;
  categoryId: string;
  count: number;
  refundedCount: number;
  redeemedCount: number;
  revenueMinor: number;
  refundsMinor: number;
  avgPriceMinor: number;
}
export interface CategoryRow {
  categoryId: string;
  name: string;
  nameAr: string;
  count: number;
  revenueMinor: number;
  share: number;
}
export interface ServicesReport {
  rows: ServiceRow[];
  categories: CategoryRow[];
  totals: { count: number; revenueMinor: number; refundsMinor: number; redeemedCount: number };
}

export interface StaffRow {
  staffId: string;
  name: string;
  services: number;
  serviceRevenueMinor: number;
  productRevenueMinor: number;
  revenueMinor: number;
  /** null when the member may not see commissions. */
  commissionMinor: number | null;
  commissionReversedMinor: number | null;
  tipsMinor: number;
  appointments: number;
  completed: number;
  noShows: number;
}
export interface StaffReport {
  rows: StaffRow[];
  showCommission: boolean;
}

export interface CommissionLine {
  id: string;
  kind: "sale" | "reversal";
  dateKey: string;
  txId: string;
  invoiceNumber: string;
  creditNumber: string;
  staffId: string;
  staffName: string;
  itemName: string;
  itemType: SaleItemDTO["type"];
  quantity: number;
  /** Line value excluding VAT the commission was earned on (negative for reversals). */
  baseMinor: number;
  commissionMinor: number;
}
export interface CommissionStaffRow {
  staffId: string;
  name: string;
  lines: number;
  baseMinor: number;
  earnedMinor: number;
  reversedMinor: number;
  netMinor: number;
}
export interface CommissionsReport {
  lines: CommissionLine[];
  staff: CommissionStaffRow[];
}

export interface ClientRow {
  clientId: string;
  name: string;
  invoices: number;
  visits: number;
  spendMinor: number;
  avgTicketMinor: number;
  firstVisitKey: string | null;
  lastVisitKey: string | null;
  isNew: boolean;
}
export interface ClientsReport {
  rows: ClientRow[];
  summary: {
    served: number;
    newCount: number;
    returningCount: number;
    spendMinor: number;
    walkInInvoices: number;
    walkInSpendMinor: number;
  };
}

export interface AppointmentRow {
  id: string;
  branchId: string;
  dateKey: string;
  startAt: string;
  clientName: string;
  services: string;
  staff: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  reason: string;
  valueMinor: number;
}
export interface AppointmentsReport {
  rows: AppointmentRow[];
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  reasons: { reason: string; count: number }[];
  sources: { source: AppointmentSource; count: number; valueMinor: number }[];
  /** 7 rows ordered from the business's first weekday; counts per hour in `hours`. */
  heat: { weekday: number; counts: number[] }[];
  hours: number[];
  noShowRate: number | null;
  cancelRate: number | null;
  completionRate: number | null;
}

export interface ExpenseCategoryRow {
  categoryId: string;
  name: string;
  nameAr: string;
  count: number;
  amountMinor: number;
  taxMinor: number;
  netMinor: number;
  share: number;
}
export interface ProfitReport {
  categories: ExpenseCategoryRow[];
  revenueExVatMinor: number;
  cogsMinor: number;
  grossProfitMinor: number;
  expensesMinor: number;
  expensesExVatMinor: number;
  expenseVatMinor: number;
  profitMinor: number;
  margin: number | null;
  /** Product units sold whose product has no cost price (COGS understated). */
  unitsWithoutCost: number;
}

export type StockState = "in_stock" | "low" | "out" | "untracked";
export interface ProductReportRow {
  productId: string;
  name: string;
  nameAr: string;
  sku: string;
  units: number;
  refundedUnits: number;
  revenueMinor: number;
  cogsMinor: number;
  marginMinor: number;
  stock: number;
  minStock: number;
  status: StockState;
}
export interface ProductsReport {
  rows: ProductReportRow[];
  totals: { units: number; revenueMinor: number; cogsMinor: number; low: number; out: number };
}

export type PrepaidType = "package" | "membership" | "gift_card";
export interface PrepaidRow {
  key: string;
  type: PrepaidType;
  refId: string;
  name: string;
  nameAr: string;
  count: number;
  valueMinor: number;
  refundedMinor: number;
}
export interface PrepaidReport {
  rows: PrepaidRow[];
  byType: { type: PrepaidType; count: number; valueMinor: number }[];
  redemptions: { giftCardMinor: number; packageCreditMinor: number; packageSessions: number };
  liability: {
    giftCardMinor: number;
    giftCards: number;
    packageCreditMinor: number;
    packageSessions: number;
    capped: boolean;
  };
}

export interface PaymentMethodRow {
  methodId: string;
  label: string;
  type: PaymentMethodType;
  count: number;
  collectedMinor: number;
  refundedMinor: number;
  netMinor: number;
  share: number;
}
export interface PaymentsReport {
  rows: PaymentMethodRow[];
  totals: { collectedMinor: number; refundedMinor: number; netMinor: number };
}

export interface VatRow {
  key: string;
  kind: "output" | "credit" | "input";
  rateBps: number | null;
  taxableMinor: number;
  vatMinor: number;
}
export interface VatReport {
  rows: VatRow[];
  outputMinor: number;
  creditMinor: number;
  inputMinor: number;
  netMinor: number;
}

export type ReportPayload =
  | { id: "revenue"; data: RevenueReport }
  | { id: "services"; data: ServicesReport }
  | { id: "products"; data: ProductsReport }
  | { id: "packages"; data: PrepaidReport }
  | { id: "payments"; data: PaymentsReport }
  | { id: "staff"; data: StaffReport }
  | { id: "commissions"; data: CommissionsReport }
  | { id: "clients"; data: ClientsReport }
  | { id: "appointments"; data: AppointmentsReport }
  | { id: "expenses"; data: ProfitReport }
  | { id: "vat"; data: VatReport };

export type LoadedReport = ReportPayload & { meta: ReportMeta };
