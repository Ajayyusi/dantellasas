"use server";

import { z } from "zod";

import { action } from "@/lib/actions";
import { orgCol } from "@/lib/db";
import { addDaysToKey, todayKey } from "@/lib/dates";
import { can } from "@/lib/tenancy/context";

export interface AlertItem {
  id: string;
  kind: "low_stock" | "document_expiry";
  title: string;
  href: string;
  quantity?: number;
  minStock?: number;
  branchId?: string;
  document?: "passportExpiry" | "visaExpiry";
  date?: string;
}

/** Live operational alerts, computed from current data for this member. */
export const getAlertsAction = action(
  { schema: z.object({}), revalidate: false },
  async (_input, ctx) => {
    const alerts: AlertItem[] = [];
    if (can(ctx, "manage_inventory") && ctx.settings.notifications.lowStockAlerts) {
      const snap = await orgCol(ctx.org.id, "products").where("active", "==", true).get();
      for (const d of snap.docs) {
        if (d.get("trackStock") === false) continue;
        const min = Number(d.get("minStock") ?? 0);
        const stock = (d.get("stock") ?? {}) as Record<string, number>;
        for (const branchId of ctx.scopeBranchIds) {
          const qty = Number(stock[branchId] ?? 0);
          if (min > 0 && qty <= min) {
            alerts.push({
              id: `${d.id}-${branchId}`,
              kind: "low_stock",
              title: String(d.get("name") ?? ""),
              quantity: qty,
              minStock: min,
              branchId,
              href: `/inventory?product=${d.id}`,
            });
          }
        }
      }
    }
    if (can(ctx, "manage_staff") && ctx.settings.notifications.documentExpiryAlerts) {
      const limit = addDaysToKey(todayKey(ctx.timezone), 30);
      const snap = await orgCol(ctx.org.id, "staff").where("status", "==", "active").get();
      for (const d of snap.docs) {
        const hr = (d.get("hr") ?? {}) as Record<string, string | null>;
        for (const field of ["passportExpiry", "visaExpiry"] as const) {
          const date = hr[field];
          if (date && date <= limit) {
            alerts.push({
              id: `${d.id}-${field}`,
              kind: "document_expiry",
              title: String(d.get("displayName") ?? ""),
              document: field,
              date,
              href: `/staff/${d.id}`,
            });
          }
        }
      }
    }
    return alerts.slice(0, 30);
  },
);
