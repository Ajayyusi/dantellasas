"use client";

import { BanIcon, CopyIcon, ReceiptIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n/client";
import type { GiftCardDTO } from "@/lib/types";

import { voidGiftCardAction } from "../gift-card-actions";

export const GIFT_CARD_STATUS_VARIANT = {
  active: "success",
  redeemed: "neutral",
  expired: "warning",
  void: "danger",
} as const;

export function GiftCardDetailSheet({ card, onOpenChange }: { card: GiftCardDTO | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={!!card} onOpenChange={onOpenChange}>
      {card ? <Detail card={card} /> : null}
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function Detail({ card }: { card: GiftCardDTO }) {
  const { t, te } = useI18n();
  const org = useOrg();
  const [confirmVoid, setConfirmVoid] = useState(false);
  const used = card.initialMinor - card.balanceMinor;
  const wasUsed = card.redemptions.length > 0 || used > 0;
  const usedPct = card.initialMinor > 0 ? Math.min(100, Math.round((used / card.initialMinor) * 100)) : 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(card.code);
      toast.success(t("common.copied"));
    } catch {
      toast.error(t("errors.generic"));
    }
  }

  return (
    <SheetContent className="sm:max-w-md">
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono tracking-wide" dir="ltr">
            {card.code}
          </span>
          <Badge variant={GIFT_CARD_STATUS_VARIANT[card.status]}>{t(`catalog.giftCards.statuses.${card.status}`)}</Badge>
        </SheetTitle>
        <SheetDescription>
          {card.recipientName ? t("catalog.giftCards.forRecipient", { name: card.recipientName }) : t("catalog.giftCards.detail")}
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="grid content-start gap-5">
        <div className="rounded-xl bg-gradient-to-br from-primary/90 to-primary p-5 text-primary-foreground shadow-sm">
          <div className="text-[13px] opacity-80">{t("catalog.giftCards.balance")}</div>
          <div className="mt-1 text-3xl font-semibold tabular">{org.money(card.status === "void" ? 0 : card.balanceMinor)}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-foreground/25" aria-hidden>
            <div className="h-full rounded-full bg-primary-foreground" style={{ width: `${100 - usedPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[13px] opacity-80 tabular">
            <span>{t("catalog.giftCards.ofInitial", { amount: org.money(card.initialMinor) })}</span>
            <span>
              {card.expiresAt
                ? t("catalog.giftCards.expiresDate", { date: org.date(card.expiresAt) })
                : t("catalog.giftCards.noExpiry")}
            </span>
          </div>
        </div>

        <dl className="divide-y">
          <Row label={t("catalog.giftCards.issued")}>{org.date(card.issuedAt)}</Row>
          <Row label={t("catalog.giftCards.purchaser")}>{card.purchaserName || t("catalog.giftCards.complimentary")}</Row>
          <Row label={t("catalog.giftCards.recipientName")}>{card.recipientName || "—"}</Row>
          <Row label={t("catalog.giftCards.recipientEmail")}>
            <span dir="ltr">{card.recipientEmail || "—"}</span>
          </Row>
        </dl>
        {card.message ? (
          <blockquote className="rounded-lg border-s-4 border-primary/40 bg-muted/50 px-4 py-3 text-sm italic">
            {card.message}
          </blockquote>
        ) : null}

        <Separator />

        <section className="grid gap-2">
          <h3 className="text-sm font-semibold">{t("catalog.giftCards.history")}</h3>
          {card.redemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("catalog.giftCards.noRedemptions")}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {card.redemptions.map((r, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <ReceiptIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 tabular">{org.date(r.at, "datetime")}</span>
                  <span className="font-medium tabular">−{org.money(r.amountMinor)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </SheetBody>
      <SheetFooter className="justify-between">
        <Button variant="outline" onClick={copy}>
          <CopyIcon />
          {t("catalog.giftCards.copyCode")}
        </Button>
        {org.can("manage_catalog") && card.status !== "void" ? (
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmVoid(true)}>
            <BanIcon />
            {t("catalog.giftCards.void")}
          </Button>
        ) : null}
      </SheetFooter>
      <ConfirmDialog
        open={confirmVoid}
        onOpenChange={setConfirmVoid}
        title={t("catalog.giftCards.voidTitle", { code: card.code })}
        description={
          wasUsed
            ? t("catalog.giftCards.voidUsed", { used: org.money(used), balance: org.money(card.balanceMinor) })
            : t("catalog.giftCards.voidUnused", { amount: org.money(card.balanceMinor) })
        }
        destructive
        confirmLabel={t("catalog.giftCards.void")}
        onConfirm={async () => {
          const res = await voidGiftCardAction({ id: card.id, force: wasUsed });
          if (res.ok) toast.success(t("catalog.giftCards.voided"));
          else toast.error(te(res.error));
        }}
      />
    </SheetContent>
  );
}
