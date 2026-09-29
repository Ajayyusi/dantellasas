"use client";

import { CalendarClockIcon, HistoryIcon, ReceiptIcon, ShieldCheckIcon, SparklesIcon, WalletIcon, type LucideIcon } from "lucide-react";

import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";
import { formatRelative } from "@/lib/i18n/format";
import type { ClientDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { averageSpendMinor } from "../../utils";

const TONES = {
  rose: "var(--primary)",
  gold: "var(--gold)",
  sage: "var(--chart-3)",
  blue: "var(--chart-4)",
  mauve: "var(--chart-5)",
  taupe: "var(--chart-6)",
} as const;

function Stat({
  label,
  icon: Icon,
  tone,
  children,
  sub,
  className,
}: {
  label: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  children: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  const color = TONES[tone];
  return (
    <div className={cn("hover-lift flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-3.5 shadow-xs sm:p-5", className)}>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-xl sm:size-9"
          style={{
            backgroundColor: `color-mix(in oklch, ${color} 14%, var(--card))`,
            color: `color-mix(in oklch, ${color} 80%, var(--foreground))`,
          }}
        >
          <Icon className="size-[18px]" />
        </span>
        <dt className="line-clamp-2 min-w-0 text-[14px] font-semibold leading-tight text-muted-foreground">{label}</dt>
      </div>
      <dd className="min-w-0">
        {children}
        {sub ? <span className="mt-1.5 block truncate text-[14px] text-muted-foreground">{sub}</span> : null}
      </dd>
    </div>
  );
}

/** One large figure, or a quieter placeholder ("No visits yet") when there is none. */
function Figure({ children, placeholder }: { children: React.ReactNode; placeholder?: boolean }) {
  return (
    <span
      className={cn(
        "block truncate",
        placeholder
          ? "text-base font-medium leading-snug text-muted-foreground"
          : "font-display text-[23px] font-semibold leading-none tabular sm:text-[28px]",
      )}
    >
      {children}
    </span>
  );
}

/** Lifetime value and reliability at a glance (from `client.stats`). */
export function ProfileStats({ client, nextAt, now }: { client: ClientDTO; nextAt: string | null; now: number }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const s = client.stats;
  return (
    <dl className="mb-7 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
      <Stat icon={WalletIcon} tone="rose" label={t("clients.stats.spend")}>
        <Figure>{org.money(s.totalSpendMinor)}</Figure>
      </Stat>
      <Stat icon={SparklesIcon} tone="gold" label={t("clients.stats.visits")}>
        <Figure>{s.visits}</Figure>
      </Stat>
      <Stat
        icon={ReceiptIcon}
        tone="sage"
        label={t("clients.stats.average")}
        sub={s.visits > 0 ? t("clients.stats.perVisit") : undefined}
      >
        <Figure>{s.visits > 0 ? org.money(averageSpendMinor(client)) : "—"}</Figure>
      </Stat>
      <Stat
        icon={HistoryIcon}
        tone="blue"
        label={t("clients.stats.lastVisit")}
        sub={s.lastVisitAt ? org.date(s.lastVisitAt, "date") : undefined}
      >
        <Figure placeholder={!s.lastVisitAt}>
          {s.lastVisitAt ? formatRelative(s.lastVisitAt, locale, now) : t("clients.stats.neverVisited")}
        </Figure>
      </Stat>
      <Stat
        icon={CalendarClockIcon}
        tone="mauve"
        label={t("clients.stats.nextAppointment")}
        sub={nextAt ? org.date(nextAt, "time") : undefined}
      >
        <Figure placeholder={!nextAt}>{nextAt ? org.date(nextAt, "weekdayDate") : t("clients.stats.none")}</Figure>
      </Stat>
      <Stat icon={ShieldCheckIcon} tone="taupe" label={t("clients.stats.attendance")}>
        <span className="grid gap-1.5 text-[15px] leading-snug">
          <span className="flex items-center justify-between gap-3">
            <span className="truncate text-muted-foreground">{t("clients.stats.cancellations")}</span>
            <span className="font-semibold tabular">{s.cancellations}</span>
          </span>
          <span className="flex items-center justify-between gap-3">
            <span className="truncate text-muted-foreground">{t("clients.stats.noShows")}</span>
            <span className={cn("font-semibold tabular", s.noShows > 0 && "text-destructive")}>{s.noShows}</span>
          </span>
        </span>
      </Stat>
    </dl>
  );
}
