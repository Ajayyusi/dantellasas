"use client";

import { ArrowLeftRightIcon, HandIcon, PackagePlusIcon, SlidersHorizontalIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { productHistoryAction } from "../actions";
import type { MovementRow, ProductRow, StockOperation } from "../types";
import { MovementTypeBadge, SignedQty } from "./stock-badge";

/** Per-branch balances, quick stock actions and the latest ledger entries of one product. */
export function ProductStockPanel({ product, onOperation }: { product: ProductRow; onOperation: (op: StockOperation) => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const [history, setHistory] = useState<MovementRow[] | null>(null);
  const stockSignature = JSON.stringify(product.stock);

  useEffect(() => {
    let active = true;
    productHistoryAction({ productId: product.id }).then((res) => {
      if (active) setHistory(res.ok ? res.data : []);
    });
    return () => {
      active = false;
    };
  }, [product.id, stockSignature]);

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <h3 className="text-sm font-semibold">{t("inventory.stockByBranch")}</h3>
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-2">
          {org.branches.map((b) => {
            const qty = product.stock[b.id] ?? 0;
            const low = product.trackStock && qty <= product.minStock;
            return (
              <li key={b.id} className={cn("flex items-center justify-between rounded-lg border px-3 py-2", low && "border-warning/50 bg-warning/5")}>
                <span className="truncate text-sm">{b.name}</span>
                <span className={cn("text-lg font-semibold tabular", qty <= 0 && product.trackStock && "text-destructive")} dir="ltr">
                  {qty}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onOperation("receive")}>
            <PackagePlusIcon />
            {t("inventory.ops.receive.label")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onOperation("adjust")}>
            <SlidersHorizontalIcon />
            {t("inventory.ops.adjust.label")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onOperation("internal_use")}>
            <HandIcon />
            {t("inventory.ops.internal_use.label")}
          </Button>
          {org.branches.length > 1 ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onOperation("transfer")}>
              <ArrowLeftRightIcon />
              {t("inventory.ops.transfer.label")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <h3 className="text-sm font-semibold">{t("inventory.recentMovements")}</h3>
        {history === null ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : history.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-[14px] text-muted-foreground">{t("inventory.noMovementsYet")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {history.slice(0, 10).map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-[14px]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MovementTypeBadge type={m.type} />
                    {org.branches.length > 1 ? <span className="truncate text-muted-foreground">{org.branchName(m.branchId)}</span> : null}
                  </div>
                  <p className="mt-0.5 truncate text-muted-foreground">
                    {org.date(m.createdAt, "datetime")}
                    {m.note ? ` · ${m.note}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-end tabular">
                  <SignedQty value={m.quantity} />
                  <p className="text-xs text-muted-foreground">{t("inventory.balanceShort", { qty: m.balanceAfter })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
