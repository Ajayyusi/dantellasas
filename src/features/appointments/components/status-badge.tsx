"use client";

import { StatusPill } from "@/components/common/status-pill";
import { useI18n } from "@/lib/i18n/client";
import type { AppointmentStatus } from "@/lib/types";

export function statusColor(status: AppointmentStatus): string {
  return `var(--status-${status})`;
}

/** The readable label colour for a status (darker than its dot). */
export function statusTextColor(status: AppointmentStatus): string {
  return `var(--status-${status}-fg)`;
}

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <StatusPill color={statusColor(status)} textColor={statusTextColor(status)} className={className}>
      {t(`appointments.status.${status}`)}
    </StatusPill>
  );
}
