import "server-only";

import { fail } from "@/lib/actions";
import { orgCol } from "@/lib/db";

type Item = { serviceId: string; quantity: number };

/**
 * Validates service lines against the catalog and snapshots the current
 * service names (denormalised so history reads right after a rename).
 * Duplicate lines for one service are merged.
 */
export async function resolveServiceItems(orgId: string, items: Item[], field: string) {
  if (items.length === 0) return [];
  const snap = await orgCol(orgId, "services").get();
  const names = new Map(snap.docs.map((d) => [d.id, String(d.get("name") ?? "")]));
  const merged = new Map<string, number>();
  for (const i of items) {
    if (!names.has(i.serviceId)) fail("errors.validation", { [field]: "validation.invalid" });
    merged.set(i.serviceId, (merged.get(i.serviceId) ?? 0) + i.quantity);
  }
  return [...merged].map(([serviceId, quantity]) => ({
    serviceId,
    serviceName: names.get(serviceId) ?? "",
    quantity: Math.min(999, quantity),
  }));
}
