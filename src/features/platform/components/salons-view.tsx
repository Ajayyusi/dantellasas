"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BuildingIcon, KeyRoundIcon, MoreHorizontalIcon, PauseCircleIcon, PlayCircleIcon, PlusIcon, SparklesIcon, StoreIcon, UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { DataTable } from "@/components/data-table/data-table";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SetupLinkResult } from "@/features/settings/member-actions";
import { SetupLinkDialog } from "@/features/settings/components/setup-link-dialog";
import { dateKeyOf } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatDate, formatRelative } from "@/lib/i18n/format";
import { formatNumber } from "@/lib/money";

import { ownerSetupLinkAction, setSalonStatusAction, type CreatedSalon } from "../actions";
import type { SalonRow } from "../types";
import { CreateSalonSheet } from "./create-salon-sheet";

/** Admin dates read in the platform's home timezone. */
const TZ = "Asia/Dubai";

export function SalonsView({ salons, allowDemo, now }: { salons: SalonRow[]; allowDemo: boolean; now: number }) {
  const { t, tp, te, locale } = useI18n();
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<SetupLinkResult | null>(null);
  const [confirm, setConfirm] = useState<SalonRow | null>(null);

  const stats = useMemo(() => {
    const month = dateKeyOf(now, TZ).slice(0, 7);
    return {
      total: salons.length,
      active: salons.filter((s) => s.status === "active").length,
      suspended: salons.filter((s) => s.status === "suspended").length,
      newThisMonth: salons.filter((s) => s.createdAt && dateKeyOf(new Date(s.createdAt), TZ).startsWith(month)).length,
      clients: salons.reduce((sum, s) => sum + s.clients, 0),
    };
  }, [salons, now]);

  const date = (value: string | null) => (value ? formatDate(value, locale, TZ, "date") : "—");
  const plan = (s: SalonRow) =>
    s.plan === "trial"
      ? s.trialEndsAt
        ? t("platform.salons.plans.trialEnds", { date: date(s.trialEndsAt) })
        : t("platform.salons.plans.trial")
      : s.plan.charAt(0).toUpperCase() + s.plan.slice(1);

  async function setStatus(s: SalonRow, status: "active" | "suspended") {
    const res = await setSalonStatusAction({ orgId: s.id, status });
    if (res.ok) toast.success(t(status === "active" ? "platform.salons.reactivated" : "platform.salons.suspended", { name: s.name }));
    else toast.error(te(res.error));
  }
  async function ownerLink(s: SalonRow) {
    const res = await ownerSetupLinkAction({ orgId: s.id });
    if (res.ok) setLink(res.data);
    else toast.error(te(res.error));
  }
  function created(salon: CreatedSalon) {
    toast.success(t("platform.create.created", { name: salon.name }));
    setLink(salon);
  }

  const statusBadge = (s: SalonRow) => (
    <Badge variant={s.status === "active" ? "success" : "warning"}>{t(`platform.salons.statuses.${s.status}`)}</Badge>
  );
  const salonCell = (s: SalonRow) => (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <StoreIcon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <div className="truncate font-semibold" dir="auto">
          {s.name}
        </div>
        <div className="truncate text-[13px] text-muted-foreground">{tp("platform.salons.branchesCount", s.branches)}</div>
      </div>
    </div>
  );
  const ownerCell = (s: SalonRow) =>
    s.owner ? (
      <div className="flex min-w-0 items-center gap-2.5">
        <PersonAvatar name={s.owner.name || s.owner.email} className="size-8 text-[12px]" />
        <div className="min-w-0">
          <div className="truncate font-medium">{s.owner.name || s.owner.email}</div>
          <div className="truncate text-[13px] text-muted-foreground" dir="ltr">
            {s.owner.email}
          </div>
        </div>
      </div>
    ) : (
      <span className="text-muted-foreground">{t("platform.salons.noOwner")}</span>
    );

  const menu = (s: SalonRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem disabled={!s.owner} onSelect={() => ownerLink(s)}>
          <KeyRoundIcon />
          {t("platform.salons.ownerLink")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {s.status === "suspended" ? (
          <DropdownMenuItem onSelect={() => setStatus(s, "active")}>
            <PlayCircleIcon />
            {t("platform.salons.reactivate")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem destructive onSelect={() => setConfirm(s)}>
            <PauseCircleIcon />
            {t("platform.salons.suspend")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: ColumnDef<SalonRow, unknown>[] = [
    { id: "salon", header: t("platform.salons.columns.salon"), accessorFn: (s) => s.name, cell: ({ row }) => salonCell(row.original), enableHiding: false },
    { id: "owner", header: t("platform.salons.columns.owner"), accessorFn: (s) => s.owner?.email ?? "", cell: ({ row }) => ownerCell(row.original) },
    {
      id: "team",
      header: t("platform.salons.columns.team"),
      accessorFn: (s) => s.staff,
      cell: ({ row }) => (
        <div className="grid text-[14px]">
          <span>{tp("platform.salons.staffCount", row.original.staff)}</span>
          <span className="text-[13px] text-muted-foreground">{tp("platform.salons.loginsCount", row.original.members)}</span>
        </div>
      ),
    },
    {
      id: "clients",
      header: t("platform.salons.columns.clients"),
      accessorFn: (s) => s.clients,
      cell: ({ getValue }) => <span className="tabular">{formatNumber(Number(getValue()), locale)}</span>,
    },
    {
      id: "activity",
      header: t("platform.salons.columns.activity"),
      accessorFn: (s) => s.lastActivityAt ?? "",
      cell: ({ row }) =>
        row.original.lastActivityAt ? (
          <span title={formatDate(row.original.lastActivityAt, locale, TZ, "datetime")}>{formatRelative(row.original.lastActivityAt, locale, now)}</span>
        ) : (
          <span className="text-muted-foreground">{t("platform.salons.noActivity")}</span>
        ),
    },
    { id: "created", header: t("platform.salons.columns.created"), accessorFn: (s) => s.createdAt ?? "", cell: ({ row }) => date(row.original.createdAt) },
    { id: "plan", header: t("platform.salons.columns.plan"), accessorFn: plan, cell: ({ row }) => <span className="text-muted-foreground">{plan(row.original)}</span> },
    { id: "status", header: t("platform.salons.columns.status"), accessorFn: (s) => s.status, cell: ({ row }) => statusBadge(row.original) },
    { id: "actions", header: "", enableSorting: false, enableHiding: false, cell: ({ row }) => <div className="text-end">{menu(row.original)}</div> },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t("platform.title")}
        title={t("platform.salons.title")}
        description={t("platform.salons.description")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            {t("platform.salons.add")}
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={StoreIcon} label={t("platform.salons.stats.total")} value={formatNumber(stats.total, locale)} />
        <StatCard icon={BuildingIcon} label={t("platform.salons.stats.active")} value={formatNumber(stats.active, locale)} hint={stats.suspended ? `${t("platform.salons.stats.suspended")}: ${formatNumber(stats.suspended, locale)}` : undefined} />
        <StatCard icon={SparklesIcon} label={t("platform.salons.stats.newThisMonth")} value={formatNumber(stats.newThisMonth, locale)} />
        <StatCard icon={UsersIcon} label={t("platform.salons.stats.clients")} value={formatNumber(stats.clients, locale)} />
      </div>

      <DataTable
        data={salons}
        columns={columns}
        getRowId={(s) => s.id}
        searchText={(s) => `${s.name} ${s.owner?.name ?? ""} ${s.owner?.email ?? ""}`}
        searchPlaceholder={t("platform.salons.search")}
        initialVisibility={{ plan: false }}
        facets={[
          {
            id: "status",
            label: t("platform.salons.columns.status"),
            options: (["active", "suspended"] as const).map((s) => ({ value: s, label: t(`platform.salons.statuses.${s}`) })),
            match: (s, v) => s.status === v,
          },
        ]}
        mobileCard={(s) => (
          <div className="grid min-w-0 grid-cols-1 gap-2.5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="min-w-0 flex-1">{salonCell(s)}</div>
              <div className="flex shrink-0 items-center gap-1">
                {statusBadge(s)}
                {menu(s)}
              </div>
            </div>
            <div className="text-[14px]">{ownerCell(s)}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
              <span>{tp("platform.salons.staffCount", s.staff)}</span>
              <span>{t("platform.salons.columns.clients")}: {formatNumber(s.clients, locale)}</span>
              <span>{s.lastActivityAt ? formatRelative(s.lastActivityAt, locale, now) : t("platform.salons.noActivity")}</span>
            </div>
          </div>
        )}
        empty={
          <EmptyState
            compact
            icon={StoreIcon}
            title={t("platform.salons.empty")}
            description={t("platform.salons.emptyHint")}
            action={<Button onClick={() => setCreating(true)}>{t("platform.salons.add")}</Button>}
          />
        }
      />

      <CreateSalonSheet open={creating} onOpenChange={setCreating} allowDemo={allowDemo} onCreated={created} />
      <SetupLinkDialog result={link} onOpenChange={(o) => !o && setLink(null)} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? t("platform.salons.suspendTitle", { name: confirm.name }) : ""}
        description={t("platform.salons.suspendBody")}
        destructive
        confirmLabel={t("platform.salons.suspend")}
        onConfirm={async () => {
          if (confirm) await setStatus(confirm, "suspended");
        }}
      />
    </>
  );
}
