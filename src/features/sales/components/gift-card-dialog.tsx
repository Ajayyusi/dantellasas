"use client";

import { useState } from "react";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";

export interface GiftCardDraft {
  amountMinor: number;
  recipientName: string;
  recipientEmail: string;
  message: string;
}

const PRESETS = [10000, 25000, 50000, 100000];

function GiftCardForm({ onAdd, onCancel }: { onAdd: (d: GiftCardDraft) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const [draft, setDraft] = useState<GiftCardDraft>({ amountMinor: 25000, recipientName: "", recipientEmail: "", message: "" });
  const emailInvalid = draft.recipientEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.recipientEmail);
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.amountMinor >= 100 && !emailInvalid) onAdd(draft);
      }}
    >
      <Field label={t("pos.giftCardAmount")} required>
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((v) => (
              <Button key={v} type="button" size="sm" variant={draft.amountMinor === v ? "default" : "outline"} onClick={() => setDraft({ ...draft, amountMinor: v })}>
                {org.money(v, { compact: true })}
              </Button>
            ))}
          </div>
          <MoneyInput value={draft.amountMinor} onChange={(v) => setDraft({ ...draft, amountMinor: v })} currency={org.currency} aria-label={t("pos.giftCardAmount")} />
        </div>
      </Field>
      <Field label={t("pos.giftCardRecipient")} htmlFor="gc-name">
        <Input id="gc-name" value={draft.recipientName} onChange={(e) => setDraft({ ...draft, recipientName: e.target.value })} maxLength={120} />
      </Field>
      <Field label={t("pos.giftCardEmail")} htmlFor="gc-email" error={emailInvalid ? t("validation.email") : null}>
        <Input id="gc-email" type="email" dir="ltr" value={draft.recipientEmail} onChange={(e) => setDraft({ ...draft, recipientEmail: e.target.value.trim() })} maxLength={160} />
      </Field>
      <Field label={t("pos.giftCardMessage")} htmlFor="gc-msg">
        <Textarea id="gc-msg" rows={2} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} maxLength={300} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={draft.amountMinor < 100 || emailInvalid}>
          {t("pos.addGiftCard")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function GiftCardDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (v: boolean) => void; onAdd: (d: GiftCardDraft) => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("pos.giftCardTitle")}</DialogTitle>
          <DialogDescription>{t("pos.giftCardBody")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <GiftCardForm
            onCancel={() => onOpenChange(false)}
            onAdd={(d) => {
              onAdd(d);
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
