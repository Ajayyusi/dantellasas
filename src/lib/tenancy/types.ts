/**
 * Tenancy primitives: Organization → Branch, with per-org Membership.
 *
 * These are platform infrastructure only. Salon-domain entities (clients,
 * appointments, services, staff schedules, sales, etc.) are intentionally NOT
 * modelled yet — see docs/product-research.md (NOT YET VERIFIED).
 */

export type Timestamp = { seconds: number; nanoseconds: number } | Date;

export const ORG_ROLES = ["owner", "admin", "manager", "staff"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export type MembershipStatus = "active" | "invited" | "suspended";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerUid: string;
  /** IANA timezone, e.g. "Asia/Dubai" */
  defaultTimezone: string;
  /** ISO 4217, e.g. "AED" */
  defaultCurrency: string;
  defaultLocale: "ar" | "en";
  status: "active" | "suspended";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Branch {
  id: string;
  orgId: string;
  name: string;
  timezone: string;
  /** Free-form for now; structure pending research. */
  address?: string;
  phone?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** organizations/{orgId}/members/{uid} — the source of truth for access. */
export interface Membership {
  uid: string;
  orgId: string;
  role: OrgRole;
  /**
   * Branch scope. Empty array = access to ALL branches in the org.
   * Owners/admins are always org-wide regardless of this value.
   */
  branchIds: string[];
  status: MembershipStatus;
  displayName?: string;
  email?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * users/{uid}/orgs/{orgId} — denormalized index so a user can list their
 * orgs without a collection-group query. Written only by the server.
 */
export interface UserOrgRef {
  orgId: string;
  orgName: string;
  role: OrgRole;
  createdAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  lastActiveOrgId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
