"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  HandIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PackagePlusIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  SlidersHorizontalIcon,
  Undo2Icon,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
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
import { localName } from "@/lib/localize";
import type { ProductCategoryDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { setProductActiveAction } from "../actions";
import { stockIn, stockStatus, type ProductRow, type StockOperation, type StockStatus } from "../types";
import { StockStatusBadge } from "./stock-badge";

const STATUSES: StockStatus[] = ["in_stock", "low", "out", "untracked"];
/** Products are hidden by default: the SKU sits under the product name instead. */
const HIDDEN_COLUMNS = { sku: false };
const THUMB_TONES = ["#a8406a", "#8a5a0b", "#2f7a55", "#3f5f99", "#6a4c96", "#9a4b34", "#5f595c", "#2e6b73"];

/** Monogram tile standing in for a product photo, tinted per category. */
function ProductThumb({ product, locale }: { product: ProductRow; locale: string }) {
  const key = product.categoryId || product.brand || product.id;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const tone = THUMB_TONES[h % THUMB_TONES.length]!;
  const letter = (product.brand || localName(product, locale)).trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-xl font-display text-[16px] font-bold"
      style={{
        backgroundColor: `color-mix(in oklch, ${tone} 11%, var(--card))`,
        color: `color-mix(in oklch, ${tone} 85%, var(--foreground))`,
      }}
    >
      {letter}
    </span>
  );
}

