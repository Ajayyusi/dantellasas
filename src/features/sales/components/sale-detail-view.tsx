"use client";

import {
  BanIcon,
  BanknoteIcon,
  CalendarIcon,
  ChevronLeftIcon,
  CreditCardIcon,
  GiftIcon,
  LandmarkIcon,
  PackageIcon,
  PrinterIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  StickyNoteIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { BrandEmblem } from "@/components/brand-mark";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageContainer, SectionCard } from "@/components/common/page-header";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/client";
import { formatPercent } from "@/lib/money";
import type { PaymentMethodType } from "@/lib/settings";
import type { TransactionDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { voidTransactionAction } from "../actions";
import { AddPaymentDialog } from "./add-payment-dialog";
import { RefundDialog } from "./refund-dialog";
import { TransactionStatusBadge } from "./transaction-status";
import { useMethodLabel } from "./use-method-label";

const METHOD_ICONS: Record<PaymentMethodType, LucideIcon> = {
  cash: BanknoteIcon,
  card: CreditCardIcon,
  bank_transfer: LandmarkIcon,
  gift_card: GiftIcon,
  package: PackageIcon,
  other: WalletIcon,
};

function Row({ label, value, tone }: { label: string; value: string; tone?: "muted" | "accent" | "danger" }) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        tone === "muted" && "text-muted-foreground",
        tone === "accent" && "text-primary",
        tone === "danger" && "font-semibold text-destructive",
      )}
    >
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

