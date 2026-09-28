"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CakeIcon, CheckIcon, CrownIcon, HourglassIcon, InfoIcon, SparklesIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { PageContainer, PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { dateKeyOf } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { DiscountDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import type { Audience, AudienceClient, AudienceKey } from "../queries";
import { DiscountSummary } from "./discount-summary";

/** Stable empty facets: DataTable's default `[]` is re-created each render and re-triggers its filtering. */
const NO_FACETS: FacetFilter<AudienceClient>[] = [];

const ICONS: Record<AudienceKey, typeof CakeIcon> = {
  birthdays: CakeIcon,
  lapsed: HourglassIcon,
  topSpenders: CrownIcon,
  newClients: SparklesIcon,
};

const pad = (n: number) => String(n).padStart(2, "0");
const searchText = (c: AudienceClient) => `${c.fullName} ${c.phone} ${c.email}`;

export function MarketingView({
  audiences,
  discounts,
  today,
  lapsedDays,
}: {
  audiences: Audience[];
  discounts: DiscountDTO[];
  today: string;
  lapsedDays: number;
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const [selected, setSelected] = useState<AudienceKey>("birthdays");
  const [consentOnly, setConsentOnly] = useState(true);
  const audience = audiences.find((a) => a.key === selected) ?? audiences[0];
  const rows = useMemo(
    () => (audience?.clients ?? []).filter((c) => !consentOnly || c.marketingConsent),
    [audience, consentOnly],
  );
  const monthName = new Intl.DateTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${today.slice(0, 7)}-15T12:00:00Z`));

  const birthday = useCallback(
    (c: AudienceClient) => (c.birthday ? org.dateKey(`2000-${pad(c.birthday.month)}-${pad(c.birthday.day)}`, "monthDay") : "—"),
    [org],
  );

  const columns = useMemo<ColumnDef<AudienceClient, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "fullName",
        header: t("common.name"),
        cell: ({ row }) => <span className="font-medium">{row.original.fullName}</span>,
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: t("common.phone"),
        cell: ({ row }) => (
          <span dir="ltr" className="tabular">
            {row.original.phone || "—"}
          </span>
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: t("common.email"),
        cell: ({ row }) => row.original.email || <span className="text-muted-foreground">—</span>,
      },
      ...(selected === "birthdays"
        ? [
            {
              id: "birthday",
              accessorFn: (c) => (c.birthday ? c.birthday.month * 100 + c.birthday.day : 0),
              header: t("marketing.columns.birthday"),
              cell: ({ row }) => <span className="tabular">{birthday(row.original)}</span>,
            } satisfies ColumnDef<AudienceClient, unknown>,
          ]
        : []),
      {
        id: "lastVisit",
        accessorFn: (c) => c.lastVisitAt ?? "",
        header: t("marketing.columns.lastVisit"),
        cell: ({ row }) => (
          <span className="tabular">{row.original.lastVisitAt ? org.date(row.original.lastVisitAt) : t("marketing.never")}</span>
        ),
      },
      { id: "visits", accessorKey: "visits", header: t("marketing.columns.visits"), meta: { align: "end" } },
      {
        id: "spend",
        accessorKey: "totalSpendMinor",
        header: t("marketing.columns.totalSpend"),
        meta: { align: "end" },
        cell: ({ row }) => org.money(row.original.totalSpendMinor),
      },
      {
        id: "consent",
        accessorFn: (c) => (c.marketingConsent ? 1 : 0),
        header: t("marketing.columns.consent"),
        cell: ({ row }) =>
          row.original.marketingConsent ? (
            <Badge variant="success">
              <CheckIcon />
              {t("common.yes")}
            </Badge>
          ) : (
            <Badge variant="neutral">{t("common.no")}</Badge>
          ),
      },
    ],
    [t, org, selected, birthday],
  );

  const initialSort =
    selected === "topSpenders"
      ? [{ id: "spend", desc: true }]
      : selected === "birthdays"
        ? [{ id: "birthday", desc: false }]
        : selected === "newClients"
          ? [{ id: "name", desc: false }]
          : [{ id: "lastVisit", desc: true }];

  return (
    <PageContainer>
      <PageHeader title={t("marketing.title")} description={t("marketing.description")} />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-info" />
        <p>{t("marketing.noSending")}</p>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 content-start gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="tablist" aria-label={t("marketing.audiences")}>
            {audiences.map((a) => {
              const Icon = ICONS[a.key];
              const count = a.clients.filter((c) => !consentOnly || c.marketingConsent).length;
              const active = a.key === selected;
              return (
                <button
                  key={a.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelected(a.key)}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border bg-card p-4 text-start shadow-sm outline-none transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring",
                    active && "border-primary ring-1 ring-primary",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground",
                        active && "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="text-2xl font-semibold tabular">
                      {count}
                      {a.capped ? "+" : ""}
                    </span>
                  </span>
                  <span className="text-sm font-medium leading-tight">
                    {t(`marketing.audience.${a.key}.title`, { month: monthName })}
                  </span>
                  <span className="text-[13px] leading-snug text-muted-foreground">
                    {t(`marketing.audience.${a.key}.hint`, { days: lapsedDays, count: a.limit })}
                  </span>
                </button>
              );
            })}
          </div>

          {audience ? (
            <DataTable
              facets={NO_FACETS}
              key={selected}
              data={rows}
              columns={columns}
              getRowId={(c) => c.id}
              searchText={searchText}
              searchPlaceholder={t("marketing.searchPlaceholder")}
              initialSort={initialSort}
              toolbar={
                <label className="flex items-center gap-2 text-[13px] font-medium">
                  <Switch checked={consentOnly} onCheckedChange={setConsentOnly} />
                  <span className="hidden sm:inline">{t("marketing.consentOnly")}</span>
                  <span className="sm:hidden">{t("marketing.consentShort")}</span>
                </label>
              }
              csv={{
                filename: `audience-${selected}-${today}`,
                columns: [
                  { header: t("common.firstName"), value: (c) => c.fullName.split(" ")[0] ?? "" },
                  { header: t("common.name"), value: (c) => c.fullName },
                  { header: t("common.phone"), value: (c) => c.phone },
                  { header: t("common.email"), value: (c) => c.email },
                  {
                    header: t("marketing.columns.birthday"),
                    value: (c) => (c.birthday ? `${pad(c.birthday.month)}-${pad(c.birthday.day)}` : ""),
                  },
                  {
                    header: t("marketing.columns.lastVisit"),
                    value: (c) => (c.lastVisitAt ? dateKeyOf(new Date(c.lastVisitAt), org.timezone) : ""),
                  },
                  { header: t("marketing.columns.visits"), value: (c) => c.visits },
                  { header: t("marketing.columns.totalSpend"), value: (c) => csvMoney(c.totalSpendMinor) },
                  {
                    header: t("marketing.columns.consent"),
                    value: (c) => (c.marketingConsent ? t("common.yes") : t("common.no")),
                  },
                ],
              }}
              mobileCard={(c) => (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.fullName}</div>
                    <div className="text-[13px] text-muted-foreground tabular" dir="ltr">
                      {c.phone || c.email || "—"}
                    </div>
                  </div>
                  <div className="text-end text-[13px] text-muted-foreground">
                    {selected === "birthdays" ? (
                      birthday(c)
                    ) : selected === "topSpenders" ? (
                      <span className="font-medium text-foreground tabular">{org.money(c.totalSpendMinor)}</span>
                    ) : c.lastVisitAt ? (
                      org.date(c.lastVisitAt)
                    ) : (
                      t("marketing.never")
                    )}
                  </div>
                </div>
              )}
              empty={
                <EmptyState
                  compact
                  icon={UsersIcon}
                  title={t("marketing.empty")}
                  description={
                    consentOnly && audience.clients.length > 0 ? t("marketing.emptyConsent") : t("marketing.emptyHint")
                  }
                  action={
                    consentOnly && audience.clients.length > 0 ? (
                      <Button variant="outline" size="sm" onClick={() => setConsentOnly(false)}>
                        {t("marketing.showAll")}
                      </Button>
                    ) : org.can("create_customers") ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/clients">{t("marketing.goToClients")}</Link>
                      </Button>
                    ) : null
                  }
                />
              }
              footer={
                audience.capped ? (
                  <p className="border-t px-4 py-2 text-[13px] text-[color-mix(in_oklch,var(--warning)_70%,var(--foreground))]">
                    {t("marketing.capped", { limit: audience.limit })}
                  </p>
                ) : null
              }
            />
          ) : null}
          <p className="text-[13px] text-muted-foreground">{t("marketing.capNote", { limit: audiences[0]?.limit ?? 0 })}</p>
        </div>

        <DiscountSummary discounts={discounts} today={today} />
      </div>
    </PageContainer>
  );
}
