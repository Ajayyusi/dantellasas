"use client";

import { CrownIcon, PackageIcon, RefreshCwIcon } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";
import { formatPercent } from "@/lib/money";
import type { ClientMembershipDTO, ClientPackageDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { MembershipStatusBadge, PackageStatusBadge } from "../status-badges";

function Progress({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={total}>
      <div className="h-full rounded-full bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary)_55%,var(--gold))] rtl:bg-gradient-to-l" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A client package with purchased / used / remaining per service (or credit). */
export function PackageCard({ pkg, className }: { pkg: ClientPackageDTO; className?: string }) {
  const { t } = useI18n();
  const org = useOrg();
  const inactive = pkg.status !== "active";
  return (
    <div className={cn("grid grid-cols-1 gap-3 rounded-2xl border bg-card p-5 shadow-xs", inactive && "opacity-75", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <PackageIcon className="size-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{pkg.name}</div>
            <div className="text-[14px] text-muted-foreground">
              {[
                pkg.purchasedAt ? t("clients.packages.purchased", { date: org.date(pkg.purchasedAt, "date") }) : null,
                pkg.expiresAt ? t("clients.packages.expires", { date: org.date(pkg.expiresAt, "date") }) : t("clients.packages.noExpiry"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>
        <PackageStatusBadge status={pkg.status} />
      </div>
      {pkg.kind === "credit" ? (
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span>{t("clients.packages.credit")}</span>
            <span className="font-medium tabular">
              {t("clients.packages.creditRemaining", {
                amount: org.money(Math.max(0, pkg.creditMinor - pkg.creditUsedMinor)),
                total: org.money(pkg.creditMinor),
              })}
            </span>
          </div>
          <Progress used={pkg.creditUsedMinor} total={pkg.creditMinor} />
        </div>
      ) : (
        <ul className="grid gap-2.5">
          {pkg.items.map((i) => (
            <li key={i.serviceId || i.serviceName} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{i.serviceName}</span>
                <span className="shrink-0 text-[14px] text-muted-foreground tabular">
                  {t("clients.packages.used", { used: i.used, total: i.total })}
                  {" · "}
                  <span className="font-medium text-foreground">{t("clients.packages.remaining", { count: Math.max(0, i.total - i.used) })}</span>
                </span>
              </div>
              <Progress used={i.used} total={i.total} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MembershipCard({ membership: m, className }: { membership: ClientMembershipDTO; className?: string }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const perks = [
    m.serviceDiscountBps > 0 ? t("clients.memberships.serviceDiscount", { value: formatPercent(m.serviceDiscountBps / 10000, locale) }) : null,
    m.productDiscountBps > 0 ? t("clients.memberships.productDiscount", { value: formatPercent(m.productDiscountBps / 10000, locale) }) : null,
  ].filter(Boolean);
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2.5 rounded-2xl border bg-card p-5 shadow-xs",
        m.status === "active" && "border-[color-mix(in_oklch,var(--gold)_40%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_oklch,var(--gold)_10%,var(--card)),var(--card)_60%)]",
        m.status !== "active" && "opacity-75",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground ring-1 ring-gold/40">
            <CrownIcon className="size-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{m.planName}</div>
            <div className="text-[14px] text-muted-foreground">
              {t("clients.memberships.period", { start: org.date(m.startAt, "date"), end: org.date(m.endAt, "date") })}
            </div>
          </div>
        </div>
        <MembershipStatusBadge status={m.status} />
      </div>
      {perks.length > 0 || m.autoRenew ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
          {perks.map((p) => (
            <span key={p}>{p}</span>
          ))}
          {m.autoRenew ? (
            <span className="inline-flex items-center gap-1">
              <RefreshCwIcon className="size-3.5" />
              {t("clients.memberships.autoRenew")}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PackagesTab({ packages }: { packages: ClientPackageDTO[] }) {
  const { t } = useI18n();
  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border bg-card shadow-sm">
        <EmptyState icon={PackageIcon} title={t("clients.packages.empty")} description={t("clients.packages.emptyHint")} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {packages.map((p) => (
        <PackageCard key={p.id} pkg={p} />
      ))}
    </div>
  );
}

export function MembershipsTab({ memberships }: { memberships: ClientMembershipDTO[] }) {
  const { t } = useI18n();
  if (memberships.length === 0) {
    return (
      <div className="rounded-2xl border bg-card shadow-sm">
        <EmptyState icon={CrownIcon} title={t("clients.memberships.empty")} description={t("clients.memberships.emptyHint")} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {memberships.map((m) => (
        <MembershipCard key={m.id} membership={m} />
      ))}
    </div>
  );
}
