import "server-only";

import { FieldPath, FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";

import { fail } from "@/lib/actions";
import { orgCol } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { actorName, canAccessBranch, type AppContext } from "@/lib/tenancy/context";
import type { MovementType, ProductDTO } from "@/lib/types";

import { toProduct } from "./mappers";

/**
 * Stock lives on the product (`stock.{branchId}`) and only changes inside a
 * transaction that also appends an `inventoryMovements` entry carrying the
 * resulting balance. Everything that moves stock goes through these helpers.
 */

export function productRef(orgId: string, productId: string): DocumentReference {
  return orgCol(orgId, "products").doc(productId);
}

export function balanceAt(product: Pick<ProductDTO, "stock">, branchId: string): number {
  return product.stock[branchId] ?? 0;
}

/**
 * Throws when a tracked product would go below zero. `fieldErrors` is keyed
 * by product id so a multi-line form can highlight the line; `vars.product`
 * carries the name for messages such as `errors.insufficientStock`.
 */
export function assertNotNegative(
  product: Pick<ProductDTO, "trackStock" | "id" | "name">,
  balance: number,
  code = "inventory.errors.negativeStock",
) {
  if (balance < 0 && product.trackStock) fail(code, { [product.id]: code }, { product: product.name });
}

/**
 * Weighted average cost after receiving `quantity` at `unitCostMinor`.
 * Only positive on-hand stock (all branches) carries the old cost.
 */
export function weightedAverageCost(product: Pick<ProductDTO, "stock" | "costMinor">, quantity: number, unitCostMinor: number): number {
  const onHand = Object.values(product.stock).reduce((s, q) => s + Math.max(0, q), 0);
  if (onHand <= 0) return unitCostMinor;
  return Math.round((product.costMinor * onHand + unitCostMinor * quantity) / (onHand + quantity));
}

export interface MovementWrite {
  product: Pick<ProductDTO, "id" | "name">;
  branchId: string;
  type: MovementType;
  /** Signed: positive adds stock, negative removes it. */
  quantity: number;
  balanceAfter: number;
  unitCostMinor: number;
  note?: string;
  transactionId?: string | null;
  transferId?: string | null;
}

/** Appends one ledger entry in the transaction; returns its id. */
export function writeMovement(tx: Transaction, ctx: AppContext, m: MovementWrite): string {
  const ref = orgCol(ctx.org.id, "inventoryMovements").doc();
  tx.set(ref, {
    productId: m.product.id,
    productName: m.product.name,
    branchId: m.branchId,
    type: m.type,
    quantity: m.quantity,
    balanceAfter: m.balanceAfter,
    unitCostMinor: m.unitCostMinor,
    transactionId: m.transactionId ?? null,
    transferId: m.transferId ?? null,
    note: m.note ?? "",
    dateKey: todayKey(ctx.timezone),
    createdByUid: ctx.session.uid,
    createdByName: actorName(ctx),
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/** Sets the balance of one or more branches on a product (plus optional extra fields). */
export function writeBalances(
  tx: Transaction,
  ref: DocumentReference,
  balances: Record<string, number>,
  extra: Record<string, unknown> = {},
) {
  const pairs: unknown[] = [];
  for (const [branchId, qty] of Object.entries(balances)) pairs.push(new FieldPath("stock", branchId), qty);
  for (const [k, v] of Object.entries(extra)) pairs.push(k, v);
  pairs.push("updatedAt", FieldValue.serverTimestamp());
  const [first, firstValue, ...rest] = pairs;
  tx.update(ref, first as FieldPath, firstValue, ...rest);
}

// ── Checkout integration ───────────────────────────────────────────────

/**
 * Reads the products of a sale inside the sale transaction.
 * Reads happen first (Firestore rule: all reads before writes in a transaction).
 * Missing products are simply absent from the map.
 */
export async function readProductsForSale(tx: Transaction, orgId: string, productIds: string[]): Promise<Map<string, ProductDTO>> {
  const ids = [...new Set(productIds.filter(Boolean))];
  const out = new Map<string, ProductDTO>();
  if (ids.length === 0) return out;
  const snaps = await tx.getAll(...ids.map((id) => productRef(orgId, id)));
  for (const snap of snaps) {
    if (snap.exists) out.set(snap.id, toProduct(snap.id, snap.data() ?? {}));
  }
  return out;
}

/**
 * Writes stock + movement docs for a sale (qty positive = sold) or refund (restock).
 * Uses the balances of the products read by `readProductsForSale` (no extra
 * reads) and handles several lines of the same product with a running
 * balance, then writes each product's final balance once.
 *
 * A sale that would take a tracked product below zero throws
 * `errors.insufficientStock` (vars.product = name; fieldErrors keyed by product id).
 */
export function writeSaleStockMovements(
  tx: Transaction,
  ctx: AppContext,
  args: {
    branchId: string;
    transactionId: string;
    lines: { product: ProductDTO; quantity: number }[];
    kind: "sale" | "return";
  },
): void {
  const { branchId, transactionId, lines, kind } = args;
  if (!canAccessBranch(ctx, branchId)) fail("errors.branchForbidden");
  const running = new Map<string, { product: ProductDTO; balance: number }>();
  for (const line of lines) {
    const qty = Math.abs(line.quantity);
    if (!Number.isFinite(qty) || qty === 0) continue;
    let entry = running.get(line.product.id);
    if (!entry) {
      entry = { product: line.product, balance: balanceAt(line.product, branchId) };
      running.set(line.product.id, entry);
    }
    const delta = kind === "sale" ? -qty : qty;
    entry.balance += delta;
    if (kind === "sale") assertNotNegative(entry.product, entry.balance, "errors.insufficientStock");
    writeMovement(tx, ctx, {
      product: entry.product,
      branchId,
      type: kind,
      quantity: delta,
      balanceAfter: entry.balance,
      unitCostMinor: entry.product.costMinor,
      transactionId,
    });
  }
  for (const [id, entry] of running) {
    writeBalances(tx, productRef(ctx.org.id, id), { [branchId]: entry.balance });
  }
}
