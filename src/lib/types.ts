/**
 * Serializable domain DTOs passed from the server to client components.
 * Firestore Timestamps are converted to ISO strings at the data-access layer;
 * money is integer minor units; rates are basis points.
 */

import type { RoleKey } from "./permissions";
import type { OrgSettings, PaymentMethodType } from "./settings";

export type ISODate = string;

export interface WeekdaySchedule {
  working: boolean;
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
}
/** keys "0".."6" (0 = Sunday) */
export type WeeklySchedule = Record<string, WeekdaySchedule>;

export interface BranchHours {
  open: boolean;
  start: string;
  end: string;
}

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  settings: OrgSettings;
  subscription: {
    plan: "trial" | "starter" | "growth" | "enterprise";
    status: "trialing" | "active" | "past_due" | "cancelled";
    trialEndsAt: ISODate | null;
  };
}

export interface BranchDTO {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  address: string;
  timezone: string;
  active: boolean;
  sortOrder: number;
  workingHours: Record<string, BranchHours>;
}

export interface MemberDTO {
  uid: string;
  email: string;
  displayName: string;
  roleId: string;
  roleKey: RoleKey;
  roleName: string;
  permissions: string[];
  allBranches: boolean;
  branchIds: string[];
  staffId: string | null;
  status: "active" | "invited" | "suspended";
  createdAt: ISODate | null;
}

export interface RoleDTO {
  id: string;
  key: RoleKey;
  name: string;
  nameAr: string;
  description: string;
  permissions: string[];
  system: boolean;
  locked: boolean;
  sortOrder: number;
  memberCount?: number;
}

export interface ClientStats {
  visits: number;
  totalSpendMinor: number;
  lastVisitAt: ISODate | null;
  firstVisitAt: ISODate | null;
  nextAppointmentAt: ISODate | null;
  noShows: number;
  cancellations: number;
}

export interface ClientDTO {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string;
  birthday: { month: number; day: number; year?: number } | null;
  gender: "female" | "male" | "other" | "";
  nationality: string;
  source: string;
  tags: string[];
  notes: string;
  preferredStaffId: string | null;
  marketingConsent: boolean;
  status: "active" | "archived";
  stats: ClientStats;
  createdAt: ISODate | null;
}

export interface ClientNoteDTO {
  id: string;
  body: string;
  pinned: boolean;
  authorName: string;
  createdAt: ISODate | null;
}

export interface StaffDTO {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  photoUrl: string | null;
  phone: string;
  email: string;
  position: string;
  branchIds: string[];
  status: "active" | "inactive" | "archived";
  color: string;
  hireDate: string | null;
  bookable: boolean;
  schedule: WeeklySchedule;
  commission: { serviceRateBps: number; productRateBps: number };
  hr: {
    dateOfBirth: string | null;
    nationality: string;
    passportExpiry: string | null;
    visaExpiry: string | null;
  };
  memberUid: string | null;
  sortOrder: number;
  serviceIds: string[];
}

export interface ServiceCategoryDTO {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  sortOrder: number;
  active: boolean;
}

export interface ServiceDTO {
  id: string;
  categoryId: string;
  name: string;
  nameAr: string;
  description: string;
  durationMin: number;
  bufferMin: number;
  priceMinor: number;
  taxRateId: string | null;
  taxExempt: boolean;
  branchIds: string[];
  staffIds: string[];
  onlineBookable: boolean;
  active: boolean;
  sortOrder: number;
}

export const APPOINTMENT_STATUSES = [
  "booked",
  "confirmed",
  "checked_in",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_SOURCES = ["phone", "walk_in", "in_person", "online", "other"] as const;
export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number];

export interface AppointmentItemDTO {
  id: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  startAt: ISODate;
  durationMin: number;
  priceMinor: number;
  discountMinor: number;
}

export interface AppointmentDTO {
  id: string;
  branchId: string;
  dateKey: string;
  startAt: ISODate;
  endAt: ISODate;
  status: AppointmentStatus;
  source: AppointmentSource;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  items: AppointmentItemDTO[];
  staffIds: string[];
  totalMinor: number;
  notes: string;
  cancellation: { reason: string; note: string; at: ISODate | null } | null;
  transactionId: string | null;
  createdAt: ISODate | null;
}

export interface BlockedTimeDTO {
  id: string;
  branchId: string;
  staffId: string;
  dateKey: string;
  startAt: ISODate;
  endAt: ISODate;
  reason: string;
}

export type SaleItemType = "service" | "product" | "package" | "membership" | "gift_card";

export interface SaleItemDTO {
  id: string;
  type: SaleItemType;
  refId: string;
  name: string;
  staffId: string | null;
  staffName: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxRateBps: number;
  taxMinor: number;
  totalMinor: number;
  commissionMinor: number;
}

export interface PaymentDTO {
  id: string;
  methodId: string;
  methodType: PaymentMethodType;
  label: string;
  amountMinor: number;
  reference: string;
  at: ISODate | null;
}

export interface RefundDTO {
  id: string;
  /** Credit note number, e.g. CRD-000001 */
  number: string;
  amountMinor: number;
  tipMinor: number;
  reason: string;
  methodId: string;
  methodLabel: string;
  restocked: boolean;
  lines: { itemId: string; quantity: number; amountMinor: number; taxMinor: number; commissionMinor: number }[];
  at: ISODate | null;
  byName: string;
}

export type TransactionStatus =
  | "paid"
  | "partially_paid"
  | "unpaid"
  | "refunded"
  | "partially_refunded"
  | "void";

