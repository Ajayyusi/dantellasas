"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import type { TransactionDTO } from "@/lib/types";

import { refundTransactionAction } from "../actions";
import { useMethodLabel } from "./use-method-label";

/** Quantity of each line not yet covered by an earlier credit note. */
export function refundableQuantities(tx: TransactionDTO): Map<string, number> {
  const used = new Map<string, number>();
  for (const r of tx.refunds) for (const l of r.lines) used.set(l.itemId, (used.get(l.itemId) ?? 0) + l.quantity);
  return new Map(tx.items.map((i) => [i.id, i.quantity - (used.get(i.id) ?? 0)]));
}

function RefundForm({ tx, onDone, onCancel }: { tx: TransactionDTO; onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const methodLabel = useMethodLabel();
  const left = refundableQuantities(tx);
  const tipRefunded = tx.refunds.some((r) => r.tipMinor > 0);
  const paidByGiftCard = tx.payments.some((p) => p.methodType === "gift_card");
  const methods = org.settings.payments.methods.filter((m) => m.enabled && m.type !== "package" && (m.type !== "gift_card" || paidByGiftCard));
  const firstPaid = tx.payments.find((p) => methods.some((m) => m.id === p.methodId))?.methodId;

  const [mode, setMode] = useState<"all" | "lines">("all");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [includeTip, setIncludeTip] = useState(tx.tipMinor > 0 && !tipRefunded);
  const [restock, setRestock] = useState(true);
  const [methodId, setMethodId] = useState(firstPaid ?? methods[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const { run, pending, errorFor } = useAction(refundTransactionAction, {
    success: false,
    onSuccess: (res) => {
      toast.success(t("sales.refunded", { number: res.number }));
      onDone();
      router.refresh();
    },
  });

  const chosen = tx.items
    .map((i) => ({ item: i, quantity: mode === "all" ? (left.get(i.id) ?? 0) : Math.min(left.get(i.id) ?? 0, qty[i.id] ?? 0) }))
    .filter((l) => l.quantity > 0);
  const tipPart = includeTip && !tipRefunded ? tx.tipMinor : 0;
  const amount = chosen.reduce((s, l) => s + Math.round((l.item.totalMinor * l.quantity) / l.item.quantity), 0) + tipPart;
  const maxRefund = tx.paidMinor - tx.refundedMinor;
  const hasProducts = chosen.some((l) => l.item.type === "product");

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run({ id: tx.id, lines: chosen.map((l) => ({ itemId: l.item.id, quantity: l.quantity })), includeTip: tipPart > 0, methodId, reason, restock: restock && hasProducts });
      }}
    >
      <Segmented value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
        <SegmentedItem value="all" className="flex-1">
          {t("sales.refundAll")}
        </SegmentedItem>
        <SegmentedItem value="lines" className="flex-1">
          {t("sales.refundLines")}
        </SegmentedItem>
      </Segmented>

      {mode === "lines" ? (
        <ul className="grid max-h-64 gap-1 overflow-y-auto rounded-lg border p-1 scrollbar-thin">
          {tx.items.map((i) => {
            const max = left.get(i.id) ?? 0;
            return (
              <li key={i.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{i.name}</div>
                  <div className="text-xs text-muted-foreground tabular">
                    {org.money(i.totalMinor)} · {i.quantity}×
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={max}
                  value={qty[i.id] ?? 0}
                  disabled={max === 0}
                  onChange={(e) => setQty({ ...qty, [i.id]: Math.max(0, Math.min(max, Math.floor(Number(e.target.value) || 0))) })}
                  className="h-8 w-16 text-center tabular"
                  aria-label={`${t("pos.quantity")} · ${i.name}`}
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="grid gap-2">
        {tx.tipMinor > 0 && !tipRefunded ? (
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Checkbox checked={includeTip} onCheckedChange={(v) => setIncludeTip(v === true)} />
            {t("sales.refundTip", { amount: org.money(tx.tipMinor) })}
          </Label>
        ) : null}
        {hasProducts ? (
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Checkbox checked={restock} onCheckedChange={(v) => setRestock(v === true)} />
            {t("sales.restock")}
          </Label>
        ) : null}
      </div>

      <Field label={t("sales.refundMethod")} error={errorFor("methodId")}>
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
      <Field label={t("sales.refundReason")} htmlFor="refund-reason" required error={errorFor("reason")}>
        <Input id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("sales.refundReasonPlaceholder")} maxLength={200} />
      </Field>

      <div className="flex items-baseline justify-between rounded-lg bg-muted/40 px-3 py-2.5">
        <span className="text-sm text-muted-foreground">{t("sales.refundAmount")}</span>
        <span className="text-lg font-semibold tabular">{org.money(amount)}</span>
      </div>
      {amount > maxRefund ? <p className="text-xs text-destructive">{t("errors.refundExceeds")}</p> : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="destructive" disabled={pending || amount <= 0 || amount > maxRefund || !reason.trim() || !methodId}>
          {t("sales.confirmRefund")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RefundDialog({ tx, open, onOpenChange }: { tx: TransactionDTO; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("sales.refundTitle")}</DialogTitle>
          <DialogDescription>{t("sales.refundBody")}</DialogDescription>
        </DialogHeader>
        {open ? <RefundForm tx={tx} onDone={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
