"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { GiftIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dateKeyOf } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { GiftCardDTO } from "@/lib/types";

import { TabToolbar } from "./catalog-view";
import { GIFT_CARD_STATUS_VARIANT, GiftCardDetailSheet } from "./gift-card-detail-sheet";
import { GiftCardIssueSheet } from "./gift-card-issue-sheet";

const STATUSES = ["active", "redeemed", "expired", "void"] as const;
const compact = (s: string) => s.toLowerCase().replace(/[\s-]/g, "");
const searchText = (r: GiftCardDTO) =>
  `${r.code} ${r.code.replace(/-/g, " ")} ${compact(r.code)} ${r.recipientName} ${r.purchaserName} ${r.recipientEmail}`;

export function GiftCardsTab({ cards, limit }: { cards: GiftCardDTO[]; limit: number }) {
  const { t, tp } = useI18n();
  const org = useOrg();
  const [issueOpen, setIssueOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = cards.find((c) => c.id === selectedId) ?? null;

  const columns = useMemo<ColumnDef<GiftCardDTO, unknown>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: t("catalog.giftCards.code"),
        cell: ({ row }) => (
          <span className="font-mono text-[13px] font-medium tracking-wide" dir="ltr">
            {row.original.code}
          </span>
        ),
      },
      {
        id: "recipient",
        accessorFn: (r) => r.recipientName,
        header: t("catalog.giftCards.recipient"),
        cell: ({ row }) => row.original.recipientName || <span className="text-muted-foreground">—</span>,
      },
      {
        id: "purchaser",
        accessorFn: (r) => r.purchaserName,
        header: t("catalog.giftCards.purchaser"),
        cell: ({ row }) =>
          row.original.purchaserName || <span className="text-muted-foreground">{t("catalog.giftCards.complimentary")}</span>,
      },
      {
        id: "initial",
        accessorKey: "initialMinor",
        header: t("catalog.giftCards.initial"),
        meta: { align: "end" },
        cell: ({ row }) => org.money(row.original.initialMinor),
      },
      {
        id: "balance",
        accessorKey: "balanceMinor",
        header: t("catalog.giftCards.balance"),
        meta: { align: "end" },
        cell: ({ row }) => <span className="font-medium">{org.money(row.original.balanceMinor)}</span>,
      },
      {
        id: "issued",
        accessorFn: (r) => r.issuedAt ?? "",
        header: t("catalog.giftCards.issued"),
        cell: ({ row }) => <span className="tabular">{org.date(row.original.issuedAt)}</span>,
      },
      {
        id: "expires",
        accessorFn: (r) => r.expiresAt ?? "9999",
        header: t("catalog.giftCards.expires"),
        cell: ({ row }) =>
          row.original.expiresAt ? (
            <span className="tabular">{org.date(row.original.expiresAt)}</span>
          ) : (
            <span className="text-muted-foreground">{t("catalog.giftCards.never")}</span>
          ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: t("common.status"),
        cell: ({ row }) => (
          <Badge variant={GIFT_CARD_STATUS_VARIANT[row.original.status]}>
            {t(`catalog.giftCards.statuses.${row.original.status}`)}
          </Badge>
        ),
      },
    ],
    [t, org],
  );

  const facets = useMemo<FacetFilter<GiftCardDTO>[]>(
    () => [
      {
        id: "status",
        label: t("common.status"),
        options: STATUSES.map((s) => ({ value: s, label: t(`catalog.giftCards.statuses.${s}`) })),
        match: (row, v) => row.status === v,
      },
    ],
    [t],
  );

  const activeBalance = cards.filter((c) => c.status === "active").reduce((s, c) => s + c.balanceMinor, 0);
  const activeCount = cards.filter((c) => c.status === "active").length;

  const issue = (
    <Button onClick={() => setIssueOpen(true)}>
      <PlusIcon />
      {t("catalog.giftCards.issue")}
    </Button>
  );

  return (
    <>
      <TabToolbar
        description={
          cards.length > 0
            ? tp("catalog.giftCards.outstanding", activeCount, { amount: org.money(activeBalance) })
            : t("catalog.giftCards.description")
        }
        actions={issue}
      />
      <DataTable
        data={cards}
        columns={columns}
        getRowId={(r) => r.id}
        searchText={searchText}
        searchPlaceholder={t("catalog.giftCards.searchPlaceholder")}
        facets={facets}
        initialSort={[{ id: "issued", desc: true }]}
        onRowClick={(r) => setSelectedId(r.id)}
        csv={{
          filename: `gift-cards-${new Date().toISOString().slice(0, 10)}`,
          columns: [
            { header: t("catalog.giftCards.code"), value: (r) => r.code },
            { header: t("catalog.giftCards.recipientName"), value: (r) => r.recipientName },
            { header: t("catalog.giftCards.recipientEmail"), value: (r) => r.recipientEmail },
            { header: t("catalog.giftCards.purchaser"), value: (r) => r.purchaserName },
            { header: t("catalog.giftCards.initial"), value: (r) => csvMoney(r.initialMinor) },
            { header: t("catalog.giftCards.balance"), value: (r) => csvMoney(r.balanceMinor) },
            {
              header: t("catalog.giftCards.issued"),
              value: (r) => (r.issuedAt ? dateKeyOf(new Date(r.issuedAt), org.timezone) : ""),
            },
            {
              header: t("catalog.giftCards.expires"),
              value: (r) => (r.expiresAt ? dateKeyOf(new Date(r.expiresAt), org.timezone) : ""),
            },
            { header: t("common.status"), value: (r) => t(`catalog.giftCards.statuses.${r.status}`) },
            { header: t("catalog.giftCards.message"), value: (r) => r.message },
          ],
        }}
        mobileCard={(r) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-[13px] font-medium" dir="ltr">
                {r.code}
              </div>
              <div className="truncate text-[13px] text-muted-foreground">
                {r.recipientName || r.purchaserName || t("catalog.giftCards.complimentary")}
              </div>
            </div>
            <div className="grid justify-items-end gap-1">
              <span className="text-sm font-medium tabular">{org.money(r.balanceMinor)}</span>
              <Badge variant={GIFT_CARD_STATUS_VARIANT[r.status]}>{t(`catalog.giftCards.statuses.${r.status}`)}</Badge>
            </div>
          </div>
        )}
        empty={
          <EmptyState
            icon={GiftIcon}
            title={t("catalog.giftCards.empty")}
            description={t("catalog.giftCards.emptyHint")}
            action={issue}
          />
        }
        footer={
          cards.length >= limit ? (
            <p className="border-t px-4 py-2 text-[13px] text-muted-foreground">{t("catalog.giftCards.limitNote", { limit })}</p>
          ) : null
        }
      />
      <GiftCardIssueSheet open={issueOpen} onOpenChange={setIssueOpen} onIssued={setSelectedId} />
      <GiftCardDetailSheet card={selected} onOpenChange={(o) => !o && setSelectedId(null)} />
    </>
  );
}
