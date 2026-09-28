import type { MembershipPlanDTO } from "@/lib/types";

export type MembershipPeriod = MembershipPlanDTO["period"];

export const PERIOD_MONTHS: Record<MembershipPeriod, number> = { monthly: 1, quarterly: 3, yearly: 12 };

/** Adds calendar months, clamping to the last day of the target month (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

export function addPeriod(date: Date, period: MembershipPeriod): Date {
  return addMonths(date, PERIOD_MONTHS[period]);
}

/** Face value of a package: the credit, or the sum of its sessions at list price. */
export function packageValueMinor(
  pkg: { kind: "services" | "credit"; creditMinor: number; items: { serviceId: string; quantity: number }[] },
  priceOf: (serviceId: string) => number | undefined,
): number {
  if (pkg.kind === "credit") return pkg.creditMinor;
  return pkg.items.reduce((sum, i) => sum + (priceOf(i.serviceId) ?? 0) * i.quantity, 0);
}

/** Saving as a ratio (0.1 = 10%), or null when there is none. */
export function savingRatio(valueMinor: number, priceMinor: number): number | null {
  if (valueMinor <= 0 || priceMinor >= valueMinor) return null;
  return (valueMinor - priceMinor) / valueMinor;
}
