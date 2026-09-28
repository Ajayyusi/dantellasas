"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";
import type { TransactionStatus } from "@/lib/types";

const VARIANT: Record<TransactionStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  paid: "success",
  partially_paid: "warning",
  unpaid: "danger",
  refunded: "neutral",
  partially_refunded: "info",
  void: "neutral",
};

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const { t } = useI18n();
  return (
    <Badge variant={VARIANT[status]} className={status === "void" ? "line-through" : undefined}>
      {t(`sales.status.${status}`)}
    </Badge>
  );
}
