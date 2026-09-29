"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HistoryIcon, Loader2Icon, XIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { EmptyState } from "@/components/common/states";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import type { BranchDTO } from "@/lib/types";

import type { AuditEntryDTO } from "../types";
import { auditActionLabel, auditEntityLabel, auditGroup } from "./audit-labels";
import { SectionHeader } from "./form-parts";

export function AuditLogView({
  entries,
  range,
  limit,
  branches,
}: {
  entries: AuditEntryDTO[];
  range: { from: string; to: string };
  limit: number;
  branches: BranchDTO[];
}) {
  const { t, te } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  const branchName = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);
  const label = (e: AuditEntryDTO) => auditActionLabel(e.action, te);
  const when = (e: AuditEntryDTO) => org.date(e.at, "datetime");

  const groups = useMemo(() => [...new Set(entries.map((e) => auditGroup(e.action)))].sort(), [entries]);
  const users = useMemo(
    () => [...new Map(entries.map((e) => [e.actorUid, e.actorName || e.actorUid])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [entries],
  );

  function apply(next: { from: string; to: string }) {
    const params = new URLSearchParams();
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  const columns: ColumnDef<AuditEntryDTO, unknown>[] = [
    {
      id: "at",
      header: t("settings.audit.time"),
      accessorFn: (e) => e.at ?? "",
      cell: ({ row }) => (
        <span className="grid tabular text-muted-foreground">
          <span>{org.date(row.original.at, "date")}</span>
          <span className="text-xs">{org.date(row.original.at, "time")}</span>
        </span>
      ),
    },
    {
      id: "user",
      header: t("settings.audit.user"),
      accessorFn: (e) => e.actorName,
      cell: ({ getValue }) => <span className="block max-w-36 whitespace-normal">{String(getValue())}</span>,
    },
    {
      id: "action",
      header: t("settings.audit.action"),
      accessorFn: label,
      cell: ({ getValue }) => <span className="block max-w-44 font-medium whitespace-normal">{String(getValue())}</span>,
    },
    {
      id: "entity",
      header: t("settings.audit.entity"),
      accessorFn: (e) => auditEntityLabel(e.entity, te),
      cell: ({ getValue }) => <span className="block max-w-32 whitespace-normal text-muted-foreground">{String(getValue())}</span>,
    },
    {
      id: "summary",
      header: t("settings.audit.summary"),
      accessorFn: (e) => e.summary,
      enableSorting: false,
      cell: ({ getValue }) => <span className="line-clamp-2 block min-w-48 max-w-md break-words whitespace-normal text-muted-foreground" dir="auto">{String(getValue())}</span>,
    },
    {
      id: "branch",
      header: t("settings.audit.branch"),
      accessorFn: (e) => (e.branchId ? (branchName.get(e.branchId) ?? "—") : "—"),
    },
  ];

  return (
    <div className="grid gap-4">
      <SectionHeader title={t("settings.sections.audit.title")} description={t("settings.sections.audit.description")} />
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ from, to });
        }}
      >
        <Field label={t("settings.audit.from")} htmlFor="audit-from">
          <Input id="audit-from" type="date" dir="ltr" className="w-40" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t("settings.audit.to")} htmlFor="audit-to">
          <Input id="audit-to" type="date" dir="ltr" className="w-40" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Button type="submit" variant="outline" disabled={pending || (from === range.from && to === range.to)}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t("settings.audit.apply")}
        </Button>
        {range.from || range.to ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setFrom("");
              setTo("");
              apply({ from: "", to: "" });
            }}
          >
            <XIcon />
            {t("settings.audit.clear")}
          </Button>
        ) : null}
      </form>
      <DataTable
        data={entries}
        columns={columns}
        getRowId={(e) => e.id}
        initialSort={[{ id: "at", desc: true }]}
        pageSize={50}
        searchText={(e) => `${e.summary} ${e.actorName} ${label(e)}`}
        searchPlaceholder={t("settings.audit.searchPlaceholder")}
        facets={[
          {
            id: "group",
            label: t("settings.audit.group"),
            options: groups.map((g) => ({ value: g, label: auditEntityLabel(g, te) })),
            match: (e, v) => auditGroup(e.action) === v,
          },
          {
            id: "user",
            label: t("settings.audit.user"),
            options: users.map(([uid, name]) => ({ value: uid, label: name })),
            match: (e, v) => e.actorUid === v,
          },
        ]}
        csv={{
          filename: `audit-log-${range.from || "all"}${range.to ? `-${range.to}` : ""}`,
          columns: [
            { header: t("settings.audit.time"), value: (e) => e.at },
            { header: t("settings.audit.user"), value: (e) => e.actorName },
            { header: t("settings.audit.action"), value: label },
            { header: "action_key", value: (e) => e.action },
            { header: t("settings.audit.entity"), value: (e) => auditEntityLabel(e.entity, te) },
            { header: "entity_id", value: (e) => e.entityId },
            { header: t("settings.audit.summary"), value: (e) => e.summary },
            { header: t("settings.audit.branch"), value: (e) => (e.branchId ? (branchName.get(e.branchId) ?? e.branchId) : "") },
          ],
        }}
        mobileCard={(e) => (
          <div className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">{label(e)}</span>
              <span className="shrink-0 text-xs tabular text-muted-foreground">{when(e)}</span>
            </div>
            {e.summary ? <p className="line-clamp-2 text-[14px] text-muted-foreground" dir="auto">{e.summary}</p> : null}
            <p className="text-xs text-muted-foreground">
              {e.actorName}
              {e.branchId && branchName.get(e.branchId) ? ` · ${branchName.get(e.branchId)}` : ""}
            </p>
          </div>
        )}
        empty={<EmptyState compact icon={HistoryIcon} title={t("settings.audit.empty")} description={t("settings.audit.emptyHint")} />}
      />
      {entries.length >= limit ? <p className="text-[14px] text-muted-foreground">{t("settings.audit.limitNote", { count: limit })}</p> : null}
    </div>
  );
}
