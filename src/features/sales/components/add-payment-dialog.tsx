"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import type { TransactionDTO } from "@/lib/types";

import { addPaymentAction } from "../actions";
import { useMethodLabel } from "./use-method-label";

function AddPaymentForm({ tx, onDone }: { tx: TransactionDTO; onDone: () => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const methodLabel = useMethodLabel();
  // Gift cards and package credit need a code/wallet lookup; take those at checkout.
  const methods = org.settings.payments.methods.filter((m) => m.enabled && m.type !== "gift_card" && m.type !== "package");
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "");
  const [amount, setAmount] = useState(tx.balanceMinor);
  const [reference, setReference] = useState("");
  const { run, pending, errorFor } = useAction(addPaymentAction, {
    success: t("sales.paymentRecorded"),
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run({ id: tx.id, payments: [{ methodId, amountMinor: amount, reference }] });
      }}
    >
      <Field label={t("pos.methods")}>
        <Select value={methodId} onValueChange={setMethodId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {methods.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {methodLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("common.amount")} error={errorFor("payments")} hint={t("sales.balanceDueHint", { amount: org.money(tx.balanceMinor) })}>
        <MoneyInput value={amount} onChange={setAmount} currency={org.currency} invalid={amount > tx.balanceMinor} />
      </Field>
      <Field label={t("pos.reference")} htmlFor="pay-ref">
        <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("pos.referencePlaceholder")} maxLength={80} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending || amount <= 0 || amount > tx.balanceMinor || !methodId}>
          {t("sales.recordPayment")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddPaymentDialog({ tx, open, onOpenChange }: { tx: TransactionDTO; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sales.recordPayment")}</DialogTitle>
          <DialogDescription>{tx.number}</DialogDescription>
        </DialogHeader>
        {open ? <AddPaymentForm tx={tx} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
