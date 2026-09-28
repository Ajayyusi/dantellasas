"use client";

import { useI18n } from "@/lib/i18n/client";
import type { AppointmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function statusColor(status: AppointmentStatus): string {
  return `var(--status-${status})`;
}

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", className)}
      style={{
        backgroundColor: `color-mix(in oklch, ${statusColor(status)} 14%, transparent)`,
        color: `color-mix(in oklch, ${statusColor(status)} 80%, var(--foreground))`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: statusColor(status) }} />
      {t(`appointments.status.${status}`)}
    </span>
  );
}
