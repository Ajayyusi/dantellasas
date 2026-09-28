"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BadgePercentIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/states";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/client";
import { formatPercent } from "@/lib/money";
import type { DiscountDTO } from "@/lib/types";

import { deleteDiscountAction, setDiscountActiveAction } from "../discount-actions";
import { discountState } from "../discount-state";
import { TabToolbar } from "./catalog-view";
import { DiscountFormSheet } from "./discount-form-sheet";

/** Stable empty facets: DataTable's default `[]` is re-created each render and re-triggers its filtering. */
const NO_FACETS: FacetFilter<DiscountDTO>[] = [];

export const DISCOUNT_STATE_VARIANT = {
  live: "success",
  inactive: "neutral",
  scheduled: "info",
  ended: "warning",
  limit: "warning",
} as const;

function DiscountRowMenu({
  discount: d,
  onEdit,
  onDelete,
}: {
  discount: DiscountDTO;
  onEdit: (d: DiscountDTO) => void;
  onDelete: (d: DiscountDTO) => void;
}) {
  const { t, te } = useI18n();
  const setActive = async (active: boolean) => {
    const res = await setDiscountActiveAction({ id: d.id, active });
    if (res.ok) toast.success(active ? t("catalog.discounts.activated") : t("catalog.discounts.deactivated"));
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
        <DropdownMenuItem onSelect={() => onEdit(d)}>
          <PencilIcon />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setActive(!d.active)}>
          <PowerIcon />
          {d.active ? t("catalog.deactivate") : t("catalog.activate")}
        </DropdownMenuItem>
        {d.usedCount === 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => onDelete(d)}>
              <Trash2Icon />
              {t("common.delete")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DiscountsTab({ discounts, today }: { discounts: DiscountDTO[]; today: string }) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const [sheet, setSheet] = useState<{ open: boolean; discount: DiscountDTO | null }>({ open: false, discount: null });
  const [deleting, setDeleting] = useState<DiscountDTO | null>(null);

  const helpers = useMemo(() => {
    const valueOf = (d: DiscountDTO) =>
      d.kind === "percent" ? formatPercent(d.valueBps / 10000, locale, 2) : org.money(d.valueMinor);
    const period = (d: DiscountDTO) => {
      if (d.startsAt && d.endsAt) return `${org.dateKey(d.startsAt)} – ${org.dateKey(d.endsAt)}`;
      if (d.startsAt) return t("catalog.discounts.fromDate", { date: org.dateKey(d.startsAt) });
      if (d.endsAt) return t("catalog.discounts.untilDate", { date: org.dateKey(d.endsAt) });
      return t("catalog.discounts.always");
    };
    const usage = (d: DiscountDTO) =>
      d.maxUses !== null
        ? t("catalog.discounts.usageOf", { used: d.usedCount, max: d.maxUses })
        : t("catalog.discounts.usage", { used: d.usedCount });
    return { valueOf, period, usage };
  }, [t, org, locale]);
  const { valueOf } = helpers;

  const columns = useMemo<ColumnDef<DiscountDTO, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("common.name"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "code",
        accessorKey: "code",
        header: t("catalog.discounts.code"),
        cell: ({ row }) =>
          row.original.code ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] tracking-wide" dir="ltr">
              {row.original.code}
            </span>
          ) : (
            <span className="text-muted-foreground">{t("catalog.discounts.noCode")}</span>
          ),
      },
      {
        id: "value",
        accessorFn: (d) => (d.kind === "percent" ? d.valueBps : d.valueMinor),
        header: t("catalog.discounts.value"),
        meta: { align: "end" },
        cell: ({ row }) => <span className="font-medium">{helpers.valueOf(row.original)}</span>,
      },
      {
        id: "appliesTo",
        accessorKey: "appliesTo",
        header: t("catalog.discounts.appliesTo"),
        cell: ({ row }) => t(`catalog.discounts.applies.${row.original.appliesTo}`),
      },
      {
        id: "period",
        accessorFn: (d) => d.startsAt ?? "",
        header: t("catalog.discounts.period"),
        cell: ({ row }) => <span className="tabular text-[13px]">{helpers.period(row.original)}</span>,
      },
      {
        id: "usage",
        accessorKey: "usedCount",
        header: t("catalog.discounts.used"),
        meta: { align: "end" },
        cell: ({ row }) => helpers.usage(row.original),
      },
      {
        id: "status",
        accessorFn: (d) => discountState(d, today),
        header: t("common.status"),
        cell: ({ row }) => {
          const s = discountState(row.original, today);
          return <Badge variant={DISCOUNT_STATE_VARIANT[s]}>{t(`catalog.discounts.states.${s}`)}</Badge>;
        },
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: "",
        cell: ({ row }) => (
          <DiscountRowMenu discount={row.original} onEdit={(d) => setSheet({ open: true, discount: d })} onDelete={setDeleting} />
        ),
      },
    ],
    [t, today, helpers],
  );
  const searchText = useCallback((d: DiscountDTO) => `${d.name} ${d.code}`, []);

  const add = (
    <Button onClick={() => setSheet({ open: true, discount: null })}>
      <PlusIcon />
      {t("catalog.discounts.add")}
    </Button>
  );

  return (
    <>
      <TabToolbar description={t("catalog.discounts.description")} actions={discounts.length > 0 ? add : null} />
      {discounts.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={BadgePercentIcon}
            title={t("catalog.discounts.empty")}
            description={t("catalog.discounts.emptyHint")}
            action={add}
          />
        </div>
      ) : (
        <DataTable
          facets={NO_FACETS}
          data={discounts}
          columns={columns}
          getRowId={(d) => d.id}
          searchText={searchText}
          searchPlaceholder={t("catalog.discounts.searchPlaceholder")}
          onRowClick={(d) => setSheet({ open: true, discount: d })}
          mobileCard={(d) => {
            const s = discountState(d, today);
            return (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{d.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                    {d.code ? (
                      <span className="font-mono" dir="ltr">
                        {d.code}
                      </span>
                    ) : null}
                    <span>
                      {d.maxUses !== null
                        ? t("catalog.discounts.usageOfLabel", { used: d.usedCount, max: d.maxUses })
                        : t("catalog.discounts.usageLabel", { used: d.usedCount })}
                    </span>
                  </div>
                </div>
                <div className="grid justify-items-end gap-1">
                  <span className="text-sm font-semibold tabular">{valueOf(d)}</span>
                  <Badge variant={DISCOUNT_STATE_VARIANT[s]}>{t(`catalog.discounts.states.${s}`)}</Badge>
                </div>
              </div>
            );
          }}
        />
      )}
      <DiscountFormSheet open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} discount={sheet.discount} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("catalog.discounts.delete")}
        description={deleting ? t("catalog.discounts.deleteConfirm", { name: deleting.name }) : undefined}
        destructive
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteDiscountAction({ id: deleting.id });
          if (res.ok) toast.success(t("common.deleted"));
          else toast.error(te(res.error));
        }}
      />
    </>
  );
}
