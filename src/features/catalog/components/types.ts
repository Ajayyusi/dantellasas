/** Slim service shape passed to catalog client components. */
export interface CatalogService {
  id: string;
  name: string;
  nameAr: string;
  priceMinor: number;
  active: boolean;
}

/** Slim staff shape for commission rules. */
export interface CatalogStaff {
  id: string;
  displayName: string;
  color: string;
  photoUrl: string | null;
  status: "active" | "inactive" | "archived";
  commission: { serviceRateBps: number; productRateBps: number };
}

export type ServiceLine = { serviceId: string; serviceName: string; quantity: number };

export const CATALOG_TABS = ["packages", "memberships", "gift-cards", "discounts", "commissions"] as const;
export type CatalogTab = (typeof CATALOG_TABS)[number];
