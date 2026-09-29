"use client";

import { BanknoteIcon, CreditCardIcon, GiftIcon, LandmarkIcon, PackageCheckIcon, WalletIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";
import type { PaymentMethod, PaymentMethodType } from "@/lib/settings";
import { newId } from "@/lib/utils";

import { checkGiftCardAction } from "../actions";
import { cashSuggestions, type Settlement } from "../payments";
import type { PosWallet, Tender } from "./pos-types";
import { useMethodLabel } from "./use-method-label";

const ICONS: Record<PaymentMethodType, typeof BanknoteIcon> = {
  cash: BanknoteIcon,
  card: CreditCardIcon,
  bank_transfer: LandmarkIcon,
  gift_card: GiftIcon,
  package: PackageCheckIcon,
  other: WalletIcon,
};

function creditLeft(p: PosWallet["packages"][number]) {
  return p.creditMinor - p.creditUsedMinor;
}

export function PaymentPanel({
  dueMinor,
  methods,
  tenders,
  onTendersChange,
  settlement,
  wallet,
  canLeaveBalance,
  allowBalance,
  onAllowBalanceChange,
  notes,
  onNotesChange,
}: {
  dueMinor: number;
  methods: PaymentMethod[];
  tenders: Tender[];
  /** A state setter: updates are functional so async checks never write back a stale list. */
  onTendersChange: React.Dispatch<React.SetStateAction<Tender[]>>;
  settlement: Settlement;
  wallet: PosWallet | null;
  canLeaveBalance: boolean;
  allowBalance: boolean;
  onAllowBalanceChange: (v: boolean) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  const { t, te } = useI18n();
  const org = useOrg();
  const methodLabel = useMethodLabel();
  const [checking, setChecking] = useState<string | null>(null);
  const credits = (wallet?.packages ?? []).filter((p) => p.kind === "credit" && creditLeft(p) > 0);
  const available = methods.filter((m) => m.type !== "package" || credits.length > 0);
  const typeOf = (methodId: string) => methods.find((m) => m.id === methodId)?.type ?? "other";
  const update = (key: string, patch: Partial<Tender>) =>
    onTendersChange((list) => list.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  function add(m: PaymentMethod) {
    const remaining = settlement.remainingMinor;
    const credit = m.type === "package" ? credits[0] : undefined;
    onTendersChange((list) => [
      ...list,
      {
        key: newId(),
        methodId: m.id,
        amountMinor: m.type === "gift_card" ? 0 : credit ? Math.min(remaining, creditLeft(credit)) : remaining,
        reference: "",
        giftCardCode: "",
        giftCardBalance: null,
        clientPackageId: credit?.id ?? null,
      },
    ]);
  }

  async function checkCard(tender: Tender) {
    setChecking(tender.key);
    const res = await checkGiftCardAction({ code: tender.giftCardCode });
    setChecking(null);
    if (!res.ok) {
      update(tender.key, { giftCardBalance: null, amountMinor: 0 });
      return toast.error(te(res.error));
    }
    // Read the list as it is now: the cashier may have added cash or card while the check ran.
    onTendersChange((list) => {
      const others = list.filter((x) => x.key !== tender.key).reduce((s, x) => s + x.amountMinor, 0);
      return list.map((x) =>
        x.key === tender.key
          ? {
              ...x,
              giftCardCode: res.data.code,
              giftCardBalance: res.data.balanceMinor,
              amountMinor: Math.max(0, Math.min(res.data.balanceMinor, dueMinor - others)),
            }
          : x,
      );
    });
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-xl border bg-muted/30 p-4 text-center">
        <div className="text-[14px] text-muted-foreground">{t("pos.amountDue")}</div>
        <div className="mt-1 text-3xl font-semibold tracking-tight tabular">{org.money(dueMinor)}</div>
      </div>

      {dueMinor > 0 ? (
        <div>
          <div className="mb-2 text-[14px] font-medium">{t("pos.methods")}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {available.map((m) => {
              const Icon = ICONS[m.type];
              return (
                <Button
                  key={m.id}
                  type="button"
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3"
                  onClick={() => add(m)}
                  disabled={settlement.remainingMinor <= 0 && m.type !== "cash"}
                >
                  <Icon className="size-5" />
                  <span className="text-[14px]">{methodLabel(m)}</span>
                </Button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{t("pos.nothingToPay")}</p>
      )}

      {tenders.length ? (
        <ul className="grid gap-2">
          {tenders.map((x) => {
            const m = methods.find((mm) => mm.id === x.methodId);
            const type = typeOf(x.methodId);
            const Icon = ICONS[type];
            const credit = credits.find((c) => c.id === x.clientPackageId);
            return (
              <li key={x.key} className="grid gap-2 rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">{m ? methodLabel(m) : x.methodId}</span>
                  <MoneyInput
                    value={x.amountMinor}
                    onChange={(v) => update(x.key, { amountMinor: v })}
                    currency={org.currency}
                    className="w-36"
                    disabled={type === "gift_card" && x.giftCardBalance === null}
                    aria-label={t("common.amount")}
                  />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => onTendersChange((list) => list.filter((y) => y.key !== x.key))} aria-label={t("common.remove")}>
                    <XIcon />
                  </Button>
                </div>
                {type === "cash" && tenders.length === 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {cashSuggestions(dueMinor).map((v) => (
                      <Button key={v} type="button" size="sm" variant={x.amountMinor === v ? "secondary" : "ghost"} className="h-7 text-xs" onClick={() => update(x.key, { amountMinor: v })}>
                        {org.money(v, { compact: v !== dueMinor })}
                      </Button>
                    ))}
                  </div>
                ) : null}
                {type === "card" || type === "bank_transfer" || type === "other" ? (
                  <Input
                    value={x.reference}
                    onChange={(e) => update(x.key, { reference: e.target.value })}
                    placeholder={t("pos.referencePlaceholder")}
                    aria-label={t("pos.reference")}
                    className="h-8 text-[14px]"
                    maxLength={80}
                  />
                ) : null}
                {type === "gift_card" ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={x.giftCardCode}
                      onChange={(e) => update(x.key, { giftCardCode: e.target.value.toUpperCase(), giftCardBalance: null, amountMinor: 0 })}
                      placeholder={t("pos.giftCardCode")}
                      aria-label={t("pos.giftCardCode")}
                      className="h-8 flex-1 font-mono text-[14px]"
                      dir="ltr"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void checkCard(x);
                        }
                      }}
                    />
                    <Button type="button" size="sm" variant="secondary" disabled={x.giftCardCode.trim().length < 4 || checking === x.key} onClick={() => checkCard(x)}>
                      {t("pos.checkCard")}
                    </Button>
                  </div>
                ) : null}
                {type === "gift_card" && x.giftCardBalance !== null ? (
                  <p className="text-xs text-success">{t("pos.cardBalance", { amount: org.money(x.giftCardBalance) })}</p>
                ) : null}
                {type === "package" ? (
                  <Select value={x.clientPackageId ?? ""} onValueChange={(v) => update(x.key, { clientPackageId: v })}>
                    <SelectTrigger size="sm" aria-label={t("pos.activePackages")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {credits.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} · {org.money(creditLeft(c))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                {credit && x.amountMinor > creditLeft(credit) ? <p className="text-xs text-destructive">{te("errors.packageInvalid")}</p> : null}
                {type === "gift_card" && x.giftCardBalance !== null && x.amountMinor > x.giftCardBalance ? (
                  <p className="text-xs text-destructive">{te("errors.giftCardInvalid")}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <dl className="grid gap-1.5 rounded-lg border p-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("pos.paid")}</dt>
          <dd className="tabular">{org.money(settlement.tenderedMinor)}</dd>
        </div>
        {settlement.changeMinor > 0 ? (
          <div className="flex justify-between font-semibold text-success">
            <dt>{t("pos.change")}</dt>
            <dd className="tabular">{org.money(settlement.changeMinor)}</dd>
          </div>
        ) : (
          <div className={settlement.remainingMinor > 0 ? "flex justify-between font-semibold" : "flex justify-between text-muted-foreground"}>
            <dt>{t("pos.remaining")}</dt>
            <dd className="tabular">{org.money(settlement.remainingMinor)}</dd>
          </div>
        )}
        {settlement.overpaid ? <p className="text-xs text-destructive">{te("errors.paymentExceeds")}</p> : null}
      </dl>

      {canLeaveBalance && settlement.remainingMinor > 0 ? (
        <Label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-normal">
          <Checkbox checked={allowBalance} onCheckedChange={(v) => onAllowBalanceChange(v === true)} />
          {t("pos.allowDebt", { amount: org.money(settlement.remainingMinor) })}
        </Label>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="pos-notes">{t("pos.notes")}</Label>
        <Textarea id="pos-notes" value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={2} maxLength={500} />
      </div>
    </div>
  );
}
