"use client";

import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";
import { formatRelative } from "@/lib/i18n/format";
import type { ClientDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { averageSpendMinor } from "../../utils";

function Stat({
  label,
  value,
  sub,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "danger" | "muted";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 bg-card px-4 py-3", className)}>
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-lg font-semibold tabular tracking-tight",
          tone === "danger" && "text-destructive",
          tone === "muted" && "text-base font-medium text-muted-foreground",
        )}
      >
        {value}
      </dd>
      {sub ? <dd className="truncate text-xs text-muted-foreground">{sub}</dd> : null}
    </div>
  );
}

/** Lifetime value and reliability at a glance (from `client.stats`). */
export function ProfileStats({ client, nextAt, now }: { client: ClientDTO; nextAt: string | null; now: number }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const s = client.stats;
  return (
    <dl className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-sm sm:grid-cols-4 xl:grid-cols-7">
      <Stat label={t("clients.stats.spend")} value={org.money(s.totalSpendMinor)} />
      <Stat label={t("clients.stats.visits")} value={s.visits} />
      <Stat label={t("clients.stats.average")} value={s.visits > 0 ? org.money(averageSpendMinor(client)) : "—"} />
      <Stat
        label={t("clients.stats.lastVisit")}
        value={s.lastVisitAt ? formatRelative(s.lastVisitAt, locale, now) : t("clients.stats.neverVisited")}
        sub={s.lastVisitAt ? org.date(s.lastVisitAt, "date") : undefined}
        tone={s.lastVisitAt ? undefined : "muted"}
      />
      <Stat
        label={t("clients.stats.nextAppointment")}
        value={nextAt ? org.date(nextAt, "weekdayDate") : t("clients.stats.none")}
        sub={nextAt ? org.date(nextAt, "time") : undefined}
        tone={nextAt ? undefined : "muted"}
      />
      <Stat label={t("clients.stats.cancellations")} value={s.cancellations} />
      <Stat
        label={t("clients.stats.noShows")}
        value={s.noShows}
        tone={s.noShows > 0 ? "danger" : undefined}
        className="col-span-2 xl:col-span-1"
      />
    </dl>
  );
}
