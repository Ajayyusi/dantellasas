import "server-only";

import { iso, str, strOrNull, type Data } from "@/lib/db";

import type { AuditEntryDTO } from "./types";

export function toAuditEntry(id: string, d: Data): AuditEntryDTO {
  return {
    id,
    action: str(d.action),
    entity: str(d.entity),
    entityId: str(d.entityId),
    summary: str(d.summary),
    branchId: strOrNull(d.branchId),
    actorUid: str(d.actorUid),
    actorName: str(d.actorName),
    at: iso(d.at),
  };
}