export interface TransactionDTO {
  id: string;
  number: string;
  branchId: string;
  dateKey: string;
  status: TransactionStatus;
  clientId: string | null;
  clientName: string;
  appointmentId: string | null;
  items: SaleItemDTO[];
  subtotalMinor: number;
  /** All discounts on the invoice; the two parts below are included in it. */
  discountMinor: number;
  /** Membership discount (0 on invoices saved before it was recorded). */
  memberDiscountMinor: number;
  /** Order-level discount: a code, or a manual percent / fixed amount. */
  orderDiscountMinor: number;
  taxMinor: number;
  totalMinor: number;
  tipMinor: number;
  tipStaffId: string | null;
  paidMinor: number;
  balanceMinor: number;
  refundedMinor: number;
  payments: PaymentDTO[];
  paymentMethods: string[];
  refunds: RefundDTO[];
  staffIds: string[];
  discountCode: string;
  notes: string;
  cashierName: string;
  createdAt: ISODate | null;
}

export interface ExpenseCategoryDTO {
  id: string;
  name: string;
  nameAr: string;
  active: boolean;
  sortOrder: number;
}

export interface ExpenseDTO {
  id: string;
  branchId: string;
  dateKey: string;
  categoryId: string;
  categoryName: string;
  amountMinor: number;
  taxMinor: number;
  vendor: string;
  paymentMethod: string;
  description: string;
  attachment: { name: string; contentType: string; size: number; url: string | null } | null;
  createdByName: string;
  createdAt: ISODate | null;
}

export interface ProductCategoryDTO {
  id: string;
  name: string;
  nameAr: string;
  sortOrder: number;
  active: boolean;
}

export interface ProductDTO {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  nameAr: string;
  brand: string;
  categoryId: string;
  supplierId: string | null;
  costMinor: number;
  priceMinor: number;
  taxRateId: string | null;
  taxExempt: boolean;
  minStock: number;
  trackStock: boolean;
  usage: "retail" | "professional" | "both";
  active: boolean;
  stock: Record<string, number>;
}

export type MovementType =
  | "purchase"
  | "sale"
  | "adjustment"
  | "transfer_in"
  | "transfer_out"
  | "return"
  | "internal_use";

export interface InventoryMovementDTO {
  id: string;
  productId: string;
  productName: string;
  branchId: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  unitCostMinor: number;
  note: string;
  transactionId: string | null;
  createdByName: string;
  createdAt: ISODate | null;
}

export interface SupplierDTO {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  trn: string;
  notes: string;
  active: boolean;
}

export interface PackageDTO {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  kind: "services" | "credit";
  priceMinor: number;
  validityDays: number;
  items: { serviceId: string; serviceName: string; quantity: number }[];
  creditMinor: number;
  active: boolean;
  sortOrder: number;
}

export interface ClientPackageDTO {
  id: string;
  clientId: string;
  clientName: string;
  packageId: string;
  name: string;
  kind: "services" | "credit";
  purchasedAt: ISODate | null;
  expiresAt: ISODate | null;
  items: { serviceId: string; serviceName: string; total: number; used: number }[];
  creditMinor: number;
  creditUsedMinor: number;
  status: "active" | "exhausted" | "expired" | "cancelled";
  redemptions: { at: ISODate | null; label: string; quantity: number; amountMinor: number }[];
}

export interface MembershipPlanDTO {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  priceMinor: number;
  period: "monthly" | "quarterly" | "yearly";
  serviceDiscountBps: number;
  productDiscountBps: number;
  includedServices: { serviceId: string; serviceName: string; quantity: number }[];
  active: boolean;
}

export interface ClientMembershipDTO {
  id: string;
  clientId: string;
  clientName: string;
  planId: string;
  planName: string;
  startAt: ISODate | null;
  endAt: ISODate | null;
  status: "active" | "expired" | "cancelled";
  autoRenew: boolean;
  serviceDiscountBps: number;
  productDiscountBps: number;
}

export interface GiftCardDTO {
  id: string;
  code: string;
  initialMinor: number;
  balanceMinor: number;
  issuedAt: ISODate | null;
  expiresAt: ISODate | null;
  purchaserClientId: string | null;
  purchaserName: string;
  recipientName: string;
  recipientEmail: string;
  message: string;
  status: "active" | "redeemed" | "expired" | "void";
  redemptions: { at: ISODate | null; amountMinor: number; transactionId: string | null }[];
}

export interface DiscountDTO {
  id: string;
  name: string;
  code: string;
  kind: "percent" | "fixed";
  valueBps: number;
  valueMinor: number;
  appliesTo: "all" | "services" | "products";
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
}

export interface CommissionRuleDTO {
  id: string;
  name: string;
  itemType: "service" | "product" | "all";
  staffId: string | null;
  serviceId: string | null;
  rateBps: number;
  priority: number;
  active: boolean;
}

export interface AttendanceDTO {
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  dateKey: string;
  clockInAt: ISODate | null;
  clockOutAt: ISODate | null;
  breaks: { startAt: ISODate | null; endAt: ISODate | null }[];
  workedMinutes: number;
  status: "open" | "closed";
  corrections: { at: string; byName: string; reason: string }[];
}

export interface LeaveDTO {
  id: string;
  staffId: string;
  staffName: string;
  type: "annual" | "sick" | "unpaid" | "other";
  startDate: string;
  endDate: string;
  status: "requested" | "approved" | "rejected";
  note: string;
}

export interface AuditLogDTO {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  branchId: string | null;
  actorName: string;
  at: ISODate | null;
}

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  createdAt: ISODate | null;
  read: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
