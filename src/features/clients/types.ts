import type { ClientNoteDTO } from "@/lib/types";

/** Client-safe view types for the clients module (extend shared DTOs locally). */

export interface ClientNoteView extends ClientNoteDTO {
  /** Whether the current member may delete this note (author, owner or admin). */
  canDelete: boolean;
}

export interface ClientActivityView {
  id: string;
  action: string;
  summary: string;
  actorName: string;
  at: string | null;
  /** Field names changed by an update (from the audit entry's `changes`). */
  changedFields: string[];
}

export interface StaffOption {
  id: string;
  displayName: string;
  color: string;
  photoUrl: string | null;
  active: boolean;
}

export const LAST_VISIT_BUCKETS = ["recent", "lapsing", "lapsed", "never"] as const;
export type LastVisitBucket = (typeof LAST_VISIT_BUCKETS)[number];
