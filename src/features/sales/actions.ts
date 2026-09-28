"use server";

import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { findGiftCardByCode } from "@/features/catalog/gift-cards";
import { validateDiscountCode } from "@/features/catalog/discounts";
import { toClientMembership } from "@/features/catalog/mappers";
import { toClientPackage } from "@/features/clients/mappers";
import { action, fail } from "@/lib/actions";
import { orgCol } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { canAccessBranch, writeBranchId } from "@/lib/tenancy/context";

import { executeAddPayment, executeRefund, executeVoid } from "./refund-service";
import { executeSale } from "./sale-service";
import { addPaymentInput, refundInput, saleInput } from "./schema";

export const createSaleAction = action({ schema: saleInput, permission: "create_sales" }, async (input, ctx) => {
  const branchId = writeBranchId(ctx, input.branchId);
  if (!branchId) fail("errors.branchRequired");
  if (input.branchId && !canAccessBranch(ctx, input.branchId)) fail("errors.branchForbidden");
  const res = await executeSale(ctx, input, branchId);
  if (res.clientId && input.appointmentId) {
    const { refreshClientNextAppointment } = await import("@/features/appointments/service");
    await refreshClientNextAppointment(ctx.org.id, res.clientId);
  }
  return { id: res.id, number: res.number, dueMinor: res.dueMinor };
});

export const refundTransactionAction = action({ schema: refundInput, permission: "refund_sales" }, (input, ctx) =>
  executeRefund(ctx, input),
);

export const voidTransactionAction = action(
  { schema: z.object({ id: z.string().min(1) }), permission: "refund_sales" },
  ({ id }, ctx) => executeVoid(ctx, id),
);

export const addPaymentAction = action({ schema: addPaymentInput, permission: "create_sales" }, (input, ctx) =>
  executeAddPayment(ctx, input),
);

/** Preview a discount code at checkout (the sale re-validates it). */
export const checkDiscountCodeAction = action(
  { schema: z.object({ code: z.string().trim().min(1).max(40) }), permission: "create_sales", revalidate: false },
  async ({ code }, ctx) => {
    const d = await validateDiscountCode(ctx.org.id, code, todayKey(ctx.timezone));
    if (!d) fail("errors.invalidDiscount");
    return { name: d.name, code: d.code, kind: d.kind, valueBps: d.valueBps, valueMinor: d.valueMinor, appliesTo: d.appliesTo };
  },
);

/** Gift card balance lookup for the payment step. */
export const checkGiftCardAction = action(
  { schema: z.object({ code: z.string().trim().min(4).max(40) }), permission: "create_sales", revalidate: false },
  async ({ code }, ctx) => {
    const found = await findGiftCardByCode(ctx.org.id, code);
    const card = found?.data;
    const expired = card?.expiresAt ? Date.parse(card.expiresAt) < Date.now() : false;
    if (!card || card.status !== "active" || expired || card.balanceMinor <= 0) fail("errors.giftCardInvalid");
    return { code: card.code, balanceMinor: card.balanceMinor, recipientName: card.recipientName };
  },
);

/** The selected client's active packages and membership, for redemptions and member pricing. */
export const clientWalletAction = action(
  { schema: z.object({ clientId: z.string().min(1) }), permission: "create_sales", revalidate: false },
  async ({ clientId }, ctx) => {
    const now = Timestamp.now();
    const [pk, mem] = await Promise.all([
      orgCol(ctx.org.id, "clientPackages").where("clientId", "==", clientId).where("status", "==", "active").get(),
      orgCol(ctx.org.id, "clientMemberships").where("clientId", "==", clientId).where("status", "==", "active").get(),
    ]);
    const packages = pk.docs
      .map((d) => toClientPackage(d.id, d.data()))
      .filter((p) => !p.expiresAt || Date.parse(p.expiresAt) > now.toMillis());
    const membership =
      mem.docs.map((d) => toClientMembership(d.id, d.data())).find((m) => !m.endAt || Date.parse(m.endAt) > now.toMillis()) ?? null;
    return { packages, membership };
  },
);
