import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { toTransaction } from "@/features/sales/mappers";
import { arr, chunk, db, iso, num, orgCol, type Data } from "@/lib/db";
import { addDaysToKey, dateKeyOf, type DateRange } from "@/lib/dates";
import type { AppContext } from "@/lib/tenancy/context";

import type { ClientHistory } from "./aggregate/clients";
import type { PrepaidReport, ReportTransaction } from "./types";

/**
 * Report reads. Every query is bounded by the date range and the member's
 * branch scope, and capped; a hit cap is reported so the UI can say the
 * figures are partial.
 */

/** Invoices read per query (per group of up to 30 branches). */
export const TX_CAP = 5000;
/** Days before the range searched for older invoices refunded inside it. */
export const REFUND_LOOKBACK_DAYS = 365;
const REFUNDED_CAP = 2000;
const CLIENT_CAP = 3000;
const PREPAID_CAP = 5000;

interface Capped<T> {
  rows: T;
  capped: boolean;
}

function toReportTransaction(id: string, d: Data): ReportTransaction {
  const tx = toTransaction(id, d);
  const raw = arr<Data>(d.items);
  return {
    ...tx,
    items: tx.items.map((item, i) => ({ ...item, redeemed: typeof raw[i]?.redeemedClientPackageId === "string" && raw[i]?.redeemedClientPackageId !== "" })),
  };
}

/**
 * Invoices dated in the range for the branch scope.
 * Index: transactions (branchId ASC, dateKey ASC).
 */
export async function reportTransactions(ctx: AppContext, range: DateRange): Promise<Capped<ReportTransaction[]>> {
  if (ctx.scopeBranchIds.length === 0) return { rows: [], capped: false };
  const snaps = await Promise.all(
    chunk(ctx.scopeBranchIds, 30).map((ids) =>
      orgCol(ctx.org.id, "transactions")
        .where("branchId", "in", ids)
        .where("dateKey", ">=", range.from)
        .where("dateKey", "<=", range.to)
        .limit(TX_CAP)
        .get(),
    ),
  );
  return {
    rows: snaps.flatMap((s) => s.docs.map((d) => toReportTransaction(d.id, d.data()))),
    capped: snaps.some((s) => s.size >= TX_CAP),
  };
}

/**
 * Refunded / partially refunded invoices dated up to REFUND_LOOKBACK_DAYS
 * before the range, so credit notes issued in the range count on their own
 * date even when the invoice is older.
 * Index: transactions (branchId ASC, status ASC, dateKey ASC).
 */
export async function refundedTransactions(ctx: AppContext, range: DateRange): Promise<Capped<ReportTransaction[]>> {
  if (ctx.scopeBranchIds.length === 0) return { rows: [], capped: false };
  const from = addDaysToKey(range.from, -REFUND_LOOKBACK_DAYS);
  const snaps = await Promise.all(
    chunk(ctx.scopeBranchIds, 30).flatMap((ids) =>
      (["refunded", "partially_refunded"] as const).map((status) =>
        orgCol(ctx.org.id, "transactions")
          .where("branchId", "in", ids)
          .where("status", "==", status)
          .where("dateKey", ">=", from)
          .where("dateKey", "<=", range.to)
          .limit(REFUNDED_CAP)
          .get(),
      ),
    ),
  );
  return {
    rows: snaps.flatMap((s) => s.docs.map((d) => toReportTransaction(d.id, d.data()))),
    capped: snaps.some((s) => s.size >= REFUNDED_CAP),
  };
}

function keyOf(value: unknown, tz: string): string | null {
  const s = iso(value);
  return s ? dateKeyOf(new Date(s), tz) : null;
}

/** First-visit and created dates for the given clients (direct document reads, field-masked). */
export async function clientHistories(ctx: AppContext, clientIds: string[]): Promise<Capped<Map<string, ClientHistory>>> {
  const ids = [...new Set(clientIds)];
  const capped = ids.length > CLIENT_CAP;
  const col = orgCol(ctx.org.id, "clients");
  const out = new Map<string, ClientHistory>();
  for (const group of chunk(ids.slice(0, CLIENT_CAP), 300)) {
    const snaps = await db().getAll(...group.map((id) => col.doc(id)), { fieldMask: ["stats.firstVisitAt", "createdAt"] });
    for (const s of snaps) {
      if (!s.exists) continue;
      out.set(s.id, { firstVisitKey: keyOf(s.get("stats.firstVisitAt"), ctx.timezone), createdKey: keyOf(s.get("createdAt"), ctx.timezone) });
    }
  }
  return { rows: out, capped };
}

function millis(v: unknown): number | null {
  const t = v as Timestamp | null | undefined;
  return t && typeof t.toMillis === "function" ? t.toMillis() : null;
}

/**
 * Outstanding prepaid value right now (organisation-wide: gift cards and
 * client packages are not branch-scoped). Equality filters only — served by
 * single-field indexes.
 */
export async function prepaidLiability(orgId: string): Promise<PrepaidReport["liability"]> {
  const now = Date.now();
  const [cards, packages] = await Promise.all([
    orgCol(orgId, "giftCards").where("status", "==", "active").select("balanceMinor", "expiresAt").limit(PREPAID_CAP).get(),
    orgCol(orgId, "clientPackages").where("status", "==", "active").select("kind", "creditMinor", "creditUsedMinor", "items", "expiresAt").limit(PREPAID_CAP).get(),
  ]);
  const live = (d: FirebaseFirestore.QueryDocumentSnapshot) => {
    const end = millis(d.get("expiresAt"));
    return end === null || end >= now;
  };
  let giftCardMinor = 0;
  let giftCards = 0;
  for (const d of cards.docs) {
    if (!live(d)) continue;
    const balance = num(d.get("balanceMinor"));
    if (balance <= 0) continue;
    giftCardMinor += balance;
    giftCards += 1;
  }
  let packageCreditMinor = 0;
  let packageSessions = 0;
  for (const d of packages.docs) {
    if (!live(d)) continue;
    if (d.get("kind") === "credit") packageCreditMinor += Math.max(0, num(d.get("creditMinor")) - num(d.get("creditUsedMinor")));
    else for (const i of arr<Data>(d.get("items"))) packageSessions += Math.max(0, num(i.total) - num(i.used));
  }
  return { giftCardMinor, giftCards, packageCreditMinor, packageSessions, capped: cards.size >= PREPAID_CAP || packages.size >= PREPAID_CAP };
}
