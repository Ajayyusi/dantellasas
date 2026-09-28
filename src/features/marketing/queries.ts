import "server-only";

import { Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";

import { toClient } from "@/features/clients/mappers";
import { orgCol } from "@/lib/db";
import { parseKey, startOfDayInstant, todayKey } from "@/lib/dates";
import type { ClientDTO } from "@/lib/types";

/** Max clients read per audience (Firestore reads are billed per document). */
export const AUDIENCE_LIMIT = 1000;
/** Top spenders shown. */
export const TOP_SPENDERS_LIMIT = 100;
export const LAPSED_DAYS = 60;

export const AUDIENCE_KEYS = ["birthdays", "lapsed", "topSpenders", "newClients"] as const;
export type AudienceKey = (typeof AUDIENCE_KEYS)[number];

export interface AudienceClient {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  birthday: { month: number; day: number } | null;
  lastVisitAt: string | null;
  visits: number;
  totalSpendMinor: number;
  createdAt: string | null;
  marketingConsent: boolean;
}

export interface Audience {
  key: AudienceKey;
  clients: AudienceClient[];
  /** True when the read hit the limit, so the list may be incomplete. */
  capped: boolean;
  limit: number;
}

function slim(c: ClientDTO): AudienceClient {
  return {
    id: c.id,
    fullName: c.fullName,
    phone: c.phone,
    email: c.email,
    birthday: c.birthday ? { month: c.birthday.month, day: c.birthday.day } : null,
    lastVisitAt: c.stats.lastVisitAt,
    visits: c.stats.visits,
    totalSpendMinor: c.stats.totalSpendMinor,
    createdAt: c.createdAt,
    marketingConsent: c.marketingConsent,
  };
}

function toAudience(key: AudienceKey, docs: QueryDocumentSnapshot[], limit: number): Audience {
  const clients = docs
    .map((d) => toClient(d.id, d.data()))
    .filter((c) => c.status === "active")
    .map(slim);
  return { key, clients, capped: docs.length >= limit, limit };
}

/**
 * Marketing audiences, each one query on a single field (no composite
 * indexes). Archived clients are dropped after the read.
 */
export async function loadAudiences(orgId: string, tz: string): Promise<Audience[]> {
  const col = orgCol(orgId, "clients");
  const today = todayKey(tz);
  const { m } = parseKey(today);
  const monthStart = Timestamp.fromDate(startOfDayInstant(`${today.slice(0, 7)}-01`, tz));
  const lapsedBefore = Timestamp.fromMillis(Date.now() - LAPSED_DAYS * 86_400_000);

  const [birthdays, lapsed, top, fresh] = await Promise.all([
    col.where("birthday.month", "==", m).limit(AUDIENCE_LIMIT).get(),
    col.where("stats.lastVisitAt", "<", lapsedBefore).orderBy("stats.lastVisitAt", "desc").limit(AUDIENCE_LIMIT).get(),
    col.orderBy("stats.totalSpendMinor", "desc").limit(TOP_SPENDERS_LIMIT).get(),
    col.where("createdAt", ">=", monthStart).orderBy("createdAt", "desc").limit(AUDIENCE_LIMIT).get(),
  ]);

  const birthdayAudience = toAudience("birthdays", birthdays.docs, AUDIENCE_LIMIT);
  birthdayAudience.clients.sort(
    (a, b) => (a.birthday?.day ?? 0) - (b.birthday?.day ?? 0) || a.fullName.localeCompare(b.fullName),
  );

  const topAudience = toAudience("topSpenders", top.docs, TOP_SPENDERS_LIMIT);
  topAudience.clients = topAudience.clients.filter((c) => c.totalSpendMinor > 0);
  topAudience.capped = false; // a top-N list is complete by definition

  return [
    birthdayAudience,
    toAudience("lapsed", lapsed.docs, AUDIENCE_LIMIT),
    topAudience,
    toAudience("newClients", fresh.docs, AUDIENCE_LIMIT),
  ];
}
