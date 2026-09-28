"use server";

import { FieldValue } from "firebase-admin/firestore";

import { action } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { db, orgCol, userRef } from "@/lib/db";
import { getAdminAuth } from "@/lib/firebase/admin";

import { displayNameInput } from "./schema";

/** Self-service: only ever touches the caller's own member and user documents. */
export const updateDisplayNameAction = action({ schema: displayNameInput }, async ({ displayName }, ctx) => {
  const uid = ctx.session.uid;
  const batch = db().batch();
  batch.update(orgCol(ctx.org.id, "members").doc(uid), { displayName, updatedAt: FieldValue.serverTimestamp() });
  batch.set(userRef(uid), { displayName, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  audit(
    ctx,
    {
      action: "member.profile_updated",
      entity: "member",
      entityId: uid,
      summary: displayName,
      changes: { displayName: [ctx.member.displayName, displayName] },
    },
    batch,
  );
  await batch.commit();
  // Keep the Auth profile in sync (used as a fallback name); not critical if it fails.
  await getAdminAuth()
    .updateUser(uid, { displayName })
    .catch(() => undefined);
  return null;
});
