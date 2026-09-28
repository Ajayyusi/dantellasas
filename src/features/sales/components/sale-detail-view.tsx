"use client";

import { ArrowLeftIcon, BanIcon, CalendarIcon, PrinterIcon, ReceiptTextIcon, RotateCcwIcon, UserIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageContainer } from "@/components/common/page-header";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/client";
import { formatPercent } from "@/lib/money";
import type { TransactionDTO } from "@/lib/types";

import { voidTransactionAction } from "../actions";
import { AddPaymentDialog } from "./add-payment-dialog";
import { RefundDialog } from "./refund-dialog";
import { TransactionStatusBadge } from "./transaction-status";
import { useMethodLabel } from "./use-method-label";

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={strong ? "flex justify-between border-t pt-2 text-base font-semibold" : muted ? "flex justify-between text-muted-foreground" : "flex justify-between"}>
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

export function SaleDetailView({ tx }: { tx: TransactionDTO }) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const methodLabel = useMethodLabel();
  const [refundOpen, setRefundOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const labelFor = (id: string, fallback: string) => {
    const m = org.settings.payments.methods.find((x) => x.id === id);
    return m ? methodLabel(m) : fallback;
  };

  const canRefund = org.can("refund_sales") && ["paid", "partially_paid", "partially_refunded"].includes(tx.status) && tx.paidMinor > tx.refundedMinor;
  const canVoid = org.can("refund_sales") && tx.paidMinor === 0 && tx.status !== "void";
  const canPay = org.can("create_sales") && tx.balanceMinor > 0 && tx.status !== "void";
  const showCommission = org.can("view_commissions");
  const tipStaff = tx.tipStaffId ? tx.items.find((i) => i.staffId === tx.tipStaffId)?.staffName : null;

  return (
    <PageContainer>
      <Link href="/sales" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5 rtl-flip" />
        {t("sales.backToSales")}
      </Link>
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight tabular">{tx.number}</h1>
            <TransactionStatusBadge status={tx.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {org.date(tx.createdAt, "datetime")} · {org.branchName(tx.branchId)}
            {tx.cashierName ? ` · ${t("sales.issuedBy", { name: tx.cashierName })}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`/sales/${tx.id}/receipt`} target="_blank" rel="noopener">
              <PrinterIcon />
              {t("pos.printReceipt")}
            </a>
          </Button>
          {canPay ? (
            <Button variant="outline" onClick={() => setPayOpen(true)}>
              <WalletIcon />
              {t("sales.recordPayment")}
            </Button>
          ) : null}
          {canVoid ? (
            <Button variant="outline" onClick={() => setVoidOpen(true)}>
              <BanIcon />
              {t("sales.voidSale")}
            </Button>
          ) : null}
          {canRefund ? (
            <Button variant="outline" onClick={() => setRefundOpen(true)}>
              <RotateCcwIcon />
              {t("sales.refund")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("sales.items")}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-5">{t("sales.receipt.item")}</TableHead>
                      <TableHead className="text-end">{t("sales.receipt.qty")}</TableHead>
                      <TableHead className="text-end">{t("sales.columns.vat")}</TableHead>
                      {showCommission ? <TableHead className="text-end">{t("sales.commission")}</TableHead> : null}
                      <TableHead className="pe-5 text-end">{t("sales.receipt.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tx.items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="ps-5">
                          <div className="font-medium">{i.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[i.staffName, i.discountMinor > 0 ? `${t("pos.discount")} −${org.money(i.discountMinor)}` : "", i.type !== "service" && i.type !== "product" ? t(`pos.tabs.${i.type === "gift_card" ? "giftCards" : i.type === "package" ? "packages" : "memberships"}`) : ""]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </TableCell>
                        <TableCell className="text-end tabular">{i.quantity}</TableCell>
                        <TableCell className="text-end tabular text-muted-foreground">
                          {org.money(i.taxMinor)}
                          <div className="text-[11px]">{formatPercent(i.taxRateBps / 10000, locale, 2)}</div>
                        </TableCell>
                        {showCommission ? <TableCell className="text-end tabular text-muted-foreground">{org.money(i.commissionMinor)}</TableCell> : null}
                        <TableCell className="pe-5 text-end font-medium tabular">{org.money(i.totalMinor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <dl className="grid gap-1.5 px-5 pt-3 pb-3 text-sm">
                <Row label={t("pos.subtotal")} value={org.money(tx.subtotalMinor)} muted />
                {tx.discountMinor > 0 ? <Row label={tx.discountCode ? `${t("pos.discount")} (${tx.discountCode})` : t("pos.discount")} value={`−${org.money(tx.discountMinor)}`} muted /> : null}
                <Row label={org.settings.tax.pricesIncludeTax ? t("pos.vatIncluded", { amount: "" }).trim() : t("pos.vat")} value={org.money(tx.taxMinor)} muted />
                {tx.tipMinor > 0 ? <Row label={tipStaff ? t("sales.tip", { name: tipStaff }) : t("pos.tip")} value={org.money(tx.tipMinor)} muted /> : null}
                <Row label={t("pos.total")} value={org.money(tx.totalMinor + tx.tipMinor)} strong />
                {tx.refundedMinor > 0 ? <Row label={t("sales.summary.refunds")} value={`−${org.money(tx.refundedMinor)}`} /> : null}
                {tx.balanceMinor > 0 ? <Row label={t("sales.balanceDue")} value={org.money(tx.balanceMinor)} /> : null}
              </dl>
            </CardContent>
          </Card>

          {tx.refunds.length ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("sales.refunds")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {tx.refunds.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <ReceiptTextIcon className="mt-0.5 size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span className="tabular">{r.number || t("sales.creditNote")}</span>
                        <Badge variant="neutral">{r.methodLabel ? labelFor(r.methodId, r.methodLabel) : r.methodId}</Badge>
                      </div>
                      <p className="text-[13px] text-muted-foreground">{r.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {org.date(r.at, "datetime")} · {r.byName}
                      </p>
                    </div>
                    <span className="font-semibold tabular">−{org.money(r.amountMinor)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("sales.columns.client")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="size-4 text-muted-foreground" />
                {tx.clientId && org.can("view_customers") ? (
                  <Link href={`/clients/${tx.clientId}`} className="font-medium hover:underline">
                    {tx.clientName}
                  </Link>
                ) : (
                  <span className="font-medium">{tx.clientName || t("pos.walkInSale")}</span>
                )}
              </div>
              {tx.appointmentId ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="size-4" />
                  <Link href={`/appointments?date=${tx.dateKey}&appointment=${tx.appointmentId}`} className="hover:text-foreground hover:underline">
                    {t("sales.viewAppointment")}
                  </Link>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("sales.payments")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {tx.payments.length === 0 ? <p className="text-muted-foreground">{t("sales.noPayments")}</p> : null}
              {tx.payments.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{labelFor(p.methodId, p.label)}</div>
                    <div className="truncate text-xs text-muted-foreground">{[p.reference, org.date(p.at, "datetime")].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span className="tabular">{org.money(p.amountMinor)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {tx.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("pos.notes")}</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{tx.notes}</CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <RefundDialog tx={tx} open={refundOpen} onOpenChange={setRefundOpen} />
      <AddPaymentDialog tx={tx} open={payOpen} onOpenChange={setPayOpen} />
      <ConfirmDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title={t("sales.voidTitle")}
        description={t("sales.voidBody")}
        confirmLabel={t("sales.voidSale")}
        destructive
        onConfirm={async () => {
          const res = await voidTransactionAction({ id: tx.id });
          if (!res.ok) return toast.error(te(res.error, res.vars));
          toast.success(t("sales.voided"));
          router.refresh();
        }}
      />
    </PageContainer>
  );
}
