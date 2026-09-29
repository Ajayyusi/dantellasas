"use client";

import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";
import { formatPercent, splitTax } from "@/lib/money";
import { defaultTaxRate, type OrgSettings } from "@/lib/settings";

/** A thermal-receipt style mock that reflects the receipt settings as you type. */
export function ReceiptPreview({ receipts }: { receipts: OrgSettings["receipts"] }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const { business, tax } = org.settings;
  const rate = defaultTaxRate(org.settings);
  const rateBps = rate?.rateBps ?? 0;
  const lines = [
    { name: t("settings.receipts.sampleService1"), staff: t("settings.receipts.sampleStaff1"), amount: 25_000 },
    { name: t("settings.receipts.sampleService2"), staff: t("settings.receipts.sampleStaff2"), amount: 12_000 },
  ];
  const split = lines.reduce(
    (acc, l) => {
      const s = splitTax(l.amount, rateBps, tax.pricesIncludeTax);
      return { net: acc.net + s.netMinor, tax: acc.tax + s.taxMinor, gross: acc.gross + s.grossMinor };
    },
    { net: 0, tax: 0, gross: 0 },
  );
  const showTax = tax.enabled && rateBps > 0;

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-lg border bg-white p-5 font-mono text-[13px] leading-relaxed text-neutral-900 shadow-sm dark:bg-neutral-50">
      <div className="text-center">
        <div className="text-[15px] font-bold">{business.displayName || org.orgName}</div>
        {business.address ? <div className="whitespace-pre-line text-neutral-600">{business.address}</div> : null}
        {business.phone ? <div className="text-neutral-600" dir="ltr">{business.phone}</div> : null}
        {showTax && business.trn ? (
          <div className="text-neutral-600">
            {tax.registrationLabel}: <span dir="ltr">{business.trn}</span>
          </div>
        ) : null}
        {receipts.header ? <div className="mt-1 whitespace-pre-line">{receipts.header}</div> : null}
      </div>
      <div className="my-3 border-t border-dashed border-neutral-400" />
      {showTax ? <div className="text-center font-bold uppercase">{t("settings.receipts.taxInvoice")}</div> : null}
      <div className="flex justify-between gap-2">
        <span>{t("settings.receipts.invoiceNo")}</span>
        <span dir="ltr">{receipts.invoicePrefix}000123</span>
      </div>
      <div className="flex justify-between gap-2">
        <span>{t("common.date")}</span>
        <span>{org.date(new Date(), "date")}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span>{t("common.client")}</span>
        <span className="truncate">{t("settings.receipts.sampleClient")}</span>
      </div>
      <div className="my-3 border-t border-dashed border-neutral-400" />
      <ul className="grid gap-1.5">
        {lines.map((l) => (
          <li key={l.name}>
            <div className="flex justify-between gap-2">
              <span className="min-w-0 truncate">{l.name}</span>
              <span className="tabular">{org.money(l.amount)}</span>
            </div>
            {receipts.showStaffOnReceipt ? <div className="text-neutral-500">— {l.staff}</div> : null}
          </li>
        ))}
      </ul>
      <div className="my-3 border-t border-dashed border-neutral-400" />
      {showTax && receipts.showTaxBreakdown ? (
        <>
          <div className="flex justify-between gap-2">
            <span>{t("settings.receipts.taxable")}</span>
            <span className="tabular">{org.money(split.net)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>
              {t("settings.receipts.vatAt", { label: rate?.name ?? t("common.tax"), rate: formatPercent(rateBps / 10_000, locale, 2) })}
            </span>
            <span className="tabular">{org.money(split.tax)}</span>
          </div>
        </>
      ) : null}
      <div className="flex justify-between gap-2 text-[14px] font-bold">
        <span>{t("common.total")}</span>
        <span className="tabular">{org.money(split.gross)}</span>
      </div>
      <div className="text-neutral-500">{t("settings.receipts.paidBy")}</div>
      {receipts.footer ? (
        <>
          <div className="my-3 border-t border-dashed border-neutral-400" />
          <div className="text-center whitespace-pre-line">{receipts.footer}</div>
        </>
      ) : null}
    </div>
  );
}
