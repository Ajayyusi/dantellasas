"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon, ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { DateRangeFilter } from "@/components/common/date-range-filter";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import type { DateRange, RangePreset } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";
import type { TransactionDTO, TransactionStatus } from "@/lib/types";

import { summarizeSales } from "../summary";
import { TransactionStatusBadge } from "./transaction-status";
import { useMethodLabel } from "./use-method-label";

const STATUSES: TransactionStatus[] = ["paid", "partially_paid", "unpaid", "partially_refunded", "refunded", "void"];

function staffNames(tx: TransactionDTO): string {
  return [...new Set(tx.items.map((i) => i.staffName).filter(Boolean))].join(", ");
}

export function SalesView({ transactions, preset, range }: { transactions: TransactionDTO[]; preset: RangePreset; range: DateRange }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const methodLabel = useMethodLabel();
  const multiBranch = org.branches.length > 1 && !org.branchId;
  const methods = org.settings.payments.methods;
  const labelFor = useCallback(
    (id: string) => {
      const m = methods.find((x) => x.id === id);
      return m ? methodLabel(m) : id;
    },
    [methods, methodLabel],
  );
  const summary = useMemo(() => summarizeSales(transactions), [transactions]);

  const columns = useMemo<ColumnDef<TransactionDTO, unknown>[]>(() => {
    const cols: ColumnDef<TransactionDTO, unknown>[] = [
      {
        id: "invoice",
        header: t("sales.columns.invoice"),
        accessorFn: (r) => r.number,
        cell: ({ row }) => <span className="font-medium tabular">{row.original.number}</span>,
      },
      {
        id: "date",
        header: t("sales.columns.date"),
        accessorFn: (r) => r.createdAt ?? r.dateKey,
        cell: ({ row }) => <span className="whitespace-nowrap tabular text-muted-foreground">{org.date(row.original.createdAt, "datetime")}</span>,
      },
      {
        id: "client",
        header: t("sales.columns.client"),
        accessorFn: (r) => r.clientName,
        cell: ({ row }) => <span className="truncate">{row.original.clientName || t("pos.walkInSale")}</span>,
      },
      {
        id: "staff",
        header: t("sales.columns.staff"),
        accessorFn: staffNames,
        cell: ({ getValue }) => <span className="block max-w-48 truncate text-muted-foreground">{(getValue() as string) || "—"}</span>,
      },
    ];
    if (multiBranch) {
      cols.push({ id: "branch", header: t("sales.columns.branch"), accessorFn: (r) => org.branchName(r.branchId) });
    }
    cols.push(
      {
        id: "vat",
        header: t("sales.columns.vat"),
        accessorFn: (r) => r.taxMinor,
        cell: ({ row }) => <span className="tabular text-muted-foreground">{org.money(row.original.taxMinor)}</span>,
        meta: { align: "end" },
      },
      {
        id: "total",
        header: t("sales.columns.total"),
        accessorFn: (r) => r.totalMinor + r.tipMinor,
        cell: ({ row }) => <span className="font-medium tabular">{org.money(row.original.totalMinor + row.original.tipMinor)}</span>,
        meta: { align: "end" },
      },
      {
        id: "payment",
        header: t("sales.columns.payment"),
        accessorFn: (r) => r.paymentMethods.map(labelFor).join(", "),
        cell: ({ getValue }) => <span className="text-muted-foreground">{(getValue() as string) || "—"}</span>,
      },
      {
        id: "status",
        header: t("sales.columns.status"),
        accessorFn: (r) => r.status,
        cell: ({ row }) => <TransactionStatusBadge status={row.original.status} />,
      },
    );
    return cols;
  }, [t, org, multiBranch, labelFor]);

  const facets = useMemo<FacetFilter<TransactionDTO>[]>(() => {
    const f: FacetFilter<TransactionDTO>[] = [
      {
        id: "status",
        label: t("sales.columns.status"),
        options: STATUSES.filter((s) => transactions.some((x) => x.status === s)).map((s) => ({ value: s, label: t(`sales.status.${s}`) })),
        match: (r, v) => r.status === v,
      },
      {
        id: "method",
        label: t("sales.columns.payment"),
        options: methods.filter((m) => transactions.some((x) => x.paymentMethods.includes(m.id))).map((m) => ({ value: m.id, label: methodLabel(m) })),
        match: (r, v) => r.paymentMethods.includes(v),
      },
    ];
    if (multiBranch) {
      f.push({ id: "branch", label: t("sales.columns.branch"), options: org.branches.map((b) => ({ value: b.id, label: b.name })), match: (r, v) => r.branchId === v });
    }
    return f;
  }, [t, transactions, methods, methodLabel, multiBranch, org.branches]);

  const csvColumns = useMemo(
    () => [
      { header: t("sales.columns.invoice"), value: (r: TransactionDTO) => r.number },
      { header: t("sales.columns.date"), value: (r: TransactionDTO) => org.date(r.createdAt, "datetime") },
      { header: t("sales.columns.client"), value: (r: TransactionDTO) => r.clientName },
      { header: t("sales.columns.staff"), value: staffNames },
      { header: t("sales.columns.branch"), value: (r: TransactionDTO) => org.branchName(r.branchId) },
      { header: t("sales.columns.subtotal"), value: (r: TransactionDTO) => csvMoney(r.subtotalMinor) },
      { header: t("sales.columns.discount"), value: (r: TransactionDTO) => csvMoney(r.discountMinor) },
      { header: t("sales.columns.vat"), value: (r: TransactionDTO) => csvMoney(r.taxMinor) },
      { header: t("sales.columns.total"), value: (r: TransactionDTO) => csvMoney(r.totalMinor) },
      { header: t("pos.tip"), value: (r: TransactionDTO) => csvMoney(r.tipMinor) },
      { header: t("sales.summary.refunds"), value: (r: TransactionDTO) => csvMoney(r.refundedMinor) },
      { header: t("sales.balanceDue"), value: (r: TransactionDTO) => csvMoney(r.balanceMinor) },
      { header: t("sales.columns.payment"), value: (r: TransactionDTO) => r.paymentMethods.map(labelFor).join(" + ") },
      { header: t("sales.columns.status"), value: (r: TransactionDTO) => t(`sales.status.${r.status}`) },
    ],
    [t, org, labelFor],
  );

  return (
    <PageContainer wide>
      <PageHeader
        title={t("sales.title")}
        description={t("sales.description")}
        actions={
          org.can("create_sales") ? (
            <Button asChild>
              <Link href="/pos">
                <PlusIcon />
                {t("sales.newSale")}
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="mb-4">
        <DateRangeFilter preset={preset} range={range} />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("sales.summary.net")} value={org.money(summary.netMinor)} hint={t("sales.summary.countHint", { count: formatNumber(summary.count, locale) })} />
        <StatCard label={t("sales.summary.gross")} value={org.money(summary.grossMinor)} hint={summary.discountMinor ? t("sales.summary.discountHint", { amount: org.money(summary.discountMinor) }) : undefined} />
        <StatCard label={t("sales.summary.refunds")} value={org.money(summary.refundsMinor)} hint={summary.balanceMinor ? t("sales.summary.outstanding", { amount: org.money(summary.balanceMinor) }) : undefined} />
        <StatCard label={t("sales.summary.vat")} value={org.money(summary.vatMinor)} hint={summary.tipsMinor ? t("sales.summary.tipsHint", { amount: org.money(summary.tipsMinor) }) : undefined} />
      </div>
      <DataTable
        data={transactions}
        columns={columns}
        facets={facets}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.number} ${r.clientName} ${staffNames(r)}`}
        searchPlaceholder={t("sales.search")}
        onRowClick={(r) => router.push(`/sales/${r.id}`)}
        csv={org.can("export_data") ? { filename: `sales-${range.from}-${range.to}`, columns: csvColumns } : undefined}
        empty={<EmptyState icon={ReceiptIcon} title={t("sales.empty")} description={t("sales.emptyHint")} />}
        mobileCard={(r) => (
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium tabular">{r.number}</span>
              <span className="font-semibold tabular">{org.money(r.totalMinor + r.tipMinor)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
              <span className="truncate">{r.clientName || t("pos.walkInSale")} · {org.date(r.createdAt, "datetime")}</span>
              <TransactionStatusBadge status={r.status} />
            </div>
          </div>
        )}
      />
    </PageContainer>
  );
}
