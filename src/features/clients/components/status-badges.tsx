"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";
import type {
  AppointmentStatus,
  ClientDTO,
  ClientMembershipDTO,
  ClientPackageDTO,
  TransactionStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** Appointment status pill coloured from the `--status-<status>` CSS variables. */
export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const { t } = useI18n();
  const color = `var(--status-${status})`;
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)`, color: `color-mix(in oklch, ${color} 80%, var(--foreground))` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {t(`clients.appointmentStatus.${status}`)}
    </span>
  );
}

export function ClientStatusBadge({ status }: { status: ClientDTO["status"] }) {
  const { t } = useI18n();
  return <Badge variant={status === "active" ? "success" : "neutral"}>{t(`clients.status.${status}`)}</Badge>;
}

const TX_VARIANT: Record<TransactionStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  paid: "success",
  partially_paid: "warning",
  unpaid: "danger",
  refunded: "neutral",
  partially_refunded: "info",
  void: "neutral",
};

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const { t } = useI18n();
  return <Badge variant={TX_VARIANT[status] ?? "neutral"}>{t(`clients.txStatus.${status}`)}</Badge>;
}

export function PackageStatusBadge({ status }: { status: ClientPackageDTO["status"] }) {
  const { t } = useI18n();
  const variant = status === "active" ? "success" : status === "exhausted" ? "info" : "neutral";
  return <Badge variant={variant}>{t(`clients.packageStatus.${status}`)}</Badge>;
}

export function MembershipStatusBadge({ status }: { status: ClientMembershipDTO["status"] }) {
  const { t } = useI18n();
  return <Badge variant={status === "active" ? "success" : "neutral"}>{t(`clients.membershipStatus.${status}`)}</Badge>;
}

export function TagList({ tags, max = 3, className }: { tags: string[]; max?: number; className?: string }) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, max);
  return (
    <span className={cn("flex flex-wrap items-center gap-1", className)}>
      {shown.map((tag) => (
        <Badge key={tag} variant="primary" className="max-w-32" title={tag}>
          <span className="truncate">{tag}</span>
        </Badge>
      ))}
      {tags.length > max ? <Badge variant="neutral">+{tags.length - max}</Badge> : null}
    </span>
  );
}
