import type { ISODate } from "@/lib/types";

/** Audit entry as shown in Settings › Audit log. */
export interface AuditEntryDTO {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  branchId: string | null;
  actorUid: string;
  actorName: string;
  at: ISODate | null;
}

export interface StaffOption {
  id: string;
  displayName: string;
  color: string;
  photoUrl: string | null;
  memberUid: string | null;
}

export interface RoleOption {
  id: string;
  key: string;
  name: string;
  nameAr: string;
}
