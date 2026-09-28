"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HistoryIcon } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import type { DateRange, RangePreset } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { MovementType } from "@/lib/types";

import type { MovementRow } from "../types";
import { MovementTypeBadge, SignedQty } from "./stock-badge";

const TYPES: MovementType[] = ["purchase", "sale", "adjustment", "internal_use", "return", "transfer_in", "transfer_out"];

/** Stock ledger: every movement with its resulting balance. */
export function MovementsTab({ movements, preset, range }: { movements: MovementRow[]; preset: RangePreset; range: DateRange }) {
  const { t } = useI18n();
  const org = useOrg();
  // Branch column/filter only when several branches are in view ("All branches").
  const multiBranch = org.branches.length > 1 && !org.branchId;

  const columns: ColumnDef<MovementRow, unknown>[] = [
    {
      id: "date",
      header: t("common.date"),
      accessorFn: (m) => m.createdAt ?? "",
      cell: ({ row }) => <span className="whitespace-nowrap tabular">{org.date(row.original.createdAt, "datetime")}</span>,
    },
    {
      id: "product",
      header: t("inventory.product"),
      accessorFn: (m) => m.productName,
      cell: ({ row }) => (
        <span dir="auto" className="block max-w-52 truncate text-start font-medium" title={row.original.productName}>
          {row.original.productName}
        </span>
      ),
    },
    {
      id: "type",
      header: t("inventory.movementType"),
      accessorFn: (m) => m.type,
      cell: ({ row }) => <MovementTypeBadge type={row.original.type} />,
    },
    ...(multiBranch
      ? [{ id: "branch", header: t("common.branch"), accessorFn: (m: MovementRow) => org.branchName(m.branchId) } as ColumnDef<MovementRow, unknown>]
      : []),
    {
      id: "quantity",
      header: t("inventory.quantity"),
      accessorFn: (m) => m.quantity,
      meta: { align: "end" },
      cell: ({ row }) => <SignedQty value={row.original.quantity} />,
    },
    {
      id: "balance",
      header: t("inventory.balanceAfter"),
      accessorFn: (m) => m.balanceAfter,
      meta: { align: "end" },
      cell: ({ row }) => <span dir="ltr">{row.original.balanceAfter}</span>,
    },
    {
      id: "unitCost",
      header: t("inventory.unitCost"),
      accessorFn: (m) => m.unitCostMinor,
      meta: { align: "end" },
      cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.unitCostMinor)}</span>,
    },
    {
      id: "note",
      header: t("common.notes"),
      accessorFn: (m) => m.note,
      enableSorting: false,
      cell: ({ row }) => (
        <span dir="auto" className="block max-w-40 truncate text-start text-muted-foreground" title={row.original.note}>
          {row.original.note || (row.original.transactionId ? t("inventory.fromSale") : "—")}
        </span>
      ),
    },
    {
      id: "by",
      header: t("inventory.by"),
      accessorFn: (m) => m.createdByName,
      cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.createdByName || "—"}</span>,
    },
  ];

  const productOptions = [...new Map(movements.map((m) => [m.productId, m.productName])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const facets: FacetFilter<MovementRow>[] = [
    { id: "product", label: t("inventory.product"), options: productOptions, match: (m, v) => m.productId === v },
    {
      id: "type",
      label: t("inventory.movementType"),
      options: TYPES.map((type) => ({ value: type, label: t(`inventory.types.${type}`) })),
      match: (m, v) => m.type === v,
    },
    ...(multiBranch
      ? [
          {
            id: "branch",
            label: t("common.branch"),
            options: org.branches.map((b) => ({ value: b.id, label: b.name })),
            match: (m: MovementRow, v: string) => m.branchId === v,
          },
        ]
      : []),
  ];

  return (
    <div className="grid gap-4">
      <DateRangeFilter key={`${preset}-${range.from}-${range.to}`} preset={preset} range={range} />
      <DataTable
        data={movements}
        columns={columns}
        getRowId={(m) => m.id}
        searchText={(m) => `${m.productName} ${m.note} ${m.createdByName}`}
        searchPlaceholder={t("inventory.searchMovements")}
        facets={facets}
        pageSize={50}
        csv={
          org.can("export_data")
            ? {
                filename: `stock-movements-${range.from}-${range.to}`,
                columns: [
                  { header: t("common.date"), value: (m) => m.createdAt ?? "" },
                  { header: t("inventory.product"), value: (m) => m.productName },
                  { header: t("inventory.movementType"), value: (m) => t(`inventory.types.${m.type}`) },
                  { header: t("common.branch"), value: (m) => org.branchName(m.branchId) },
                  { header: t("inventory.quantity"), value: (m) => m.quantity },
                  { header: t("inventory.balanceAfter"), value: (m) => m.balanceAfter },
                  { header: t("inventory.unitCost"), value: (m) => csvMoney(m.unitCostMinor) },
                  { header: t("common.notes"), value: (m) => m.note },
                  { header: t("inventory.by"), value: (m) => m.createdByName },
                ],
              }
            : undefined
        }
        mobileCard={(m) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{m.productName}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted-foreground">
                <MovementTypeBadge type={m.type} />
                <span className="truncate">{org.date(m.createdAt, "datetime")}</span>
              </div>
              {m.note ? <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{m.note}</p> : null}
            </div>
            <div className="shrink-0 text-end tabular">
              <SignedQty value={m.quantity} />
              <p className="text-xs text-muted-foreground">{t("inventory.balanceShort", { qty: m.balanceAfter })}</p>
            </div>
          </div>
        )}
        empty={<EmptyState icon={HistoryIcon} title={t("inventory.emptyMovements")} description={t("inventory.emptyMovementsHint")} />}
      />
    </div>
  );
}
