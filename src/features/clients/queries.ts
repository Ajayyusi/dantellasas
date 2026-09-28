import "server-only";

import { cache } from "react";

import { toAppointment } from "@/features/appointments/mappers";
import { toTransaction } from "@/features/sales/mappers";
import { orgCol } from "@/lib/db";
import type {
  AppointmentDTO,
  ClientDTO,
  ClientMembershipDTO,
  ClientPackageDTO,
  TransactionDTO,
} from "@/lib/types";
import { canAccessBranch, ownAppointmentsOnly, type AppContext } from "@/lib/tenancy/context";

import { toClient, toClientActivity, toClientMembership, toClientNote, toClientPackage } from "./mappers";
import { canDeleteNote } from "./service";
import type { ClientActivityView, ClientNoteView } from "./types";

/**
 * The directory loads at most this many clients (most recently updated first)
 * and browses them client-side. Beyond the cap, the directory's "search all
 * clients" box uses `searchClientsAction` (token query over every client).
 */
export const CLIENT_DIRECTORY_CAP = 1000;

/** Index: clients (status ASC, updatedAt DESC). */
export async function listClients(
  orgId: string,
  status: ClientDTO["status"],
): Promise<{ clients: ClientDTO[]; capped: boolean }> {
  const snap = await orgCol(orgId, "clients")
    .where("status", "==", status)
    .orderBy("updatedAt", "desc")
    .limit(CLIENT_DIRECTORY_CAP)
    .get();
  return {
    clients: snap.docs.map((d) => toClient(d.id, d.data())),
    capped: snap.size >= CLIENT_DIRECTORY_CAP,
  };
}

export const getClient = cache(async (orgId: string, id: string): Promise<ClientDTO | null> => {
  const snap = await orgCol(orgId, "clients").doc(id).get();
  return snap.exists ? toClient(snap.id, snap.data() ?? {}) : null;
});

/** Pinned first, then newest. Single-field order on the subcollection — no composite index. */
export async function listClientNotes(ctx: AppContext, clientId: string): Promise<ClientNoteView[]> {
  const snap = await orgCol(ctx.org.id, "clients").doc(clientId).collection("notes").orderBy("createdAt", "desc").limit(200).get();
  const notes = snap.docs.map((d) => ({
    ...toClientNote(d.id, d.data()),
    canDelete: canDeleteNote(ctx, String(d.get("authorUid") ?? "")),
  }));
  return notes.sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

/**
 * Appointments for the client, newest first, in branches the member can access.
 * Members without `view_all_appointments` only see appointments they work on.
 * Index: appointments (clientId ASC, startAt DESC).
 */
export async function listClientAppointments(ctx: AppContext, clientId: string, limit = 100): Promise<AppointmentDTO[]> {
  const snap = await orgCol(ctx.org.id, "appointments")
    .where("clientId", "==", clientId)
    .orderBy("startAt", "desc")
    .limit(limit)
    .get();
  const ownOnly = ownAppointmentsOnly(ctx);
  return snap.docs
    .map((d) => toAppointment(d.id, d.data()))
    .filter((a) => canAccessBranch(ctx, a.branchId))
    .filter((a) => !ownOnly || (!!ctx.staffId && a.staffIds.includes(ctx.staffId)));
}

/**
 * Invoices for the client in the selected branch scope, newest first.
 * Index: transactions (clientId ASC, createdAt DESC).
 */
export async function listClientTransactions(ctx: AppContext, clientId: string, limit = 200): Promise<TransactionDTO[]> {
  const snap = await orgCol(ctx.org.id, "transactions")
    .where("clientId", "==", clientId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  const scope = new Set(ctx.scopeBranchIds);
  return snap.docs.map((d) => toTransaction(d.id, d.data())).filter((t) => scope.has(t.branchId));
}

/** Equality-only query, sorted in memory (few per client) — no composite index. */
export async function listClientPackages(orgId: string, clientId: string): Promise<ClientPackageDTO[]> {
  const snap = await orgCol(orgId, "clientPackages").where("clientId", "==", clientId).limit(100).get();
  return snap.docs
    .map((d) => toClientPackage(d.id, d.data()))
    .sort((a, b) => (b.purchasedAt ?? "").localeCompare(a.purchasedAt ?? ""));
}

export async function listClientMemberships(orgId: string, clientId: string): Promise<ClientMembershipDTO[]> {
  const snap = await orgCol(orgId, "clientMemberships").where("clientId", "==", clientId).limit(100).get();
  return snap.docs
    .map((d) => toClientMembership(d.id, d.data()))
    .sort((a, b) => (b.startAt ?? "").localeCompare(a.startAt ?? ""));
}

/** Index: auditLogs (entity ASC, entityId ASC, at DESC). */
export async function listClientActivity(orgId: string, clientId: string, limit = 100): Promise<ClientActivityView[]> {
  const snap = await orgCol(orgId, "auditLogs")
    .where("entity", "==", "client")
    .where("entityId", "==", clientId)
    .orderBy("at", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => toClientActivity(d.id, d.data()));
}

/** "Now" for this render, passed to client components so relative dates match on server and client. */
export function requestTime(): number {
  return Date.now();
}
