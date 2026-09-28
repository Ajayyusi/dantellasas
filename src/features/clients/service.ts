import "server-only";

import { FieldValue, type Transaction } from "firebase-admin/firestore";

import { fail } from "@/lib/actions";
import { orgCol } from "@/lib/db";
import { ORG_WIDE_ROLES } from "@/lib/permissions";
import { buildSearchTokens, normalizePhone } from "@/lib/search";
import type { AppContext } from "@/lib/tenancy/context";

/** Fields derived from the editable ones: full name, normalised phone, search tokens. */
export function derivedClientFields(input: { firstName: string; lastName: string; phone: string; email: string }, countryCode: string) {
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const phoneNormalized = input.phone ? normalizePhone(input.phone, countryCode) : "";
  return {
    fullName,
    phoneNormalized,
    emailLower: input.email.toLowerCase(),
    searchTokens: buildSearchTokens({
      names: [input.firstName, input.lastName],
      phone: phoneNormalized,
      email: input.email,
    }),
  };
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/** Throws errors.duplicatePhone when another active client has this phone. */
export async function assertUniquePhone(orgId: string, phoneNormalized: string, exceptId?: string, tx?: Transaction) {
  if (!phoneNormalized) return;
  const q = orgCol(orgId, "clients").where("phoneNormalized", "==", phoneNormalized).limit(2);
  const snap = tx ? await tx.get(q) : await q.get();
  if (snap.docs.some((d) => d.id !== exceptId && d.get("status") !== "archived")) {
    fail("errors.validation", { phone: "errors.duplicatePhone" });
  }
}

export const EMPTY_STATS = {
  visits: 0,
  totalSpendMinor: 0,
  lastVisitAt: null,
  firstVisitAt: null,
  nextAppointmentAt: null,
  noShows: 0,
  cancellations: 0,
};

export const serverTime = () => FieldValue.serverTimestamp();

/** Notes can be deleted by their author, or by an owner/admin. */
export function canDeleteNote(ctx: AppContext, authorUid: string): boolean {
  return (!!authorUid && authorUid === ctx.session.uid) || ORG_WIDE_ROLES.includes(ctx.member.roleKey);
}