export function ProductsTab({
  products,
  categories,
  onOpen,
  onNew,
  onOperation,
}: {
  products: ProductRow[];
  categories: ProductCategoryDTO[];
  onOpen: (product: ProductRow) => void;
  onNew: () => void;
  onOperation: (product: ProductRow | null, op: StockOperation) => void;
}) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const branchIds = useMemo(() => org.branches.map((b) => b.id), [org.branches]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const categoryLabel = (p: ProductRow) => {
    const c = categoryById.get(p.categoryId);
    return c ? localName(c, locale) : "";
  };
  const qtyOf = (p: ProductRow) => stockIn(p, org.branchId, branchIds);
  const statusOf = (p: ProductRow) => stockStatus(p, org.branchId, branchIds);

  async function toggleActive(p: ProductRow) {
    const res = await setProductActiveAction({ id: p.id, active: !p.active });
    if (res.ok) toast.success(p.active ? t("inventory.productDeactivated") : t("inventory.productActivated"));
    else toast.error(te(res.error));
  }

  const columns: ColumnDef<ProductRow, unknown>[] = [
    {
      id: "sku",
      header: `${t("inventory.sku")} / ${t("inventory.barcode")}`,
      accessorFn: (p) => p.sku || p.barcode,
      cell: ({ row }) => (
        <div className="font-mono text-xs leading-5 text-muted-foreground" dir="ltr">
          <p className="text-foreground">{row.original.sku || "—"}</p>
          {row.original.barcode ? <p>{row.original.barcode}</p> : null}
        </div>
      ),
    },
    {
      id: "name",
      header: t("inventory.product"),
      accessorFn: (p) => localName(p, locale),
      cell: ({ row }) => (
        <div className={cn("flex min-w-56 items-center gap-3", !row.original.active && "opacity-60")}>
          <ProductThumb product={row.original} locale={locale} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{localName(row.original, locale)}</p>
            <p className="truncate text-[13px] text-muted-foreground">
              {[row.original.brand, row.original.usage !== "retail" ? t(`inventory.usages.${row.original.usage}`) : ""].filter(Boolean).join(" · ") || "—"}
              {row.original.sku ? (
                <span className="ms-2 font-mono text-[12px]" dir="ltr">
                  {row.original.sku}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: t("common.category"),
      accessorFn: (p) => categoryLabel(p),
      cell: ({ getValue }) => (getValue() ? String(getValue()) : <span className="text-muted-foreground">—</span>),
    },
    {
      id: "cost",
      header: t("inventory.cost"),
      accessorFn: (p) => p.costMinor,
      meta: { align: "end" },
      cell: ({ row }) => <span className="text-muted-foreground">{org.money(row.original.costMinor)}</span>,
    },
    {
      id: "price",
      header: t("common.price"),
      accessorFn: (p) => p.priceMinor,
      meta: { align: "end" },
      cell: ({ row }) => <span className="font-medium">{org.money(row.original.priceMinor)}</span>,
    },
    {
      id: "stock",
      header: t("inventory.stock"),
      accessorFn: (p) => (p.trackStock ? qtyOf(p) : Number.NEGATIVE_INFINITY),
      meta: { align: "end" },
      cell: ({ row }) => {
        const p = row.original;
        if (!p.trackStock) return <span className="text-[13px] text-muted-foreground">{t("inventory.status.untracked")}</span>;
        const status = statusOf(p);
        return (
          <span className="inline-flex items-center justify-end gap-2">
            <StockStatusBadge status={status} />
            <span className={cn("font-semibold", status === "out" && "text-destructive")} dir="ltr">
              {qtyOf(p)}
            </span>
          </span>
        );
      },
    },
    {
      id: "status",
      header: t("common.status"),
      accessorFn: (p) => (p.active ? 1 : 0),
      cell: ({ row }) =>
        row.original.active ? <Badge variant="success">{t("common.active")}</Badge> : <Badge variant="neutral">{t("common.inactive")}</Badge>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">{t("common.actions")}</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <RowMenu product={row.original} onOpen={onOpen} onOperation={onOperation} onToggleActive={toggleActive} />
        </div>
      ),
    },
  ];

  const facets: FacetFilter<ProductRow>[] = [
    {
      id: "category",
      label: t("common.category"),
      options: [
        ...categories.filter((c) => products.some((p) => p.categoryId === c.id)).map((c) => ({ value: c.id, label: localName(c, locale) })),
        ...(products.some((p) => !categoryById.has(p.categoryId)) ? [{ value: "__none", label: t("inventory.uncategorized") }] : []),
      ],
      match: (p, v) => (v === "__none" ? !categoryById.has(p.categoryId) : p.categoryId === v),
    },
    {
      id: "stock",
      label: t("inventory.stockStatus"),
      options: STATUSES.map((s) => ({ value: s, label: t(`inventory.status.${s}`) })),
      match: (p, v) => statusOf(p) === v,
    },
    {
      id: "active",
      label: t("common.status"),
      options: [
        { value: "active", label: t("common.active") },
        { value: "inactive", label: t("common.inactive") },
      ],
      match: (p, v) => (v === "active" ? p.active : !p.active),
    },
  ];

  const needing = products.filter((p) => p.active && (statusOf(p) === "low" || statusOf(p) === "out"));
  const outCount = needing.filter((p) => statusOf(p) === "out").length;

  return (
    <>
      {needing.length > 0 ? (
        <div
          role="status"
          className="mb-4 flex animate-fade-up flex-col gap-3 rounded-2xl border border-warning/35 bg-[color-mix(in_oklch,var(--warning)_8%,var(--card))] px-5 py-4 sm:flex-row sm:items-center"
        >
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-[color-mix(in_oklch,var(--warning)_75%,var(--foreground))]"
          >
            <AlertTriangleIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">
              {needing.length === 1 ? t("inventory.restock.titleOne") : t("inventory.restock.title", { count: needing.length })}
            </p>
            <p className="truncate text-[14px] text-muted-foreground">
              {[
                needing.length - outCount > 0 ? t("inventory.restock.low", { count: needing.length - outCount }) : "",
                outCount > 0 ? t("inventory.restock.out", { count: outCount }) : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              {" · "}
              {needing
                .slice(0, 3)
                .map((p) => localName(p, locale))
                .join(locale === "ar" ? "، " : ", ")}
              {needing.length > 3 ? ` ${t("inventory.restock.andMore", { count: needing.length - 3 })}` : ""}
            </p>
          </div>
          <Button variant="outline" className="shrink-0" onClick={() => onOperation(null, "receive")}>
            <PackagePlusIcon />
            {t("inventory.receiveStock")}
          </Button>
        </div>
      ) : null}
      <DataTable
        data={products}
        columns={columns}
        initialVisibility={HIDDEN_COLUMNS}
        getRowId={(p) => p.id}
        searchText={(p) => `${p.name} ${p.nameAr} ${p.brand} ${p.sku} ${p.barcode}`}
        searchPlaceholder={t("inventory.searchProducts")}
        facets={facets}
        initialSort={[{ id: "name", desc: false }]}
        onRowClick={onOpen}
        csv={
          org.can("export_data")
            ? {
                filename: "products",
                columns: [
                  { header: t("inventory.sku"), value: (p) => p.sku },
                  { header: t("inventory.barcode"), value: (p) => p.barcode },
                  { header: t("inventory.productName"), value: (p) => p.name },
                  { header: t("common.nameAr"), value: (p) => p.nameAr },
                  { header: t("inventory.brand"), value: (p) => p.brand },
                  { header: t("common.category"), value: (p) => categoryLabel(p) },
                  { header: t("inventory.usage"), value: (p) => t(`inventory.usages.${p.usage}`) },
                  { header: t("inventory.cost"), value: (p) => csvMoney(p.costMinor) },
                  { header: t("common.price"), value: (p) => csvMoney(p.priceMinor) },
                  ...org.branches.map((b) => ({ header: `${t("inventory.stock")} · ${b.name}`, value: (p: ProductRow) => p.stock[b.id] ?? 0 })),
                  { header: t("inventory.minStock"), value: (p) => p.minStock },
                  { header: t("inventory.stockStatus"), value: (p) => t(`inventory.status.${statusOf(p)}`) },
                  { header: t("common.status"), value: (p) => (p.active ? t("common.active") : t("common.inactive")) },
                ],
              }
            : undefined
        }
        mobileCard={(p) => (
          <div className={cn("flex items-center gap-3", !p.active && "opacity-60")}>
            <ProductThumb product={p} locale={locale} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{localName(p, locale)}</p>
              <p className="truncate text-[14px] text-muted-foreground">
                {[p.brand, p.sku].filter(Boolean).join(" · ") || categoryLabel(p) || "—"}
              </p>
            </div>
            <div className="shrink-0 text-end">
              <p className="text-[15px] font-semibold tabular">{org.money(p.priceMinor)}</p>
              <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[13px]">
                <StockStatusBadge status={statusOf(p)} />
                {p.trackStock ? (
                  <span className="tabular text-muted-foreground">{t("inventory.inStockCount", { qty: qtyOf(p) })}</span>
                ) : (
                  <span className="text-muted-foreground">{t("inventory.status.untracked")}</span>
                )}
              </div>
            </div>
          </div>
        )}
        empty={
          <EmptyState
            icon={PackageIcon}
            title={t("inventory.emptyProducts")}
            description={t("inventory.emptyProductsHint")}
            action={
              <Button onClick={onNew}>
                <PlusIcon />
                {t("inventory.addProduct")}
              </Button>
            }
          />
        }
      />
    </>
  );
}

function RowMenu({
  product,
  onOpen,
  onOperation,
  onToggleActive,
}: {
  product: ProductRow;
  onOpen: (p: ProductRow) => void;
  onOperation: (p: ProductRow, op: StockOperation) => void;
  onToggleActive: (p: ProductRow) => void;
}) {
  const { t } = useI18n();
  const org = useOrg();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onOpen(product)}>
          <PencilIcon />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onOperation(product, "receive")}>
          <PackagePlusIcon />
          {t("inventory.ops.receive.label")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOperation(product, "adjust")}>
          <SlidersHorizontalIcon />
          {t("inventory.ops.adjust.label")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOperation(product, "internal_use")}>
          <HandIcon />
          {t("inventory.ops.internal_use.label")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOperation(product, "return")}>
          <Undo2Icon />
          {t("inventory.ops.return.label")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={org.branches.length < 2} onSelect={() => onOperation(product, "transfer")}>
          <ArrowLeftRightIcon />
          {t("inventory.ops.transfer.label")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onToggleActive(product)}>
          <PowerIcon />
          {product.active ? t("inventory.deactivate") : t("inventory.activate")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
