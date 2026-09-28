import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { z } from "zod";

import { readProductsForSale, writeSaleStockMovements } from "@/features/inventory/service";
import { fail } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";
import { actorName, canAccessBranch, type AppContext } from "@/lib/tenancy/context";

import { toTransaction } from "./mappers";
import type { addPaymentInput, refundInput } from "./schema";

type RefundInput = z.output<typeof refundInput>;
type AddPaymentInput = z.output<typeof addPaymentInput>;

/**
 * Issues a numbered credit note (CRD-000001). Paid invoices are never edited;
 * the credit note records what was returned and reverses its side effects in
 * the same transaction: stock, client spend, gift-card balance and the
 * commission attributed to each line.
 */
export async function executeRefund(ctx: AppContext, input: RefundInput) {
  const orgId = ctx.org.id;
  const ref = orgCol(orgId, "transactions").doc(input.id);
  const method = ctx.settings.payments.methods.find((m) => m.id === input.methodId);
  if (!method) fail("errors.validation", { methodId: "validation.invalid" });

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) fail("errors.notFound");
    const sale = toTransaction(snap.id, snap.data() ?? {});
    if (!canAccessBranch(ctx, sale.branchId)) fail("errors.branchForbidden");
    if (!["paid", "partially_paid", "partially_refunded"].includes(sale.status)) fail("errors.invalidStatusChange");

    // Quantities already refunded per line.
    const rawRefunds = (snap.get("refunds") ?? []) as { lines?: { itemId: string; quantity: number }[] }[];
    const refundedQty = new Map<string, number>();
    for (const r of rawRefunds) for (const l of r.lines ?? []) refundedQty.set(l.itemId, (refundedQty.get(l.itemId) ?? 0) + l.quantity);

    const lines = input.lines.map((l) => {
      const item = sale.items.find((i) => i.id === l.itemId);
      if (!item) fail("errors.validation", { lines: "errors.notFound" });
      const left = item.quantity - (refundedQty.get(item.id) ?? 0);
      if (l.quantity > left) fail("errors.refundExceeds");
      const share = l.quantity / item.quantity;
      return {
        item,
        quantity: l.quantity,
        amountMinor: Math.round(item.totalMinor * share),
        taxMinor: Math.round(item.taxMinor * share),
        commissionMinor: Math.round(item.commissionMinor * share),
      };
    });
    const tipAlreadyRefunded = rawRefunds.some((r) => (r as { tipMinor?: number }).tipMinor);
    const tipMinor = input.includeTip && !tipAlreadyRefunded ? sale.tipMinor : 0;
    const amount = lines.reduce((s, l) => s + l.amountMinor, 0) + tipMinor;
    if (amount <= 0) fail("errors.validation", { lines: "validation.atLeastOneItem" });
    if (amount > sale.paidMinor - sale.refundedMinor) fail("errors.refundExceeds");

    const productLines = lines.filter((l) => l.item.type === "product" && input.restock);
    const products = await readProductsForSale(tx, orgId, productLines.map((l) => l.item.refId));
    const counterRef = orgCol(orgId, "counters").doc("creditNote");
    const counterSnap = await tx.get(counterRef);
    const giftPayment = method.type === "gift_card" ? sale.payments.find((p) => p.methodType === "gift_card") : undefined;
    const giftCardId = giftPayment ? ((snap.get("payments") as { giftCardId?: string }[]).find((p) => p.giftCardId)?.giftCardId ?? null) : null;
    const cardSnap = giftCardId ? await tx.get(orgCol(orgId, "giftCards").doc(giftCardId)) : null;

    // Writes
    const counter = Number(counterSnap.get("value") ?? 0) + 1;
    const number = `CRD-${String(counter).padStart(6, "0")}`;
    const now = Timestamp.now();
    const refundedMinor = sale.refundedMinor + amount;
    const status = refundedMinor >= sale.paidMinor ? "refunded" : "partially_refunded";

    const stockLines = productLines
      .map((l) => ({ product: products.get(l.item.refId)!, quantity: l.quantity }))
      .filter((l) => l.product && l.product.trackStock);
    if (stockLines.length) writeSaleStockMovements(tx, ctx, { branchId: sale.branchId, transactionId: sale.id, lines: stockLines, kind: "return" });

    tx.update(ref, {
      status,
      refundedMinor,
      refunds: FieldValue.arrayUnion({
        id: `rf_${counter}`,
        number,
        amountMinor: amount,
        tipMinor,
        reason: input.reason,
        methodId: method.id,
        methodLabel: method.label,
        restocked: input.restock,
        lines: lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity, amountMinor: l.amountMinor, taxMinor: l.taxMinor, commissionMinor: l.commissionMinor })),
        at: now,
        byUid: ctx.session.uid,
        byName: actorName(ctx),
      }),
      updatedAt: now,
    });
    tx.set(counterRef, { value: counter }, { merge: true });

    if (sale.clientId) {
      const clientDelta = amount - tipMinor;
      tx.update(orgCol(orgId, "clients").doc(sale.clientId), { "stats.totalSpendMinor": FieldValue.increment(-clientDelta), updatedAt: now });
    }
    if (cardSnap?.exists) {
      tx.update(cardSnap.ref, {
        balanceMinor: FieldValue.increment(amount),
        status: "active",
        redemptions: FieldValue.arrayUnion({ at: now, amountMinor: -amount, transactionId: sale.id }),
      });
    }
    audit(
      ctx,
      {
        action: "transaction.refunded",
        entity: "transaction",
        entityId: sale.id,
        branchId: sale.branchId,
        summary: `${number} for ${sale.number} · ${(amount / 100).toFixed(2)} ${ctx.currency} · ${input.reason}`,
      },
      tx,
    );
    return { number, amountMinor: amount };
  });
}

