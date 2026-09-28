"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HandCoinsIcon, LockIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/states";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { formatPercent } from "@/lib/money";
import type { CommissionRuleDTO } from "@/lib/types";

import { ruleSpecificity } from "../commission";
import { deleteCommissionRuleAction, setCommissionRuleActiveAction } from "../commission-actions";
import { TabToolbar } from "./catalog-view";
import { CommissionFormSheet, LEVEL_KEYS } from "./commission-form-sheet";
import type { CatalogService, CatalogStaff } from "./types";

/** Stable empty facets: DataTable's default `[]` is re-created each render and re-triggers its filtering. */
const NO_FACETS: FacetFilter<CommissionRuleDTO>[] = [];

const STEPS = ["staffService", "service", "staff", "staffDefault", "general"] as const;

function RuleRowMenu({
  rule,
  onEdit,
  onDelete,
}: {
  rule: CommissionRuleDTO;
  onEdit: (r: CommissionRuleDTO) => void;
  onDelete: (r: CommissionRuleDTO) => void;
}) {
  const { t, te } = useI18n();
  const setActive = async (active: boolean) => {
    const res = await setCommissionRuleActiveAction({ id: rule.id, active });
    if (res.ok) toast.success(t("catalog.commissions.saved"));
    else toast.error(te(res.error));
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => onEdit(rule)}>
          <PencilIcon />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setActive(!rule.active)}>
          <PowerIcon />
          {rule.active ? t("catalog.deactivate") : t("catalog.activate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => onDelete(rule)}>
          <Trash2Icon />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CommissionsTab({
  rules,
  staff,
  services,
  canEdit,
}: {
  rules: CommissionRuleDTO[];
  staff: CatalogStaff[];
  services: CatalogService[];
  canEdit: boolean;
}) {
  const { t, te, locale } = useI18n();
  const [sheet, setSheet] = useState<{ open: boolean; rule: CommissionRuleDTO | null }>({ open: false, rule: null });
  const [deleting, setDeleting] = useState<CommissionRuleDTO | null>(null);
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const pct = useCallback((bps: number) => formatPercent(bps / 10000, locale, 2), [locale]);
  const serviceName = useCallback(
    (id: string | null) => {
      if (!id) return null;
      const s = serviceById.get(id);
      return s ? localName(s, locale) : t("common.unknown");
    },
    [serviceById, locale, t],
  );

  const columns = useMemo<ColumnDef<CommissionRuleDTO, unknown>[]>(() => {
    const staffCell = (id: string | null) => {
      if (!id) return <span className="text-muted-foreground">{t("catalog.commissions.anyStaff")}</span>;
      const s = staffById.get(id);
      if (!s) return <span className="text-muted-foreground">{t("common.unknown")}</span>;
      return (
        <span className="flex items-center gap-2">
          <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-6 text-[10px]" />
          {s.displayName}
        </span>
      );
    };
    const cols: ColumnDef<CommissionRuleDTO, unknown>[] = [
      {
        id: "name",
        accessorKey: "name",
        header: t("common.name"),
        cell: ({ row }) => (
          <div className="grid gap-1">
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {row.original.name}
              {!row.original.active ? <Badge variant="neutral">{t("common.inactive")}</Badge> : null}
            </span>
            <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <Badge variant="outline">{t(`catalog.commissions.levels.${LEVEL_KEYS[ruleSpecificity(row.original)]}`)}</Badge>
              {t(`catalog.commissions.itemTypes.${row.original.itemType}`)}
            </span>
          </div>
        ),
      },
      {
        id: "staff",
        accessorFn: (r) => staffById.get(r.staffId ?? "")?.displayName ?? "",
        header: t("common.staff"),
        cell: ({ row }) => staffCell(row.original.staffId),
      },
      {
        id: "service",
        accessorFn: (r) => serviceName(r.serviceId) ?? "",
        header: t("common.service"),
        cell: ({ row }) =>
          serviceName(row.original.serviceId) ?? (
            <span className="text-muted-foreground">
              {row.original.itemType === "product" ? "—" : t("catalog.commissions.anyService")}
            </span>
          ),
      },
      {
        id: "rate",
        accessorKey: "rateBps",
        header: t("catalog.commissions.rate"),
        meta: { align: "end" },
        cell: ({ row }) => <span className="font-medium">{pct(row.original.rateBps)}</span>,
      },
      { id: "priority", accessorKey: "priority", header: t("catalog.commissions.priority"), meta: { align: "end" } },
    ];
    if (canEdit) {
      cols.push({
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: "",
        cell: ({ row }) => (
          <RuleRowMenu rule={row.original} onEdit={(r) => setSheet({ open: true, rule: r })} onDelete={setDeleting} />
        ),
      });
    }
    return cols;
  }, [t, staffById, serviceName, pct, canEdit]);
  const searchText = useCallback(
    (r: CommissionRuleDTO) => `${r.name} ${staffById.get(r.staffId ?? "")?.displayName ?? ""} ${serviceName(r.serviceId) ?? ""}`,
    [staffById, serviceName],
  );

  const add = canEdit ? (
    <Button onClick={() => setSheet({ open: true, rule: null })}>
      <PlusIcon />
      {t("catalog.commissions.add")}
    </Button>
  ) : null;
  const staffWithRates = staff.filter((s) => s.status !== "archived");

  return (
    <>
      <TabToolbar description={t("catalog.commissions.description")} actions={add} />
      {!canEdit ? (
        <p className="mb-4 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">
          <LockIcon className="size-4 shrink-0" />
          {t("catalog.commissions.readOnly")}
        </p>
      ) : null}
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {rules.length === 0 ? (
            <div className="rounded-xl border bg-card">
              <EmptyState
                icon={HandCoinsIcon}
                title={t("catalog.commissions.empty")}
                description={t("catalog.commissions.emptyHint")}
                action={add}
              />
            </div>
          ) : (
            <DataTable
              facets={NO_FACETS}
              data={rules}
              columns={columns}
              getRowId={(r) => r.id}
              searchText={searchText}
              onRowClick={canEdit ? (r) => setSheet({ open: true, rule: r }) : undefined}
              mobileCard={(r) => (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">
                      {t(`catalog.commissions.levels.${LEVEL_KEYS[ruleSpecificity(r)]}`)} ·{" "}
                      {t(`catalog.commissions.itemTypes.${r.itemType}`)}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular">{pct(r.rateBps)}</span>
                </div>
              )}
            />
          )}
        </div>
        <div className="grid content-start gap-5 lg:grid-cols-2 2xl:grid-cols-1">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t("catalog.commissions.precedenceTitle")}</CardTitle>
                <CardDescription className="mt-1">{t("catalog.commissions.precedenceHint")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-2 text-sm">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex items-start gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{t(`catalog.commissions.steps.${s}`)}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[13px] text-muted-foreground">{t("catalog.commissions.tieBreak")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t("catalog.commissions.staffDefaults")}</CardTitle>
                <CardDescription className="mt-1">{t("catalog.commissions.staffDefaultsHint")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {staffWithRates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("catalog.commissions.noStaff")}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[12px] uppercase text-muted-foreground">
                      <th className="pb-2 text-start font-medium">{t("common.staff")}</th>
                      <th className="pb-2 text-end font-medium">{t("common.services")}</th>
                      <th className="pb-2 text-end font-medium">{t("catalog.commissions.products")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {staffWithRates.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2">
                          <span className="flex items-center gap-2">
                            <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-6 text-[10px]" />
                            <span className="truncate">{s.displayName}</span>
                          </span>
                        </td>
                        <td className="py-2 text-end tabular">
                          {s.commission.serviceRateBps > 0 ? pct(s.commission.serviceRateBps) : "—"}
                        </td>
                        <td className="py-2 text-end tabular">
                          {s.commission.productRateBps > 0 ? pct(s.commission.productRateBps) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {canEdit ? (
        <>
          <CommissionFormSheet
            open={sheet.open}
            onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
            rule={sheet.rule}
            staff={staff}
            services={services}
          />
          <ConfirmDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={t("catalog.commissions.delete")}
            description={deleting ? t("catalog.commissions.deleteConfirm", { name: deleting.name }) : undefined}
            destructive
            confirmLabel={t("common.delete")}
            onConfirm={async () => {
              if (!deleting) return;
              const res = await deleteCommissionRuleAction({ id: deleting.id });
              if (res.ok) toast.success(t("common.deleted"));
              else toast.error(te(res.error));
            }}
          />
        </>
      ) : null}
    </>
  );
}
