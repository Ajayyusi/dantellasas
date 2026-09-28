import "server-only";

import { chunk, orgCol } from "@/lib/db";
import type { AppContext } from "@/lib/tenancy/context";
import type { TransactionDTO } from "@/lib/types";

import { toTransaction } from "./mappers";

/** Invoices in the member's branch scope between two date keys (inclusive), newest first. */
export async function listTransactions(ctx: AppContext, from: string, to: string): Promise<TransactionDTO[]> {
  if (ctx.scopeBranchIds.length === 0) return [];
  const snaps = await Promise.all(
    chunk(ctx.scopeBranchIds, 30).map((ids) =>
      orgCol(ctx.org.id, "transactions")
        .where("branchId", "in", ids)
        .where("dateKey", ">=", from)
        .where("dateKey", "<=", to)
        .get(),
    ),
  );
  return snaps
    .flatMap((s) => s.docs.map((d) => toTransaction(d.id, d.data())))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getTransaction(ctx: AppContext, id: string): Promise<TransactionDTO | null> {
  const snap = await orgCol(ctx.org.id, "transactions").doc(id).get();
  if (!snap.exists) return null;
  const t = toTransaction(snap.id, snap.data() ?? {});
  return ctx.branches.some((b) => b.id === t.branchId) ? t : null;
}
