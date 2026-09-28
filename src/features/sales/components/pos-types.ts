import type {
  ClientMembershipDTO,
  ClientPackageDTO,
  MembershipPlanDTO,
  PackageDTO,
  SaleItemType,
  ServiceCategoryDTO,
  ServiceDTO,
} from "@/lib/types";

export interface PosProduct {
  id: string;
  name: string;
  brand: string;
  priceMinor: number;
  taxRateId: string | null;
  taxExempt: boolean;
  categoryId: string;
  stock: number;
  trackStock: boolean;
  barcode: string;
  sku: string;
}

export interface PosStaff {
  id: string;
  displayName: string;
  color: string;
  photoUrl: string | null;
}

export interface PosCatalog {
  services: ServiceDTO[];
  categories: ServiceCategoryDTO[];
  products: PosProduct[];
  packages: PackageDTO[];
  plans: MembershipPlanDTO[];
  staff: PosStaff[];
}

export interface PosLine {
  key: string;
  type: SaleItemType;
  refId: string;
  name: string;
  detail: string;
  staffId: string | null;
  quantity: number;
  unitPriceMinor: number;
  catalogPriceMinor: number | null;
  discountMinor: number;
  taxRateBps: number;
  redeemClientPackageId: string | null;
  appointmentLineId: string | null;
  giftCard: { recipientName: string; recipientEmail: string; message: string } | null;
}

export interface PosWallet {
  packages: ClientPackageDTO[];
  membership: ClientMembershipDTO | null;
}

export interface Tender {
  key: string;
  methodId: string;
  amountMinor: number;
  reference: string;
  giftCardCode: string;
  giftCardBalance: number | null;
  clientPackageId: string | null;
}

export type DiscountState =
  | { kind: "none" }
  | { kind: "percent"; valueBps: number }
  | { kind: "fixed"; valueMinor: number }
  | { kind: "code"; code: string; name: string; discountKind: "percent" | "fixed"; valueBps: number; valueMinor: number; appliesTo: "all" | "services" | "products" };
