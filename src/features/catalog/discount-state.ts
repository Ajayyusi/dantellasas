import type { DiscountDTO } from "@/lib/types";

export type DiscountState = "live" | "inactive" | "scheduled" | "ended" | "limit";

/** Where a discount stands on `todayKey` (YYYY-MM-DD in the business time zone). */
export function discountState(d: DiscountDTO, todayKey: string): DiscountState {
  if (!d.active) return "inactive";
  if (d.endsAt && todayKey > d.endsAt) return "ended";
  if (d.maxUses !== null && d.usedCount >= d.maxUses) return "limit";
  if (d.startsAt && todayKey < d.startsAt) return "scheduled";
  return "live";
}

/** Whether a discount can be used on `todayKey`: active, within its dates and under its usage cap. */
export function isDiscountUsable(d: DiscountDTO, todayKey: string): boolean {
  return discountState(d, todayKey) === "live";
}
