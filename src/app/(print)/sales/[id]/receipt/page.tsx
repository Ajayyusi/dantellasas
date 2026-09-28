import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";

import { PrintButton } from "@/features/sales/components/print-button";
import { getTransaction } from "@/features/sales/queries";
import { formatDate } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney, formatPercent } from "@/lib/money";
import { hasAnyPermission } from "@/lib/permissions";
import { getAppContext } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Receipt" };

/**
 * Printable simplified tax invoice (fits 80 mm thermal paper and A4). Figures
 * come from the stored invoice, never recomputed.
 */
export default async function ReceiptPage({ params }: PageProps<"/sales/[id]/receipt">) {
  const ctx = await getAppContext();
  if (!hasAnyPermission(ctx.permissions, ["view_sales", "create_sales"])) forbidden();
  const { id } = await params;
  const tx = await getTransaction(ctx, id);
  if (!tx) notFound();
  const { t, locale } = await getI18n();
  const s = ctx.settings;
  const money = (minor: number) => formatMoney(minor, ctx.currency, locale);
  const branch = ctx.branches.find((b) => b.id === tx.branchId);
  const builtIn = { cash: "Cash", card: "Card", bank_transfer: "Bank transfer", gift_card: "Gift card", package: "Package credit" } as const;
  const methodName = (id: string, label: string) => {
    const key = id as keyof typeof builtIn;
    return builtIn[key] === label ? t(`pos.methodNames.${key}`) : label;
  };

  // VAT grouped by rate for the breakdown.
  const byRate = new Map<number, { net: number; tax: number }>();
  for (const i of tx.items) {
    const cur = byRate.get(i.taxRateBps) ?? { net: 0, tax: 0 };
    cur.tax += i.taxMinor;
    cur.net += i.totalMinor - (s.tax.pricesIncludeTax ? i.taxMinor : 0);
    byRate.set(i.taxRateBps, cur);
  }

  return (
    <main className="min-h-dvh bg-muted/40 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[380px] justify-end px-4">
        <PrintButton label={t("pos.printReceipt")} />
      </div>
      <article className="mx-auto max-w-[380px] bg-white px-6 py-7 text-[13px] leading-relaxed text-neutral-900 shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="text-center">
          {s.business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- tenant logo from Storage, printed as-is
            <img src={s.business.logoUrl} alt="" className="mx-auto mb-2 h-12 w-auto object-contain" />
          ) : null}
          <h1 className="text-base font-semibold">{s.business.displayName || ctx.org.name}</h1>
          {s.business.legalName ? <p>{s.business.legalName}</p> : null}
          {branch?.address || s.business.address ? <p className="text-neutral-600">{branch?.address || s.business.address}</p> : null}
          {branch?.phone || s.business.phone ? <p className="text-neutral-600" dir="ltr">{branch?.phone || s.business.phone}</p> : null}
          {s.business.trn ? <p className="mt-1 font-medium">{t("sales.receipt.trn", { trn: s.business.trn })}</p> : null}
          {s.receipts.header ? <p className="mt-2 whitespace-pre-wrap">{s.receipts.header}</p> : null}
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide">{t("sales.receipt.title")}</p>
        </header>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 border-y border-dashed border-neutral-300 py-2">
          <dt className="text-neutral-600">{t("sales.receipt.invoiceNo")}</dt>
          <dd className="text-end font-medium tabular">{tx.number}</dd>
          <dt className="text-neutral-600">{t("sales.receipt.date")}</dt>
          <dd className="text-end tabular">{formatDate(tx.createdAt, locale, ctx.timezone, "datetime")}</dd>
          <dt className="text-neutral-600">{t("sales.receipt.client")}</dt>
          <dd className="text-end">{tx.clientName || t("pos.walkInSale")}</dd>
          {tx.cashierName ? (
            <>
              <dt className="text-neutral-600">{t("sales.cashier")}</dt>
              <dd className="text-end">{tx.cashierName}</dd>
            </>
          ) : null}
        </dl>

        <table className="mt-2 w-full">
          <thead>
            <tr className="text-neutral-600">
              <th className="py-1 text-start font-normal">{t("sales.receipt.item")}</th>
              <th className="py-1 text-end font-normal">{t("sales.receipt.qty")}</th>
              <th className="py-1 text-end font-normal">{t("sales.receipt.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {tx.items.map((i) => (
              <tr key={i.id} className="align-top">
                <td className="py-1 pe-2">
                  {i.name}
                  {s.receipts.showStaffOnReceipt && i.staffName ? <div className="text-[11px] text-neutral-500">{t("sales.receipt.servedBy", { name: i.staffName })}</div> : null}
                </td>
                <td className="py-1 text-end tabular">{i.quantity}</td>
                <td className="py-1 text-end tabular">{money(i.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-2 grid gap-0.5 border-t border-dashed border-neutral-300 pt-2">
          <div className="flex justify-between">
            <dt>{t("pos.subtotal")}</dt>
            <dd className="tabular">{money(tx.subtotalMinor)}</dd>
          </div>
          {tx.discountMinor > 0 ? (
            <div className="flex justify-between">
              <dt>{t("pos.discount")}</dt>
              <dd className="tabular">−{money(tx.discountMinor)}</dd>
            </div>
          ) : null}
          {s.receipts.showTaxBreakdown
            ? [...byRate.entries()]
                .filter(([, v]) => v.tax > 0)
                .map(([rate, v]) => (
                  <div key={rate} className="flex justify-between text-neutral-600">
                    <dt>{t("sales.receipt.vatRate", { rate: formatPercent(rate / 10000, locale, 2) })}</dt>
                    <dd className="tabular">{money(v.tax)}</dd>
                  </div>
                ))
            : null}
          {tx.tipMinor > 0 ? (
            <div className="flex justify-between">
              <dt>{t("pos.tip")}</dt>
              <dd className="tabular">{money(tx.tipMinor)}</dd>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between border-t border-neutral-300 pt-1 text-base font-semibold">
            <dt>{t("pos.total")}</dt>
            <dd className="tabular">{money(tx.totalMinor + tx.tipMinor)}</dd>
          </div>
          {s.tax.pricesIncludeTax && tx.taxMinor > 0 ? (
            <p className="text-end text-[11px] text-neutral-500">{t("pos.vatIncluded", { amount: money(tx.taxMinor) })}</p>
          ) : null}
        </dl>

        <dl className="mt-2 grid gap-0.5 border-t border-dashed border-neutral-300 pt-2">
          {tx.payments.map((p) => (
            <div key={p.id} className="flex justify-between">
              <dt>{t("sales.receipt.paidBy", { method: methodName(p.methodId, p.label) })}</dt>
              <dd className="tabular">{money(p.amountMinor)}</dd>
            </div>
          ))}
          {tx.balanceMinor > 0 ? (
            <div className="flex justify-between font-medium">
              <dt>{t("sales.balanceDue")}</dt>
              <dd className="tabular">{money(tx.balanceMinor)}</dd>
            </div>
          ) : null}
          {tx.refunds.map((r) => (
            <div key={r.id} className="flex justify-between text-neutral-600">
              <dt>
                {t("sales.creditNote")} {r.number}
              </dt>
              <dd className="tabular">−{money(r.amountMinor)}</dd>
            </div>
          ))}
        </dl>

        <footer className="mt-5 text-center text-neutral-600">
          <p className="whitespace-pre-wrap">{s.receipts.footer || t("sales.receipt.thanks")}</p>
          {s.business.website ? <p dir="ltr">{s.business.website}</p> : null}
        </footer>
      </article>
    </main>
  );
}
