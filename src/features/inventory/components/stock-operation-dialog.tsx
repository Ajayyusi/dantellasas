"use client";

import {
  ArrowLeftRightIcon,
  ArrowRightIcon,
  HandIcon,
  Loader2Icon,
  PackagePlusIcon,
  SlidersHorizontalIcon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { cn } from "@/lib/utils";

import { stockOperationAction } from "../actions";
import type { ProductRow, StockOperation } from "../types";

const OPS: { op: StockOperation; icon: LucideIcon }[] = [
  { op: "receive", icon: PackagePlusIcon },
  { op: "adjust", icon: SlidersHorizontalIcon },
  { op: "internal_use", icon: HandIcon },
  { op: "return", icon: Undo2Icon },
  { op: "transfer", icon: ArrowLeftRightIcon },
];

const ADJUST_REASONS = ["stockCount", "damaged", "expired", "lost", "found"] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductRow[];
  productId: string | null;
  op: StockOperation;
}

export function StockOperationDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-xl">
        {props.open ? <StockOperationForm key={`${props.productId}-${props.op}`} {...props} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function StockOperationForm({ onOpenChange, products, productId: initialProductId, op: initialOp }: Props) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const canTransfer = org.branches.length > 1;
  const [op, setOp] = useState<StockOperation>(initialOp === "transfer" && !canTransfer ? "receive" : initialOp);
  const [productId, setProductId] = useState(initialProductId ?? "");
  const product = products.find((p) => p.id === productId) ?? null;
  const [branchId, setBranchId] = useState(org.branchId ?? org.branches[0]?.id ?? "");
  const [toBranchId, setToBranchId] = useState(org.branches.find((b) => b.id !== branchId)?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unitCostMinor, setUnitCostMinor] = useState(product?.costMinor ?? 0);
  const [direction, setDirection] = useState<"increase" | "decrease">("decrease");
  const [returnDirection, setReturnDirection] = useState<"to_supplier" | "from_client">("to_supplier");
  const [note, setNote] = useState("");
  const { run, pending, errorFor } = useAction(stockOperationAction, {
    success: t(`inventory.ops.${op}.done`),
    onSuccess: () => onOpenChange(false),
  });

  const qty = Math.floor(Number(quantity));
  const validQty = Number.isFinite(qty) && qty >= 1;
  const before = product ? (product.stock[branchId] ?? 0) : 0;
  const delta = !validQty
    ? 0
    : op === "receive" || (op === "adjust" && direction === "increase") || (op === "return" && returnDirection === "from_client")
      ? qty
      : -qty;
  const after = before + delta;
  const negative = !!product?.trackStock && after < 0;
  const needsReason = op === "adjust" && !note.trim();
  const canSubmit =
    !!product && !!branchId && validQty && !negative && !needsReason && (op !== "transfer" || (!!toBranchId && toBranchId !== branchId));

  function submit() {
    if (!product) return;
    const base = { productId: product.id, branchId, quantity: qty, note };
    switch (op) {
      case "receive":
        return run({ ...base, op, unitCostMinor });
      case "adjust":
        return run({ ...base, op, direction });
      case "internal_use":
        return run({ ...base, op });
      case "return":
        return run({ ...base, op, direction: returnDirection });
      case "transfer":
        return run({ ...base, op, toBranchId });
    }
  }

  const branchLabel = (id: string) => org.branchName(id);
  const selectableProducts = products.filter((p) => p.active || p.id === productId);

  return (
    <form
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>{t("inventory.stockOperation")}</DialogTitle>
        <DialogDescription>{t(`inventory.ops.${op}.hint`)}</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5" role="radiogroup" aria-label={t("inventory.operationType")}>
        {OPS.map(({ op: o, icon: Icon }) => {
          const disabled = o === "transfer" && !canTransfer;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={op === o}
              disabled={disabled}
              title={disabled ? t("inventory.transferNeedsBranches") : undefined}
              onClick={() => setOp(o)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40",
                op === o ? "border-primary bg-primary/8 text-primary" : "hover:bg-accent",
              )}
            >
              <Icon className="size-4" />
              {t(`inventory.ops.${o}.label`)}
            </button>
          );
        })}
      </div>
      {!canTransfer ? <p className="-mt-2 text-xs text-muted-foreground">{t("inventory.transferNeedsBranches")}</p> : null}

      <Field label={t("inventory.product")} htmlFor="op-product" required>
        <Select
          value={productId}
          onValueChange={(v) => {
            setProductId(v);
            setUnitCostMinor(products.find((p) => p.id === v)?.costMinor ?? 0);
          }}
        >
          <SelectTrigger id="op-product" className="min-w-0">
            <SelectValue placeholder={t("inventory.chooseProduct")} />
          </SelectTrigger>
          <SelectContent>
            {selectableProducts.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {localName(p, locale)}
                {p.sku ? <span className="text-muted-foreground"> · {p.sku}</span> : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <FieldGroup className="items-start">
        {org.branches.length > 1 ? (
          <Field label={op === "transfer" ? t("inventory.fromBranch") : t("common.branch")} htmlFor="op-branch" required>
            <Select
              value={branchId}
              onValueChange={(v) => {
                setBranchId(v);
                if (v === toBranchId) setToBranchId(org.branches.find((b) => b.id !== v)?.id ?? "");
              }}
            >
              <SelectTrigger id="op-branch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {org.branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        {op === "transfer" ? (
          <Field label={t("inventory.toBranch")} htmlFor="op-to" required error={errorFor("toBranchId")}>
            <Select value={toBranchId} onValueChange={setToBranchId}>
              <SelectTrigger id="op-to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {org.branches
                  .filter((b) => b.id !== branchId)
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        {op === "adjust" ? (
          <Field label={t("inventory.direction")}>
            <Segmented value={direction} onValueChange={(v) => setDirection(v as "increase" | "decrease")} className="w-full" aria-label={t("inventory.direction")}>
              <SegmentedItem value="increase" className="flex-1">
                {t("inventory.increase")}
              </SegmentedItem>
              <SegmentedItem value="decrease" className="flex-1">
                {t("inventory.decrease")}
              </SegmentedItem>
            </Segmented>
          </Field>
        ) : null}
        <Field label={t("inventory.quantity")} htmlFor="op-qty" required error={errorFor("quantity")}>
          <Input
            id="op-qty"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="tabular"
            autoFocus={!!initialProductId}
          />
        </Field>
        {op === "receive" ? (
          <Field
            label={t("inventory.unitCost")}
            htmlFor="op-cost"
            error={errorFor("unitCostMinor")}
            hint={product && validQty ? t("inventory.newAverageCost", { amount: org.money(averageCost(product, qty, unitCostMinor)) }) : undefined}
          >
            <MoneyInput id="op-cost" value={unitCostMinor} onChange={setUnitCostMinor} currency={org.currency} />
          </Field>
        ) : null}
      </FieldGroup>

      {op === "return" ? (
        <RadioGroup value={returnDirection} onValueChange={(v) => setReturnDirection(v as "to_supplier" | "from_client")} className="gap-2">
          {(["to_supplier", "from_client"] as const).map((d) => (
            <Label key={d} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary">
              <RadioGroupItem value={d} className="mt-0.5" />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{t(`inventory.returnDirection.${d}`)}</span>
                <span className="text-[13px] font-normal text-muted-foreground">{t(`inventory.returnDirection.${d}Hint`)}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      ) : null}

      <Field
        label={op === "adjust" ? t("inventory.reason") : t("common.notes")}
        htmlFor="op-note"
        required={op === "adjust"}
        optionalLabel={op === "adjust" ? undefined : t("common.optional")}
        error={errorFor("note")}
      >
        {op === "adjust" ? (
          <div className="flex flex-wrap gap-1.5">
            {ADJUST_REASONS.map((r) => {
              const label = t(`inventory.reasons.${r}`);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNote(label)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                    note === label && "border-primary bg-primary/8 text-primary",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
        <Textarea
          id="op-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t(`inventory.ops.${op}.notePlaceholder`)}
        />
      </Field>

      {product ? (
        <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5 text-sm", negative ? "border-destructive/40 bg-destructive/5" : "bg-muted/30")}>
          <span className="text-muted-foreground">{t("inventory.balanceAt", { branch: branchLabel(branchId) })}</span>
          <span className="flex items-center gap-2 font-medium tabular" dir="ltr">
            {before}
            <ArrowRightIcon className="size-3.5 text-muted-foreground" />
            <span className={negative ? "text-destructive" : undefined}>{after}</span>
          </span>
          {op === "transfer" && toBranchId ? (
            <span className="text-muted-foreground">
              · {branchLabel(toBranchId)}: <span dir="ltr" className="font-medium tabular text-foreground">{(product.stock[toBranchId] ?? 0) + (validQty ? qty : 0)}</span>
            </span>
          ) : null}
          {negative ? <span className="w-full text-[13px] text-destructive">{t("inventory.errors.negativeStock")}</span> : null}
          {!product.trackStock ? <span className="w-full text-[13px] text-muted-foreground">{t("inventory.untrackedHint")}</span> : null}
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t(`inventory.ops.${op}.submit`)}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Mirrors the server's weighted average for the preview. */
function averageCost(product: ProductRow, qty: number, unitCostMinor: number) {
  const onHand = Object.values(product.stock).reduce((s, q) => s + Math.max(0, q), 0);
  if (onHand <= 0) return unitCostMinor;
  return Math.round((product.costMinor * onHand + unitCostMinor * qty) / (onHand + qty));
}
