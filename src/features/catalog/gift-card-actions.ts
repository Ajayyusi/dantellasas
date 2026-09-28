"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { action, fail } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";
import { addDaysToKey, startOfDayInstant, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

import { uniqueGiftCardCode } from "./gift-cards";
import { issueGiftCardInput, voidGiftCardInput } from "./schema";

/** Issues a complimentary gift card (no sale). Cards sold at checkout are created by the sale. */
export const issueGiftCardAction = action({ schema: issueGiftCardInput, permission: "manage_catalog" }, async (input, ctx) => {
  const tz = ctx.timezone;
  if (input.expiresOn && input.expiresOn <= todayKey(tz)) {
    fail("errors.validation", { expiresOn: "catalog.giftCards.expiryInPast" });
  }
  // Valid through the whole expiry day in the business time zone.
  const expiresAt = input.expiresOn
    ? Timestamp.fromMillis(startOfDayInstant(addDaysToKey(input.expiresOn, 1), tz).getTime() - 1)
    : null;

  let purchaserName = input.purchaserName;
  if (input.purchaserClientId) {
    const client = await orgCol(ctx.org.id, "clients").doc(input.purchaserClientId).get();
    if (!client.exists) fail("errors.validation", { purchaserClientId: "validation.invalid" });
    purchaserName = String(client.get("fullName") ?? purchaserName);
  }

  const ref = orgCol(ctx.org.id, "giftCards").doc();
  const code = await db().runTransaction(async (tx) => {
    const { code, codeNormalized } = await uniqueGiftCardCode(ctx.org.id, tx);
    tx.set(ref, {
      code,
      codeNormalized,
      initialMinor: input.amountMinor,
      balanceMinor: input.amountMinor,
      issuedAt: FieldValue.serverTimestamp(),
      expiresAt,
      purchaserClientId: input.purchaserClientId,
      purchaserName,
      recipientName: input.recipientName,
      recipientEmail: input.recipientEmail.toLowerCase(),
      message: input.message,
      status: "active",
      source: "complimentary",
      transactionId: null,
      branchId: ctx.branchId,
      redemptions: [],
      issuedByUid: ctx.session.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    audit(
      ctx,
      {
        action: "gift_card.issued",
        entity: "giftCard",
        entityId: ref.id,
        summary: `${code} · ${formatMoney(input.amountMinor, ctx.currency)}${input.recipientName ? ` · ${input.recipientName}` : ""}`,
        branchId: ctx.branchId,
      },
      tx,
    );
    return code;
  });
  return { id: ref.id, code };
});

export const voidGiftCardAction = action(
  { schema: voidGiftCardInput, permission: "manage_catalog" },
  async ({ id, force }, ctx) => {
    const ref = orgCol(ctx.org.id, "giftCards").doc(id);
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail("errors.notFound");
      if (snap.get("status") === "void") fail("catalog.giftCards.alreadyVoid");
      const initial = Number(snap.get("initialMinor") ?? 0);
      const balance = Number(snap.get("balanceMinor") ?? 0);
      const used = balance < initial || (Array.isArray(snap.get("redemptions")) && snap.get("redemptions").length > 0);
      if (used && !force) fail("catalog.giftCards.voidUsedConfirm");
      tx.update(ref, {
        status: "void",
        voidedBalanceMinor: balance,
        balanceMinor: 0,
        voidedAt: FieldValue.serverTimestamp(),
        voidedByUid: ctx.session.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      audit(
        ctx,
        {
          action: "gift_card.voided",
          entity: "giftCard",
          entityId: id,
          summary: `${String(snap.get("code") ?? "")} · ${formatMoney(balance, ctx.currency)}`,
          changes: { status: [snap.get("status") ?? null, "void"], balanceMinor: [balance, 0] },
        },
        tx,
      );
    });
    return null;
  },
);