/** Label above a short fact in the invoice header ("Invoice no.", "Date"…). */
function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid min-w-0 gap-1", className)}>
      <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-[15px] font-medium">{children}</dd>
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
  const methodOf = (id: string) => org.settings.payments.methods.find((x) => x.id === id);
  const labelFor = (id: string, fallback: string) => {
    const m = methodOf(id);
    return m ? methodLabel(m) : fallback;
  };

  const canRefund = org.can("refund_sales") && ["paid", "partially_paid", "partially_refunded"].includes(tx.status) && tx.paidMinor > tx.refundedMinor;
  const canVoid = org.can("refund_sales") && tx.paidMinor === 0 && tx.status !== "void";
  const canPay = org.can("create_sales") && tx.balanceMinor > 0 && tx.status !== "void";
  const showCommission = org.can("view_commissions");
  const tipStaff = tx.tipStaffId ? tx.items.find((i) => i.staffId === tx.tipStaffId)?.staffName : null;
  const business = org.settings.business;
  const businessName = business.displayName || org.orgName;
  const clientName = tx.clientName || t("pos.walkInSale");

  return (
    <PageContainer>
      <Link
        href="/sales"
        className="mb-4 inline-flex items-center gap-1 rounded-md text-[15px] font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeftIcon className="size-4 rtl-flip" />
        {t("sales.backToSales")}
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[34px] font-semibold leading-tight tabular sm:text-[38px]" dir="ltr">
              {tx.number}
            </h1>
            <TransactionStatusBadge status={tx.status} />
          </div>
          <p className="mt-1 text-[15px] text-muted-foreground">
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
            <Button onClick={() => setPayOpen(true)}>
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="relative min-w-0 overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div aria-hidden className="h-1.5 bg-[linear-gradient(90deg,var(--primary),var(--gold),var(--primary))]" />
          <header className="flex flex-col gap-5 border-b border-dashed px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
            <div className="flex min-w-0 items-center gap-3.5">
              {business.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- tenant logo from Storage, arbitrary size
                <img src={business.logoUrl} alt="" className="size-12 shrink-0 rounded-xl border object-contain" />
              ) : (
                <BrandEmblem className="size-12 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="truncate font-display text-[24px] font-semibold leading-tight" dir="auto">
                  {businessName}
                </p>
                <p className="truncate text-[14px] text-muted-foreground">
                  {[org.branchName(tx.branchId), business.trn ? t("sales.receipt.trn", { trn: business.trn }) : ""].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold-foreground sm:pt-2 sm:text-end">
              {org.settings.tax.enabled ? t("sales.taxInvoice") : t("sales.invoice")}
            </p>
          </header>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-4 sm:px-8">
            <Fact label={t("sales.receipt.invoiceNo")}>
              <span className="tabular" dir="ltr">
                {tx.number}
              </span>
            </Fact>
            <Fact label={t("sales.receipt.date")}>{org.date(tx.createdAt, "date")}</Fact>
            <Fact label={t("sales.receipt.client")} className="col-span-2">
              <span className="flex min-w-0 items-center gap-2">
                <PersonAvatar name={clientName} className="size-7 text-[11px]" />
                {tx.clientId && org.can("view_customers") ? (
                  <Link href={`/clients/${tx.clientId}`} className="truncate font-semibold text-primary hover:underline">
                    {clientName}
                  </Link>
                ) : (
                  <span className="truncate font-semibold">{clientName}</span>
                )}
              </span>
            </Fact>
          </dl>

          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sm:ps-8">{t("sales.receipt.item")}</TableHead>
                  <TableHead className="text-end">{t("sales.receipt.qty")}</TableHead>
                  <TableHead className="hidden text-end sm:table-cell">{t("sales.columns.vat")}</TableHead>
                  {showCommission ? <TableHead className="hidden text-end md:table-cell">{t("sales.commission")}</TableHead> : null}
                  <TableHead className="text-end sm:pe-8">{t("sales.receipt.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tx.items.map((i) => (
                  <TableRow key={i.id} className="hover:bg-transparent">
                    <TableCell className="sm:ps-8">
                      <div className="text-[15px] font-semibold">{i.name}</div>
                      <div className="text-[13px] text-muted-foreground">
                        {[
                          i.staffName ? t("sales.receipt.servedBy", { name: i.staffName }) : "",
                          i.discountMinor > 0 ? `${t("pos.discount")} −${org.money(i.discountMinor)}` : "",
                          i.type !== "service" && i.type !== "product"
                            ? t(`pos.tabs.${i.type === "gift_card" ? "giftCards" : i.type === "package" ? "packages" : "memberships"}`)
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-end tabular">{i.quantity}</TableCell>
                    <TableCell className="hidden text-end tabular text-muted-foreground sm:table-cell">
                      {org.money(i.taxMinor)}
                      <div className="text-[12px]">{formatPercent(i.taxRateBps / 10000, locale, 2)}</div>
                    </TableCell>
                    {showCommission ? <TableCell className="hidden text-end tabular text-muted-foreground md:table-cell">{org.money(i.commissionMinor)}</TableCell> : null}
                    <TableCell className="text-end text-[15px] font-semibold tabular sm:pe-8">{org.money(i.totalMinor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end border-t bg-[linear-gradient(180deg,color-mix(in_oklch,var(--champagne)_40%,var(--card)),var(--card))] px-5 py-5 sm:px-8">
            <dl className="grid w-full max-w-sm gap-2 text-[15px]">
              <Row label={t("pos.subtotal")} value={org.money(tx.subtotalMinor)} tone="muted" />
              {tx.discountMinor > 0 ? (
                <Row
                  label={tx.discountCode ? `${t("pos.discount")} (${tx.discountCode})` : t("pos.discount")}
                  value={`−${org.money(tx.discountMinor)}`}
                  tone="accent"
                />
              ) : null}
              <Row
                label={org.settings.tax.pricesIncludeTax ? t("pos.vatIncluded", { amount: "" }).trim() : t("pos.vat")}
                value={org.money(tx.taxMinor)}
                tone="muted"
              />
              {tx.tipMinor > 0 ? <Row label={tipStaff ? t("sales.tip", { name: tipStaff }) : t("pos.tip")} value={org.money(tx.tipMinor)} tone="muted" /> : null}
              <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-dashed pt-3">
                <dt className="text-base font-semibold">{t("pos.total")}</dt>
                <dd className="font-display text-[32px] font-semibold leading-none tabular">{org.money(tx.totalMinor + tx.tipMinor)}</dd>
              </div>
              {tx.paidMinor > 0 && tx.paidMinor !== tx.totalMinor + tx.tipMinor ? <Row label={t("pos.paid")} value={org.money(tx.paidMinor)} tone="muted" /> : null}
              {tx.refundedMinor > 0 ? <Row label={t("sales.summary.refunds")} value={`−${org.money(tx.refundedMinor)}`} tone="accent" /> : null}
              {tx.balanceMinor > 0 ? <Row label={t("sales.balanceDue")} value={org.money(tx.balanceMinor)} tone="danger" /> : null}
            </dl>
          </div>
        </article>

        <div className="grid min-w-0 grid-cols-1 content-start gap-5">
          <SectionCard title={t("sales.payments")} contentClassName="grid gap-2.5">
            {tx.payments.length === 0 ? <p className="text-[15px] text-muted-foreground">{t("sales.noPayments")}</p> : null}
            {tx.payments.map((p) => {
              const Icon = METHOD_ICONS[methodOf(p.methodId)?.type ?? "other"];
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-muted/45 px-3 py-2.5">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-xs">
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">{labelFor(p.methodId, p.label)}</div>
                    <div className="truncate text-[13px] text-muted-foreground">{[p.reference, org.date(p.at, "datetime")].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span className="text-[15px] font-semibold tabular">{org.money(p.amountMinor)}</span>
                </div>
              );
            })}
          </SectionCard>

          {tx.appointmentId ? (
            <Link
              href={`/appointments?date=${tx.dateKey}&appointment=${tx.appointmentId}`}
              className="hover-lift flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <CalendarIcon className="size-5" />
              </span>
              <span className="grid">
                <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("sales.appointment")}</span>
                <span className="text-[15px] font-semibold text-primary">{t("sales.viewAppointment")}</span>
              </span>
            </Link>
          ) : null}

          {tx.refunds.length ? (
            <SectionCard title={t("sales.refunds")} contentClassName="grid gap-2.5">
              {tx.refunds.map((r) => (
                <div key={r.id} className="flex items-start gap-3 rounded-xl border border-destructive/15 bg-destructive/5 p-3.5">
                  <ReceiptTextIcon className="mt-0.5 size-[18px] shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                      <span className="tabular" dir="ltr">
                        {r.number || t("sales.creditNote")}
                      </span>
                      <Badge variant="neutral">{r.methodLabel ? labelFor(r.methodId, r.methodLabel) : r.methodId}</Badge>
                    </div>
                    {r.reason ? <p className="text-[14px] text-muted-foreground">{r.reason}</p> : null}
                    <p className="text-[13px] text-muted-foreground">
                      {org.date(r.at, "datetime")} · {r.byName}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular text-destructive">−{org.money(r.amountMinor)}</span>
                </div>
              ))}
            </SectionCard>
          ) : null}

          {tx.notes ? (
            <SectionCard title={t("pos.notes")}>
              <p className="flex gap-2.5 whitespace-pre-wrap text-[15px] text-muted-foreground" dir="auto">
                <StickyNoteIcon className="mt-0.5 size-4 shrink-0 text-gold-foreground" />
                {tx.notes}
              </p>
            </SectionCard>
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
