import type { Metadata } from "next";

import { AuditLogView } from "@/features/settings/components/audit-log-view";
import { AUDIT_LIMIT, listAllBranches, listAuditLogs } from "@/features/settings/queries";
import { addDaysToKey, isDateKey, startOfDayInstant } from "@/lib/dates";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requirePagePermission("view_audit_log");
  const params = await searchParams;
  const fromKey = typeof params.from === "string" && isDateKey(params.from) ? params.from : "";
  const toKey = typeof params.to === "string" && isDateKey(params.to) ? params.to : "";
  const [entries, branches] = await Promise.all([
    listAuditLogs(ctx.org.id, {
      from: fromKey ? startOfDayInstant(fromKey, ctx.timezone) : null,
      to: toKey ? startOfDayInstant(addDaysToKey(toKey, 1), ctx.timezone) : null,
    }),
    listAllBranches(ctx.org.id),
  ]);
  return (
    <AuditLogView
      key={`${fromKey}|${toKey}`}
      entries={entries}
      range={{ from: fromKey, to: toKey }}
      limit={AUDIT_LIMIT}
      branches={branches}
    />
  );
}
