"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";
import type { MovementType } from "@/lib/types";

import type { StockStatus } from "../types";

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { t } = useI18n();
  if (status === "out") return <Badge variant="danger">{t("inventory.status.out")}</Badge>;
  if (status === "low") return <Badge variant="warning">{t("inventory.status.low")}</Badge>;
  return null;
}

const TYPE_VARIANT: Record<MovementType, "success" | "info" | "neutral" | "warning" | "primary" | "danger"> = {
  purchase: "success",
  sale: "primary",
  adjustment: "neutral",
  transfer_in: "info",
  transfer_out: "info",
  return: "warning",
  internal_use: "neutral",
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const { t } = useI18n();
  return <Badge variant={TYPE_VARIANT[type]}>{t(`inventory.types.${type}`)}</Badge>;
}

export function SignedQty({ value }: { value: number }) {
  return (
    <span className={value > 0 ? "font-medium text-success" : value < 0 ? "font-medium text-destructive" : undefined} dir="ltr">
      {value > 0 ? `+${value}` : value}
    </span>
  );
}
