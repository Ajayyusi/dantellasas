"use server";

import { z } from "zod";

import { action } from "@/lib/actions";
import { orgCol, str } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { normalizeText, searchTermToken } from "@/lib/search";
import { can, ownAppointmentsOnly } from "@/lib/tenancy/context";

export interface SearchHit {
  id: string;
  kind: "client" | "staff" | "invoice" | "appointment";
  title: string;
  subtitle: string;
  href: string;
}

/**
 * ⌘K search. Each source is searched only if the member may see it; results
 * are capped per source to keep the palette fast.
 */
export const globalSearchAction = action(
  { schema: z.object({ term: z.string().trim().min(2).max(60) }), revalidate: false },
  async ({ term }, ctx) => {
    const hits: SearchHit[] = [];
    const token = searchTermToken(term);
    const lower = normalizeText(term);
    const tasks: Promise<void>[] = [];

    if (can(ctx, "view_customers")) {
      tasks.push(
        orgCol(ctx.org.id, "clients")
          .where("searchTokens", "array-contains", token)
          .limit(8)
          .get()
          .then((snap) => {
            for (const d of snap.docs) {
              if (d.get("status") === "archived") continue;
              hits.push({
                id: d.id,
                kind: "client",
                title: str(d.get("fullName")),
                subtitle: [str(d.get("phone")), str(d.get("email"))].filter(Boolean).join(" · "),
                href: `/clients/${d.id}`,
              });
            }
          }),
      );
    }

    if (can(ctx, "view_staff")) {
      tasks.push(
        orgCol(ctx.org.id, "staff")
          .where("status", "==", "active")
          .get()
          .then((snap) => {
            for (const d of snap.docs) {
              const name = str(d.get("displayName"));
              if (!normalizeText(name).includes(lower)) continue;
              hits.push({
                id: d.id,
                kind: "staff",
                title: name,
                subtitle: str(d.get("position")),
                href: `/staff/${d.id}`,
              });
            }
          }),
      );
    }

    if (can(ctx, "view_sales")) {
      const upper = term.toUpperCase().replace(/\s+/g, "");
      const digits = upper.replace(/\D/g, "");
      const candidates = new Set<string>([upper]);
      if (digits) candidates.add(`${ctx.settings.receipts.invoicePrefix}${digits.padStart(6, "0")}`);
      tasks.push(
        orgCol(ctx.org.id, "transactions")
          .where("number", "in", [...candidates].slice(0, 10))
          .limit(5)
          .get()
          .then((snap) => {
            for (const d of snap.docs) {
              if (!ctx.scopeBranchIds.includes(str(d.get("branchId")))) continue;
              hits.push({
                id: d.id,
                kind: "invoice",
                title: str(d.get("number")),
                subtitle: str(d.get("clientName")),
                href: `/sales/${d.id}`,
              });
            }
          }),
      );
    }

    if (can(ctx, "view_appointments") && ctx.branchId) {
      const today = todayKey(ctx.timezone);
      tasks.push(
        orgCol(ctx.org.id, "appointments")
          .where("branchId", "==", ctx.branchId)
          .where("dateKey", "==", today)
          .get()
          .then((snap) => {
            const own = ownAppointmentsOnly(ctx);
            for (const d of snap.docs) {
              if (own && !(d.get("staffIds") as string[] | undefined)?.includes(ctx.staffId ?? "")) continue;
              const name = str(d.get("clientName"));
              if (!normalizeText(name).includes(lower)) continue;
              hits.push({
                id: d.id,
                kind: "appointment",
                title: name,
                subtitle: str(d.get("dateKey")),
                href: `/appointments?date=${today}&appointment=${d.id}`,
              });
            }
          }),
      );
    }

    await Promise.all(tasks);
    return hits.slice(0, 25);
  },
);
