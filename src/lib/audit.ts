import "server-only";

import { FieldValue, type Transaction, type WriteBatch } from "firebase-admin/firestore";

import { orgCol } from "@/lib/db";
import { actorName, type AppContext } from "@/lib/tenancy/context";

/**
 * Append-only audit trail (organizations/{orgId}/auditLogs). Pass the
 * transaction or batch that performs the change so the entry commits
 * atomically with it.
 */
export interface AuditEntry {
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  branchId?: string | null;
  changes?: Record<string, [unknown, unknown]>;
}

type Writer = Transaction | WriteBatch;

export function audit(ctx: AppContext, entry: AuditEntry, writer?: Writer) {
  const ref = orgCol(ctx.org.id, "auditLogs").doc();
  const data = {
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    summary: entry.summary.slice(0, 500),
    branchId: entry.branchId ?? null,
    changes: entry.changes ? sanitizeChanges(entry.changes) : null,
    actorUid: ctx.session.uid,
    actorName: actorName(ctx),
    at: FieldValue.serverTimestamp(),
  };
  if (writer) {
    if ("getAll" in writer) (writer as Transaction).set(ref, data);
    else (writer as WriteBatch).set(ref, data);
    return Promise.resolve();
  }
  return ref.set(data).then(() => undefined);
}

function sanitizeChanges(changes: Record<string, [unknown, unknown]>) {
  const out: Record<string, { before: unknown; after: unknown }> = {};
  for (const [k, [before, after]] of Object.entries(changes)) {
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    out[k] = { before: before ?? null, after: after ?? null };
  }
  return out;
}

/** Field-level diff between two plain objects, for audit `changes`. */
export function diff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[],
): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  for (const k of keys) {
    if (JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null)) {
      out[k] = [before[k] ?? null, after[k] ?? null];
    }
  }
  return out;
}
