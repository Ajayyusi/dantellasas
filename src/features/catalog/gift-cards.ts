import "server-only";

import { randomInt } from "node:crypto";

import type { Transaction } from "firebase-admin/firestore";

import { orgCol } from "@/lib/db";
import type { GiftCardDTO } from "@/lib/types";

import { toGiftCard } from "./mappers";

/**
 * Gift card codes, shared with the checkout module.
 *
 * Codes look like `DGC-7K4P-9QX2`: a fixed prefix plus 8 characters from an
 * alphabet without look-alikes (no 0/O, 1/I/L), ~40 bits of randomness.
 * Every card stores `codeNormalized` (upper-case, no spaces or dashes) so a
 * code typed as "dgc 7k4p 9qx2" or "7K4P9QX2" still matches.
 */

const PREFIX = "DGC";
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateGiftCardCode(): string {
  let body = "";
  for (let i = 0; i < 8; i++) body += ALPHABET[randomInt(ALPHABET.length)];
  return `${PREFIX}-${body.slice(0, 4)}-${body.slice(4)}`;
}

/** Upper-case, strips everything but letters and digits; adds the prefix when only the 8-character body was typed. */
export function normalizeGiftCardCode(code: string): string {
  const n = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (n.length === 8 && !n.startsWith(PREFIX)) return PREFIX + n;
  return n;
}

/**
 * Looks a card up by code (case-insensitive, ignores spaces/dashes). Returns
 * the card whatever its status — callers check `status`, `balanceMinor` and
 * `expiresAt`. Pass a transaction to read it inside a sale.
 */
export async function findGiftCardByCode(
  orgId: string,
  code: string,
  tx?: Transaction,
): Promise<{ id: string; data: GiftCardDTO } | null> {
  const normalized = normalizeGiftCardCode(code);
  if (normalized.length < 6) return null;
  const col = orgCol(orgId, "giftCards");
  const q = col.where("codeNormalized", "==", normalized).limit(1);
  let snap = tx ? await tx.get(q) : await q.get();
  if (snap.empty) {
    // Cards written without `codeNormalized` (e.g. imported) — match the display code.
    const byCode = col.where("code", "==", code.trim().toUpperCase()).limit(1);
    snap = tx ? await tx.get(byCode) : await byCode.get();
  }
  const doc = snap.docs[0];
  if (!doc) return null;
  return { id: doc.id, data: toGiftCard(doc.id, doc.data()) };
}

/**
 * Generates a code that no card in the org uses yet. Call inside the
 * transaction that creates the card so the check and the write are atomic.
 */
export async function uniqueGiftCardCode(orgId: string, tx: Transaction): Promise<{ code: string; codeNormalized: string }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateGiftCardCode();
    const codeNormalized = normalizeGiftCardCode(code);
    const clash = await tx.get(orgCol(orgId, "giftCards").where("codeNormalized", "==", codeNormalized).limit(1));
    if (clash.empty) return { code, codeNormalized };
  }
  throw new Error("Could not generate a unique gift card code");
}
