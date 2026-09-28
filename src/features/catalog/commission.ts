import type { CommissionRuleDTO } from "@/lib/types";

/**
 * Commission rate resolution (pure; used by checkout on the server and by the
 * catalog UI to explain precedence).
 *
 * Most specific wins:
 *   1. rule for this staff member AND this service
 *   2. rule for this service (any staff)
 *   3. rule for this staff member (any item of the type)
 *   4. the staff member's own default rate (staff record), when set (> 0)
 *   5. business-wide rule for the item type (no staff, no service)
 *   6. otherwise 0
 *
 * Within one level the higher `priority` wins; on a tie a rule for the exact
 * item type beats an "all items" rule, then the lower id (stable).
 * Service-specific rules never apply to products.
 */

export type CommissionItemType = "service" | "product";

export interface ResolveCommissionArgs {
  itemType: CommissionItemType;
  staffId: string | null;
  serviceId: string | null;
  rules: CommissionRuleDTO[];
  staffDefaults: { serviceRateBps: number; productRateBps: number } | null;
}

export interface ResolvedCommission {
  rateBps: number;
  ruleId: string | null;
}

/** 3 = staff + service, 2 = service, 1 = staff, 0 = business-wide. */
export function ruleSpecificity(rule: Pick<CommissionRuleDTO, "staffId" | "serviceId">): 0 | 1 | 2 | 3 {
  if (rule.staffId && rule.serviceId) return 3;
  if (rule.serviceId) return 2;
  if (rule.staffId) return 1;
  return 0;
}

function matches(rule: CommissionRuleDTO, args: ResolveCommissionArgs): boolean {
  if (!rule.active) return false;
  if (rule.itemType !== "all" && rule.itemType !== args.itemType) return false;
  if (rule.staffId && rule.staffId !== args.staffId) return false;
  if (rule.serviceId) {
    if (args.itemType !== "service") return false;
    if (rule.serviceId !== args.serviceId) return false;
  }
  return true;
}

function better(a: CommissionRuleDTO, b: CommissionRuleDTO, itemType: CommissionItemType): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  const aExact = a.itemType === itemType ? 1 : 0;
  const bExact = b.itemType === itemType ? 1 : 0;
  if (aExact !== bExact) return bExact - aExact;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function clampBps(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(10000, Math.max(0, Math.round(n)));
}

export function resolveCommissionRate(args: ResolveCommissionArgs): ResolvedCommission {
  const candidates = args.rules.filter((r) => matches(r, args));
  const pick = (level: number) =>
    candidates.filter((r) => ruleSpecificity(r) === level).sort((a, b) => better(a, b, args.itemType))[0];

  for (const level of [3, 2, 1]) {
    const rule = pick(level);
    if (rule) return { rateBps: clampBps(rule.rateBps), ruleId: rule.id };
  }

  const staffDefault = args.staffDefaults
    ? args.itemType === "service"
      ? args.staffDefaults.serviceRateBps
      : args.staffDefaults.productRateBps
    : 0;
  if (staffDefault > 0) return { rateBps: clampBps(staffDefault), ruleId: null };

  const general = pick(0);
  if (general) return { rateBps: clampBps(general.rateBps), ruleId: general.id };

  return { rateBps: 0, ruleId: null };
}

/** Commission amount for a line, in minor units (rounded half up). */
export function commissionAmount(netMinor: number, rateBps: number): number {
  return Math.round((Math.max(0, netMinor) * clampBps(rateBps)) / 10000);
}
