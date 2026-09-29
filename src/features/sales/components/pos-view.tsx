"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ClientSelection } from "@/features/appointments/components/client-picker";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { clientWalletAction, createSaleAction } from "../actions";
import { settle } from "../payments";
import { priceSale } from "../pricing";
import { CatalogPanel, type CatalogPick } from "./catalog-panel";
import { GiftCardDialog } from "./gift-card-dialog";
import { PaymentPanel } from "./payment-panel";
import { giftCardLine, membershipLine, packageLine, productLine, serviceLine, toOrderDiscount, toPricingLine, toSaleDiscount, toSaleLines } from "./pos-lines";
import type { DiscountState, PosCatalog, PosLine, PosWallet, Tender } from "./pos-types";
import { SuccessPanel, type SaleResult } from "./success-panel";
import { TicketPanel } from "./ticket-panel";

export interface PosInitial {
  client: ClientSelection;
  wallet: PosWallet | null;
  lines: PosLine[];
  appointmentId: string | null;
  appointmentLabel: string | null;
}

const EMPTY: PosInitial = { client: null, wallet: null, lines: [], appointmentId: null, appointmentLabel: null };

export function PosView({ catalog, initial, branchId }: { catalog: PosCatalog; initial: PosInitial; branchId: string }) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const settings = org.settings;

  const [client, setClient] = useState<ClientSelection>(initial.client);
  const [wallet, setWallet] = useState<PosWallet | null>(initial.wallet);
  const [lines, setLines] = useState<PosLine[]>(initial.lines);
  const [appointment, setAppointment] = useState({ id: initial.appointmentId, label: initial.appointmentLabel });
  const [discount, setDiscount] = useState<DiscountState>({ kind: "none" });
  const [tip, setTip] = useState<{ amountMinor: number; staffId: string | null }>({ amountMinor: 0, staffId: null });
  const [mobileTab, setMobileTab] = useState<"catalog" | "ticket">(initial.lines.length ? "ticket" : "catalog");
  const [giftOpen, setGiftOpen] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [allowBalance, setAllowBalance] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SaleResult | null>(null);

  const pricing = useMemo(
    () =>
      priceSale(lines.map(toPricingLine), {
        orderDiscount: toOrderDiscount(discount),
        member: wallet?.membership ?? null,
        pricesIncludeTax: settings.tax.pricesIncludeTax,
        tipMinor: tip.amountMinor,
      }),
    [lines, discount, wallet, settings.tax.pricesIncludeTax, tip.amountMinor],
  );

  const methods = settings.payments.methods.filter((m) => m.enabled);
  const typed = tenders.map((x) => ({ key: x.key, amountMinor: x.amountMinor, methodType: methods.find((m) => m.id === x.methodId)?.type ?? "other" }));
  const settlement = settle(typed, pricing.dueMinor);
  const hasClient = client?.mode === "client";
  const canLeaveBalance = settings.payments.allowClientDebt && hasClient;
  const tendersValid = tenders.every((x) => {
    const type = methods.find((m) => m.id === x.methodId)?.type;
    if (type === "gift_card") return x.giftCardBalance !== null && x.amountMinor <= x.giftCardBalance;
    if (type === "package") {
      const credit = wallet?.packages.find((p) => p.id === x.clientPackageId);
      return !!credit && x.amountMinor <= credit.creditMinor - credit.creditUsedMinor;
    }
    return true;
  });
  const canComplete =
    lines.length > 0 && tendersValid && !settlement.overpaid && (settlement.remainingMinor === 0 || (allowBalance && canLeaveBalance));

  const lastStaff = [...lines].reverse().find((l) => l.staffId)?.staffId ?? null;

  function addLine(line: PosLine | null) {
    if (!line) return;
    setLines((prev) => [...prev, line]);
  }

  function pick(p: CatalogPick) {
    if ((p.type === "package" || p.type === "membership") && !hasClient) {
      toast.error(t("pos.requiresClient"));
      return;
    }
    switch (p.type) {
      case "service":
        addLine(serviceLine(catalog, p.id, settings, locale, lastStaff));
        break;
      case "product": {
        const existing = lines.find((l) => l.type === "product" && l.refId === p.id);
        if (existing) setLines(lines.map((l) => (l.key === existing.key ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l)));
        else addLine(productLine(catalog, p.id, settings, lastStaff));
        break;
      }
      case "package": {
        const pk = catalog.packages.find((x) => x.id === p.id);
        const detail = pk?.kind === "credit" ? t("pos.creditValue", { amount: org.money(pk.creditMinor) }) : t("pos.sessions", { count: pk?.items.reduce((s, i) => s + i.quantity, 0) ?? 0 });
        addLine(packageLine(catalog, p.id, settings, locale, detail));
        break;
      }
      case "membership": {
        if (lines.some((l) => l.type === "membership")) return;
        const plan = catalog.plans.find((x) => x.id === p.id);
        addLine(membershipLine(catalog, p.id, settings, locale, plan ? t(`pos.periods.${plan.period}`) : ""));
        break;
      }
      case "gift_card":
        setGiftOpen(true);
        break;
    }
  }

  async function changeClient(next: ClientSelection) {
    setClient(next);
    setWallet(null);
    // Redemptions and account-only items belong to the previous client.
    setLines((prev) =>
      prev
        .filter((l) => next?.mode === "client" || (l.type !== "package" && l.type !== "membership"))
        .map((l) => (l.redeemClientPackageId ? { ...l, redeemClientPackageId: null } : l)),
    );
    setTenders((prev) => prev.filter((x) => !x.clientPackageId));
    setAllowBalance(false);
    if (next?.mode === "client") {
      const res = await clientWalletAction({ clientId: next.client.id });
      if (res.ok) setWallet(res.data);
    }
  }

  function reset() {
    setClient(EMPTY.client);
    setWallet(null);
    setLines([]);
    setAppointment({ id: null, label: null });
    setDiscount({ kind: "none" });
    setTip({ amountMinor: 0, staffId: null });
    setTenders([]);
    setAllowBalance(false);
    setNotes("");
    setResult(null);
    setPayOpen(false);
    setMobileTab("catalog");
    // Drop ?appointment= / ?client= so a refresh doesn't prefill the old ticket.
    router.replace("/pos");
  }

  async function complete() {
    setSubmitting(true);
    try {
      const payments = tenders
        .map((x) => ({
          methodId: x.methodId,
          amountMinor: settlement.recorded.get(x.key) ?? 0,
          reference: x.reference,
          giftCardCode: x.giftCardCode,
          clientPackageId: x.clientPackageId,
        }))
        .filter((p) => p.amountMinor > 0);
      const res = await createSaleAction({
        branchId,
        clientId: client?.mode === "client" ? client.client.id : null,
        appointmentId: appointment.id,
        lines: toSaleLines(lines),
        orderDiscount: toSaleDiscount(discount),
        tip,
        payments,
        allowBalance: allowBalance && settlement.remainingMinor > 0,
        notes: client?.mode === "walkin" && client.name ? [client.name, notes].filter(Boolean).join(" · ") : notes,
      });
      if (!res.ok) {
        toast.error(te(res.error, res.vars));
        return;
      }
      setResult({ id: res.data.id, number: res.data.number, totalMinor: res.data.dueMinor, changeMinor: settlement.changeMinor });
    } catch (err) {
      console.error(err);
      toast.error(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Segmented value={mobileTab} onValueChange={(v) => setMobileTab(v as typeof mobileTab)} className="w-full lg:hidden" aria-label={t("pos.title")}>
        <SegmentedItem value="catalog" className="flex-1">
          {t("pos.mobileCatalog")}
        </SegmentedItem>
        <SegmentedItem value="ticket" className="flex-1">
          {t("pos.mobileTicket", { count: lines.length })}
        </SegmentedItem>
      </Segmented>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className={cn("min-h-0 min-w-0 lg:flex lg:flex-col", mobileTab === "catalog" ? "flex flex-col" : "hidden")}>
          <CatalogPanel
            catalog={catalog}
            onPick={(p) => {
              pick(p);
            }}
          />
        </div>
        <div className={cn("min-h-0 min-w-0 lg:flex lg:flex-col [&>*]:flex-1", mobileTab === "ticket" ? "flex flex-col" : "hidden")}>
          <TicketPanel
            client={client}
            onClientChange={changeClient}
            wallet={wallet}
            lines={lines}
            onLinesChange={setLines}
            staff={catalog.staff}
            discount={discount}
            onDiscountChange={setDiscount}
            tip={tip}
            onTipChange={setTip}
            pricing={pricing}
            onCharge={() => setPayOpen(true)}
            appointmentLabel={appointment.label}
          />
        </div>
      </div>

      {/* Mobile: jump to the ticket after adding items. */}
      {mobileTab === "catalog" && lines.length > 0 ? (
        <Button className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 shadow-lg lg:hidden" size="lg" onClick={() => setMobileTab("ticket")}>
          {t("pos.mobileTicket", { count: lines.length })} · {org.money(pricing.dueMinor)}
        </Button>
      ) : null}

      <GiftCardDialog
        open={giftOpen}
        onOpenChange={setGiftOpen}
        onAdd={(d) =>
          addLine(
            giftCardLine(t("pos.tabs.giftCards"), d.recipientName || d.recipientEmail || "", d.amountMinor, {
              recipientName: d.recipientName,
              recipientEmail: d.recipientEmail,
              message: d.message,
            }),
          )
        }
      />

      <Sheet
        open={payOpen}
        onOpenChange={(open) => {
          if (submitting) return;
          if (!open && result) reset();
          else setPayOpen(open);
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{result ? result.number : t("pos.paymentTitle")}</SheetTitle>
            <SheetDescription className="sr-only">{t("pos.payment")}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            {result ? (
              <SuccessPanel result={result} onNewSale={reset} />
            ) : (
              <PaymentPanel
                dueMinor={pricing.dueMinor}
                methods={methods}
                tenders={tenders}
                onTendersChange={setTenders}
                settlement={settlement}
                wallet={wallet}
                canLeaveBalance={canLeaveBalance}
                allowBalance={allowBalance}
                onAllowBalanceChange={setAllowBalance}
                notes={notes}
                onNotesChange={setNotes}
              />
            )}
          </SheetBody>
          {result ? null : (
            <SheetFooter>
              <Button variant="ghost" onClick={() => setPayOpen(false)} disabled={submitting}>
                {t("pos.back")}
              </Button>
              <Button onClick={complete} disabled={!canComplete || submitting} aria-busy={submitting}>
                {submitting ? t("pos.completing") : t("pos.completeSale")}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
