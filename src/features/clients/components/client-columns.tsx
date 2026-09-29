"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClockIcon } from "lucide-react";
import { useMemo } from "react";

import type { FacetFilter } from "@/components/data-table/data-table";
import { csvMoney, type CsvColumn } from "@/components/data-table/csv";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { dateKeyOf, timeOf } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatRelative } from "@/lib/i18n/format";
import type { ClientDTO } from "@/lib/types";

import { LAST_VISIT_BUCKETS } from "../types";
import { avatarColor, lastVisitBucket, upcomingAt } from "../utils";
import { ClientStatusBadge, TagList } from "./status-badges";

/** Columns, facets, CSV columns and the mobile card for the directory table. */
export function useClientTable(clients: ClientDTO[], now: number) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const askGender = org.settings.clients.askGender;

  const columns = useMemo<ColumnDef<ClientDTO, unknown>[]>(() => {
    const muted = (text: string) => <span className="text-muted-foreground">{text}</span>;
    return [
      {
        id: "name",
        header: t("clients.columns.name"),
        accessorFn: (c) => c.fullName.toLowerCase(),
        enableHiding: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex min-w-44 items-center gap-3">
              <PersonAvatar name={c.fullName} color={avatarColor(c.id)} className="size-10 text-[14px]" />
              <div className="min-w-0">
                <div className="truncate font-semibold">{c.fullName}</div>
                {c.phone ? (
                  <div className="truncate text-[14px] text-muted-foreground tabular rtl:text-right" dir="ltr">
                    {c.phone}
                  </div>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "email",
        header: t("clients.columns.email"),
        accessorFn: (c) => c.email,
        cell: ({ row }) =>
          row.original.email ? (
            <span className="block max-w-52 truncate text-muted-foreground rtl:text-right" dir="ltr">
              {row.original.email}
            </span>
          ) : (
            muted("—")
          ),
      },
      {
        id: "tags",
        header: t("clients.columns.tags"),
        enableSorting: false,
        cell: ({ row }) => <TagList tags={row.original.tags} max={2} />,
      },
      {
        id: "lastVisit",
        header: t("clients.columns.lastVisit"),
        accessorFn: (c) => (c.stats.lastVisitAt ? Date.parse(c.stats.lastVisitAt) : 0),
        cell: ({ row }) => {
          const iso = row.original.stats.lastVisitAt;
          return iso ? (
            <span title={org.date(iso, "date")} className="whitespace-nowrap">
              {formatRelative(iso, locale, now)}
            </span>
          ) : (
            muted(t("common.never"))
          );
        },
      },
      {
        id: "visits",
        header: t("clients.columns.visits"),
        accessorFn: (c) => c.stats.visits,
        meta: { align: "end" },
      },
      {
        id: "spend",
        header: t("clients.columns.spend"),
        accessorFn: (c) => c.stats.totalSpendMinor,
        meta: { align: "end" },
        cell: ({ row }) => <span className="whitespace-nowrap font-semibold">{org.money(row.original.stats.totalSpendMinor)}</span>,
      },
      {
        id: "nextAppointment",
        header: t("clients.columns.nextAppointment"),
        accessorFn: (c) => {
          const at = upcomingAt(c.stats.nextAppointmentAt, now);
          return at ? Date.parse(at) : Number.MAX_SAFE_INTEGER;
        },
        cell: ({ row }) => {
          const at = upcomingAt(row.original.stats.nextAppointmentAt, now);
          return at ? (
            <span className="grid whitespace-nowrap leading-tight">
              <span>{org.date(at, "weekdayDate")}</span>
              <span className="text-[14px] text-muted-foreground">{org.date(at, "time")}</span>
            </span>
          ) : (
            muted("—")
          );
        },
      },
      {
        id: "status",
        header: t("clients.columns.status"),
        accessorFn: (c) => c.status,
        cell: ({ row }) => <ClientStatusBadge status={row.original.status} />,
      },
    ];
  }, [t, org, locale, now]);

  const allTags = useMemo(
    () => [...new Set(clients.flatMap((c) => c.tags))].sort((a, b) => a.localeCompare(b, locale)),
    [clients, locale],
  );

  const facets = useMemo<FacetFilter<ClientDTO>[]>(() => {
    const list: FacetFilter<ClientDTO>[] = [];
    if (allTags.length > 0) {
      list.push({
        id: "tag",
        label: t("clients.facets.tag"),
        options: allTags.map((tag) => ({ value: tag, label: tag })),
        match: (c, v) => c.tags.includes(v),
      });
    }
    list.push({
      id: "lastVisit",
      label: t("clients.facets.lastVisit"),
      options: LAST_VISIT_BUCKETS.map((b) => ({ value: b, label: t(`clients.buckets.${b}`) })),
      match: (c, v) => lastVisitBucket(c, now) === v,
    });
    if (askGender) {
      list.push({
        id: "gender",
        label: t("clients.facets.gender"),
        options: (["female", "male", "other"] as const).map((g) => ({ value: g, label: t(`common.gender.${g}`) })),
        match: (c, v) => c.gender === v,
      });
    }
    return list;
  }, [allTags, askGender, t, now]);

  const csvColumns = useMemo<CsvColumn<ClientDTO>[]>(() => {
    // Business-time-zone dates, spreadsheet friendly (YYYY-MM-DD [HH:mm]).
    const csvDate = (iso: string | null, withTime = false) => {
      if (!iso) return "";
      const ms = Date.parse(iso);
      return withTime ? `${dateKeyOf(ms, org.timezone)} ${timeOf(ms, org.timezone)}` : dateKeyOf(ms, org.timezone);
    };
    return [
      { header: t("common.firstName"), value: (c) => c.firstName },
      { header: t("common.lastName"), value: (c) => c.lastName },
      { header: t("clients.columns.phone"), value: (c) => c.phone },
      { header: t("clients.columns.email"), value: (c) => c.email },
      { header: t("clients.columns.tags"), value: (c) => c.tags.join("; ") },
      { header: t("clients.columns.lastVisit"), value: (c) => csvDate(c.stats.lastVisitAt) },
      { header: t("clients.columns.visits"), value: (c) => c.stats.visits },
      { header: `${t("clients.columns.spend")} (${org.currency})`, value: (c) => csvMoney(c.stats.totalSpendMinor) },
      { header: t("clients.columns.nextAppointment"), value: (c) => csvDate(upcomingAt(c.stats.nextAppointmentAt, now), true) },
      {
        header: t("clients.columns.birthday"),
        value: (c) =>
          c.birthday
            ? [String(c.birthday.day).padStart(2, "0"), String(c.birthday.month).padStart(2, "0"), c.birthday.year].filter(Boolean).join("/")
            : "",
      },
      ...(askGender ? [{ header: t("clients.facets.gender"), value: (c: ClientDTO) => (c.gender ? t(`common.gender.${c.gender}`) : "") }] : []),
      { header: t("clients.form.nationality"), value: (c) => c.nationality },
      { header: t("clients.columns.source"), value: (c) => c.source },
      { header: t("clients.columns.consent"), value: (c) => (c.marketingConsent ? t("common.yes") : t("common.no")) },
      { header: t("clients.columns.createdAt"), value: (c) => csvDate(c.createdAt) },
      { header: t("clients.columns.status"), value: (c) => t(`clients.status.${c.status}`) },
    ];
  }, [t, org.currency, org.timezone, askGender, now]);

  const mobileCard = (c: ClientDTO) => {
    const next = upcomingAt(c.stats.nextAppointmentAt, now);
    return (
      <div className="flex items-start gap-3">
        <PersonAvatar name={c.fullName} color={avatarColor(c.id)} className="size-11 text-[15px]" />
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[15px] font-semibold">{c.fullName}</span>
            <span className="shrink-0 text-[15px] font-semibold tabular">{org.money(c.stats.totalSpendMinor)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[14px] text-muted-foreground">
            <span className="truncate tabular" dir="ltr">
              {c.phone || c.email || "—"}
            </span>
            <span className="shrink-0">
              {c.stats.lastVisitAt ? formatRelative(c.stats.lastVisitAt, locale, now) : t("common.never")}
            </span>
          </div>
          {next || c.tags.length > 0 || c.status === "archived" ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[14px]">
              {c.status === "archived" ? <ClientStatusBadge status={c.status} /> : null}
              {next ? (
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <CalendarClockIcon className="size-3.5" />
                  {org.date(next, "weekdayDate")} · {org.date(next, "time")}
                </span>
              ) : null}
              <TagList tags={c.tags} max={3} />
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return { columns, facets, csvColumns, mobileCard, allTags };
}