/** Voids an unpaid invoice (created with a balance due) and reverses its effects. */
export async function executeVoid(ctx: AppContext, id: string) {
  const orgId = ctx.org.id;
  const ref = orgCol(orgId, "transactions").doc(id);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) fail("errors.notFound");
    const sale = toTransaction(snap.id, snap.data() ?? {});
    if (!canAccessBranch(ctx, sale.branchId)) fail("errors.branchForbidden");
    if (sale.paidMinor > 0 || sale.status === "void") fail("errors.invalidStatusChange");
    const productLines = sale.items.filter((i) => i.type === "product");
    const products = await readProductsForSale(tx, orgId, productLines.map((i) => i.refId));
    const [pkgSnap, memSnap, cardSnap] = await Promise.all([
      tx.get(orgCol(orgId, "clientPackages").where("transactionId", "==", id)),
      tx.get(orgCol(orgId, "clientMemberships").where("transactionId", "==", id)),
      tx.get(orgCol(orgId, "giftCards").where("transactionId", "==", id)),
    ]);
    const now = Timestamp.now();
    const stock = productLines
      .map((i) => ({ product: products.get(i.refId)!, quantity: i.quantity }))
      .filter((l) => l.product && l.product.trackStock);
    if (stock.length) writeSaleStockMovements(tx, ctx, { branchId: sale.branchId, transactionId: id, lines: stock, kind: "return" });
    tx.update(ref, { status: "void", balanceMinor: 0, updatedAt: now });
    pkgSnap.docs.forEach((d) => tx.update(d.ref, { status: "cancelled" }));
    memSnap.docs.forEach((d) => tx.update(d.ref, { status: "cancelled" }));
    cardSnap.docs.forEach((d) => tx.update(d.ref, { status: "void", balanceMinor: 0 }));
    if (sale.clientId) {
      tx.update(orgCol(orgId, "clients").doc(sale.clientId), {
        "stats.totalSpendMinor": FieldValue.increment(-sale.totalMinor),
        ...(sale.items.some((i) => i.type === "service") ? { "stats.visits": FieldValue.increment(-1) } : {}),
      });
    }
    if (sale.appointmentId) {
      tx.update(orgCol(orgId, "appointments").doc(sale.appointmentId), { transactionId: null, status: "checked_in", updatedAt: now });
    }
    if (snap.get("discountId")) tx.update(orgCol(orgId, "discounts").doc(snap.get("discountId")), { usedCount: FieldValue.increment(-1) });
    audit(ctx, { action: "transaction.voided", entity: "transaction", entityId: id, branchId: sale.branchId, summary: sale.number }, tx);
    return null;
  });
}

/** Records payments against an invoice that has a balance due. */
export async function executeAddPayment(ctx: AppContext, input: AddPaymentInput) {
  const orgId = ctx.org.id;
  const ref = orgCol(orgId, "transactions").doc(input.id);
  const methods = new Map(ctx.settings.payments.methods.filter((m) => m.enabled).map((m) => [m.id, m]));
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) fail("errors.notFound");
    const sale = toTransaction(snap.id, snap.data() ?? {});
    if (!canAccessBranch(ctx, sale.branchId)) fail("errors.branchForbidden");
    if (sale.balanceMinor <= 0 || sale.status === "void") fail("errors.invalidStatusChange");
    const now = Timestamp.now();
    const additions = input.payments.map((p, i) => {
      const m = methods.get(p.methodId);
      if (!m || m.type === "gift_card" || m.type === "package") fail("errors.validation", { payments: "validation.invalid" });
      return { id: `p${sale.payments.length + i + 1}`, methodId: m.id, methodType: m.type, label: m.label, amountMinor: p.amountMinor, reference: p.reference, giftCardId: null, clientPackageId: null, at: now, byUid: ctx.session.uid };
    });
    const added = additions.reduce((s, p) => s + p.amountMinor, 0);
    if (added > sale.balanceMinor) fail("errors.paymentExceeds");
    const balance = sale.balanceMinor - added;
    tx.update(ref, {
      payments: FieldValue.arrayUnion(...additions),
      paymentMethods: FieldValue.arrayUnion(...additions.map((p) => p.methodId)),
      paidMinor: sale.paidMinor + added,
      balanceMinor: balance,
      status: balance === 0 ? "paid" : "partially_paid",
      updatedAt: now,
    });
    audit(ctx, { action: "transaction.payment_added", entity: "transaction", entityId: sale.id, branchId: sale.branchId, summary: `${sale.number} +${(added / 100).toFixed(2)}` }, tx);
    return null;
  });
}
