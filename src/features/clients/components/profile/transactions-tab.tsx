"use client";

import { ReceiptIcon, ReceiptTextIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";
import type { TransactionDTO } from "@/lib/types";

import { TransactionStatusBadge } from "../status-badges";

export function TransactionsTab({ transactions }: { transactions: TransactionDTO[] }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const multiBranch = org.branches.length > 1;

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border bg-card">
        <EmptyState icon={ReceiptIcon} title={t("clients.transactions.empty")} description={t("clients.transactions.emptyHint")} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <ul className="divide-y">
        {transactions.map((tx) => {
          const items = tx.items.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name));
          return (
            <li key={tx.id}>
              <Link
                href={`/sales/${tx.id}`}
                className="flex items-center gap-3.5 px-5 py-3.5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
              >
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <ReceiptTextIcon className="size-[18px]" />
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 text-[15px]">
                    <span className="font-semibold tabular" dir="ltr">
                      {tx.number || tx.id.slice(0, 8)}
                    </span>
                    <span className="text-muted-foreground">{org.date(tx.createdAt, "datetime")}</span>
                    {multiBranch ? <span className="text-[14px] text-muted-foreground">· {org.branchName(tx.branchId)}</span> : null}
                  </div>
                  <div className="truncate text-[14px] text-muted-foreground">
                    {items.length === 0
                      ? "—"
                      : items.map((name, i) => (
                          <span key={i}>
                            {i > 0 ? (locale === "ar" ? "، " : ", ") : null}
                            <bdi>{name}</bdi>
                          </span>
                        ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[15px] font-semibold tabular">{org.money(tx.totalMinor)}</span>
                  <TransactionStatusBadge status={tx.status} />
                  {tx.balanceMinor > 0 ? (
                    <span className="text-[13px] font-medium text-destructive">{t("clients.transactions.balance", { amount: org.money(tx.balanceMinor) })}</span>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
