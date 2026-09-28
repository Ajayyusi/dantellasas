import "server-only";

import { Timestamp, type DocumentData, type Firestore } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";

/** Org-scoped collection names. Everything tenant-owned lives under an org. */
export const ORG_COLLECTIONS = [
  "members",
  "roles",
  "branches",
  "clients",
  "staff",
  "serviceCategories",
  "services",
  "appointments",
  "blockedTimes",
  "transactions",
  "counters",
  "expenses",
  "expenseCategories",
  "productCategories",
  "products",
  "inventoryMovements",
  "suppliers",
  "packages",
  "clientPackages",
  "membershipPlans",
  "clientMemberships",
  "giftCards",
  "discounts",
  "commissionRules",
  "attendance",
  "leave",
  "notifications",
  "auditLogs",
] as const;
export type OrgCollection = (typeof ORG_COLLECTIONS)[number];

export function db(): Firestore {
  return getAdminDb();
}

export function orgRef(orgId: string) {
  return getAdminDb().collection("organizations").doc(orgId);
}

export function orgCol(orgId: string, name: OrgCollection) {
  return orgRef(orgId).collection(name);
}

export function orgDoc(orgId: string, name: OrgCollection, id: string) {
  return orgRef(orgId).collection(name).doc(id);
}

export function userRef(uid: string) {
  return getAdminDb().collection("users").doc(uid);
}

// ── Serialisation ──────────────────────────────────────────────────────

export function iso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export function isoRequired(value: unknown): string {
  return iso(value) ?? new Date(0).toISOString();
}

export function ts(value: Date | string | number): Timestamp {
  return Timestamp.fromDate(value instanceof Date ? value : new Date(value));
}

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
export function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
export function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}
export function arr<T = string>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
export function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export type Data = DocumentData;

/** Firestore `in` queries accept at most 30 values. */
export function chunk<T>(list: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
