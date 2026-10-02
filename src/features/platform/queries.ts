import "server-only";

import { db, iso, orgCol, str, type OrgCollection } from "@/lib/db";

import type { SalonRow } from "./types";

/** "Now" for this render, passed to client components so relative dates match on server and client. */
export function requestTime(): number {
  return Date.now();
}

/** Hard ceiling for one page of the admin list; far above today's numbers. */
const MAX_SALONS = 500;

async function countOf(orgId: string, name: OrgCollection): Promise<number> {
  const snap = await orgCol(orgId, name).count().get();
  return snap.data().count;
}

/**
 * Every organization with its owner, size and latest activity. Admin SDK on
 * the server only — callers must have passed `platformAdminForPage()` or
 * `platformAction()`.
 */
export async function listSalons(): Promise<SalonRow[]> {
  const snap = await db().collection("organizations").limit(MAX_SALONS).get();
  const rows = await Promise.all(
    snap.docs.map(async (d): Promise<SalonRow> => {
      const data = d.data();
      const ownerUid = str(data.ownerUid) || null;
      const [branches, staff, clients, members, ownerSnap, last] = await Promise.all([
        countOf(d.id, "branches"),
        countOf(d.id, "staff"),
        countOf(d.id, "clients"),
        countOf(d.id, "members"),
        ownerUid ? orgCol(d.id, "members").doc(ownerUid).get() : Promise.resolve(null),
        orgCol(d.id, "auditLogs").orderBy("at", "desc").limit(1).get(),
      ]);
      const subscription = (data.subscription ?? {}) as Record<string, unknown>;
      return {
        id: d.id,
        name: str(data.name) || "—",
        status: data.status === "active" ? "active" : "suspended",
        createdAt: iso(data.createdAt),
        owner:
          ownerUid && ownerSnap?.exists
            ? { uid: ownerUid, name: str(ownerSnap.get("displayName")), email: str(ownerSnap.get("email")) }
            : null,
        plan: str(subscription.plan, "trial"),
        trialEndsAt: iso(subscription.trialEndsAt),
        branches,
        staff,
        clients,
        members,
        lastActivityAt: last.empty ? null : iso(last.docs[0]!.get("at")),
      };
    }),
  );
  return rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}
