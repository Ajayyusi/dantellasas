import "server-only";

import type { Timestamp } from "firebase-admin/firestore";
import { cache } from "react";

import { orgCol } from "@/lib/db";
import type {
  ClientMembershipDTO,
  CommissionRuleDTO,
  DiscountDTO,
  GiftCardDTO,
  MembershipPlanDTO,
  PackageDTO,
} from "@/lib/types";

import { toClientMembership, toCommissionRule, toDiscount, toGiftCard, toMembershipPlan, toPackage } from "./mappers";

/** Gift cards shown in the catalog list (newest first). */
export const GIFT_CARD_LIMIT = 1000;
/** Members listed per plan in the members sheet. */
export const PLAN_MEMBERS_LIMIT = 500;

export const listPackages = cache(async (orgId: string): Promise<PackageDTO[]> => {
  const snap = await orgCol(orgId, "packages").get();
  return snap.docs
    .map((d) => toPackage(d.id, d.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
});

/** Number of client packages sold per package definition (count aggregations). */
export async function packageSoldCounts(orgId: string, packageIds: string[]): Promise<Record<string, number>> {
  const col = orgCol(orgId, "clientPackages");
  const entries = await Promise.all(
    packageIds.map(async (id) => [id, (await col.where("packageId", "==", id).count().get()).data().count] as const),
  );
  return Object.fromEntries(entries);
}

export const listMembershipPlans = cache(async (orgId: string): Promise<MembershipPlanDTO[]> => {
  const snap = await orgCol(orgId, "membershipPlans").get();
  return snap.docs
    .map((d) => toMembershipPlan(d.id, d.data()))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.priceMinor - b.priceMinor || a.name.localeCompare(b.name));
});

/**
 * Active members per plan: stored status "active" and not past `endAt` (the
 * status may lag behind the date). Two equality filters — served by
 * single-field indexes; only `endAt` is read back.
 */
export async function planActiveMemberCounts(orgId: string, planIds: string[]): Promise<Record<string, number>> {
  const col = orgCol(orgId, "clientMemberships");
  const now = Date.now();
  const entries = await Promise.all(
    planIds.map(async (id) => {
      const snap = await col.where("planId", "==", id).where("status", "==", "active").select("endAt").get();
      const live = snap.docs.filter((d) => {
        const end = d.get("endAt") as Timestamp | null | undefined;
        return !end || typeof end.toMillis !== "function" || end.toMillis() >= now;
      });
      return [id, live.length] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function listPlanMembers(orgId: string, planId: string): Promise<ClientMembershipDTO[]> {
  const snap = await orgCol(orgId, "clientMemberships").where("planId", "==", planId).limit(PLAN_MEMBERS_LIMIT).get();
  const rank = { active: 0, expired: 1, cancelled: 2 } as const;
  return snap.docs
    .map((d) => toClientMembership(d.id, d.data()))
    .sort((a, b) => rank[a.status] - rank[b.status] || (b.startAt ?? "").localeCompare(a.startAt ?? ""));
}

export const listGiftCards = cache(async (orgId: string): Promise<GiftCardDTO[]> => {
  const snap = await orgCol(orgId, "giftCards").orderBy("issuedAt", "desc").limit(GIFT_CARD_LIMIT).get();
  return snap.docs.map((d) => toGiftCard(d.id, d.data()));
});

export const listDiscounts = cache(async (orgId: string): Promise<DiscountDTO[]> => {
  const snap = await orgCol(orgId, "discounts").get();
  return snap.docs
    .map((d) => toDiscount(d.id, d.data()))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
});

export const listCommissionRules = cache(async (orgId: string): Promise<CommissionRuleDTO[]> => {
  const snap = await orgCol(orgId, "commissionRules").get();
  return snap.docs
    .map((d) => toCommissionRule(d.id, d.data()))
    .sort((a, b) => Number(b.active) - Number(a.active) || b.priority - a.priority || a.name.localeCompare(b.name));
});
