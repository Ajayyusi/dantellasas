"use client";

import { AlertTriangleIcon } from "lucide-react";

import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/client";
import type { StaffDTO } from "@/lib/types";

import { documentAlerts } from "../utils";

export function StaffStatusBadge({ status }: { status: StaffDTO["status"] }) {
  const { t } = useI18n();
  const variant = status === "active" ? "success" : status === "inactive" ? "warning" : "neutral";
  return <Badge variant={variant}>{t(`staff.status.${status}`)}</Badge>;
}

/** "Documents expiring" warning for passport/visa within 30 days or past. */
export function DocumentsBadge({ hr, today, detailed }: { hr: StaffDTO["hr"]; today: string; detailed?: boolean }) {
  const { t } = useI18n();
  const org = useOrg();
  const alerts = documentAlerts(hr, today);
  if (alerts.length === 0) return null;
  const expired = alerts.some((a) => a.state === "expired");
  const lines = alerts.map((a) => t(`staff.docs.${a.kind}_${a.state}`, { date: org.dateKey(a.date) }));
  if (detailed) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {alerts.map((a, i) => (
          <Badge key={a.kind} variant={a.state === "expired" ? "danger" : "warning"}>
            <AlertTriangleIcon />
            {lines[i]}
          </Badge>
        ))}
      </div>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Badge variant={expired ? "danger" : "warning"}>
            <AlertTriangleIcon />
            {expired ? t("staff.docs.expired") : t("staff.docs.expiring")}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}
