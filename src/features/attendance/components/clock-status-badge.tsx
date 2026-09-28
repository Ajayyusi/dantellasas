"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";

import type { ClockState } from "../utils";

const VARIANT = { not_in: "neutral", in: "success", on_break: "warning", out: "info" } as const;

export function ClockStatusBadge({ state }: { state: ClockState }) {
  const { t } = useI18n();
  return (
    <Badge variant={VARIANT[state]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {t(`attendance.state.${state}`)}
    </Badge>
  );
}
