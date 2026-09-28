"use client";

import { MinusIcon, PackageCheckIcon, PercentIcon, PlusIcon, ShoppingBagIcon, Trash2Icon, UserCheckIcon, HeartHandshakeIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientPicker, type ClientSelection } from "@/features/appointments/components/client-picker";
import { useI18n } from "@/lib/i18n/client";
import { minorToInput } from "@/lib/money";
import { cn } from "@/lib/utils";

import { checkDiscountCodeAction } from "../actions";
import type { PricingResult } from "../pricing";
import type { DiscountState, PosLine, PosStaff, PosWallet } from "./pos-types";

export function TicketPanel({
  client,
  onClientChange,
  wallet,
  lines,
  onLinesChange,
  staff,
  discount,
  onDiscountChange,
  tip,
  onTipChange,
  pricing,
  onCharge,
  appointmentLabel,
}: {
  client: ClientSelection;
  onClientChange: (c: ClientSelection) => void;
  wallet: PosWallet | null;
  lines: PosLine[];
  onLinesChange: (lines: PosLine[]) => void;
  staff: PosStaff[];
  discount: DiscountState;
  onDiscountChange: (d: DiscountState) => void;
  tip: { amountMinor: number; staffId: string | null };
  onTipChange: (t: { amountMinor: number; staffId: string | null }) => void;
  pricing: PricingResult;
  onCharge: () => void;
  appointmentLabel: string | null;
}) {
  const { t, te } = useI18n();
  const org = useOrg();
  const canDiscount = org.can("apply_discounts");
  const update = (key: string, patch: Partial<PosLine>) => onLinesChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const [discountMode, setDiscountMode] = useState<"percent" | "fixed" | "code">(canDiscount ? "percent" : "code");
  const [discountValue, setDiscountValue] = useState("");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  async function applyDiscount() {
    if (discountMode === "code") {
      setChecking(true);
      const res = await checkDiscountCodeAction({ code });
      setChecking(false);
      if (!res.ok) return toast.error(te(res.error));
      onDiscountChange({ kind: "code", code: res.data.code, name: res.data.name, discountKind: res.data.kind, valueBps: res.data.valueBps, valueMinor: res.data.valueMinor, appliesTo: res.data.appliesTo });
      toast.success(t("pos.codeApplied", { name: res.data.name }));
    } else if (discountMode === "percent") {
      const pct = Math.min(100, Math.max(0, Number(discountValue) || 0));
      onDiscountChange(pct > 0 ? { kind: "percent", valueBps: Math.round(pct * 100) } : { kind: "none" });
    } else {
      const minor = Math.round((Number(discountValue) || 0) * 100);
      onDiscountChange(minor > 0 ? { kind: "fixed", valueMinor: minor } : { kind: "none" });
    }
  }

  const discountLabel =
    discount.kind === "percent"
      ? `${discount.valueBps / 100}%`
      : discount.kind === "fixed"
        ? org.money(discount.valueMinor)
        : discount.kind === "code"
          ? discount.code
          : "";

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b p-3">
        <ClientPicker value={client} onChange={onClientChange} />
        {wallet?.membership ? (
          <Badge variant="primary" className="mt-2">
            <HeartHandshakeIcon />
            {t("pos.activeMembership", { plan: wallet.membership.planName })}
          </Badge>
        ) : null}
        {appointmentLabel ? <p className="mt-2 text-xs text-muted-foreground">{appointmentLabel}</p> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <ShoppingBagIcon className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">{t("pos.emptyTicket")}</p>
            <p className="text-[13px] text-muted-foreground">{t("pos.emptyTicketHint")}</p>
          </div>
        ) : (
          <ul className="divide-y">
            {lines.map((l, i) => {
              const priced = pricing.lines[i];
              const redeemable =
                l.type === "service" && !l.redeemClientPackageId
                  ? wallet?.packages.find((p) => p.kind === "services" && p.items.some((it) => it.serviceId === l.refId && it.total - it.used >= l.quantity))
                  : undefined;
              const redeemedPkg = l.redeemClientPackageId ? wallet?.packages.find((p) => p.id === l.redeemClientPackageId) : undefined;
              return (
                <li key={l.key} className="grid gap-2 px-3 py-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{l.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{l.detail}</div>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="rounded px-1 text-end outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" aria-label={t("pos.editLine")}>
                          <div className="text-sm font-semibold tabular">{org.money(priced?.totalMinor ?? 0)}</div>
                          {priced && priced.discountMinor > 0 ? (
                            <div className="text-xs tabular text-muted-foreground line-through">{org.money(priced.baseMinor)}</div>
                          ) : null}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="grid w-64 gap-3">
                        <Field label={t("pos.unitPrice")}>
                          <MoneyInput
                            value={l.unitPriceMinor}
                            onChange={(v) => update(l.key, { unitPriceMinor: v })}
                            currency={org.currency}
                            disabled={(!canDiscount && l.type !== "gift_card") || !!l.redeemClientPackageId}
                          />
                        </Field>
                        <Field label={t("pos.lineDiscount")}>
                          <MoneyInput value={l.discountMinor} onChange={(v) => update(l.key, { discountMinor: v })} currency={org.currency} disabled={!canDiscount || !!l.redeemClientPackageId} />
                        </Field>
                        {priced && priced.memberDiscountMinor > 0 ? (
                          <p className="text-xs text-primary">
                            {t("pos.memberDiscount")}: −{org.money(priced.memberDiscountMinor)}
                          </p>
                        ) : null}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {l.type === "service" || l.type === "product" ? (
                      <Select value={l.staffId ?? "__none"} onValueChange={(v) => update(l.key, { staffId: v === "__none" ? null : v })}>
                        <SelectTrigger size="sm" className="h-7 w-auto min-w-32 max-w-44 text-xs" aria-label={t("pos.staff")}>
                          <UserCheckIcon className="size-3.5 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">{t("pos.noStaff")}</SelectItem>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    {l.type !== "membership" ? (
                      <div className="flex items-center rounded-md border">
                        <button type="button" className="grid size-7 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={l.quantity <= 1} onClick={() => update(l.key, { quantity: l.quantity - 1 })} aria-label={t("common.remove")}>
                          <MinusIcon className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-medium tabular">{l.quantity}</span>
                        <button type="button" className="grid size-7 place-items-center text-muted-foreground hover:text-foreground" onClick={() => update(l.key, { quantity: l.quantity + 1 })} aria-label={t("common.add")}>
                          <PlusIcon className="size-3.5" />
                        </button>
                      </div>
                    ) : null}
                    {redeemable ? (
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => update(l.key, { redeemClientPackageId: redeemable.id })}>
                        <PackageCheckIcon />
                        {t("pos.redeemPackage", { remaining: redeemable.items.find((it) => it.serviceId === l.refId)!.total - redeemable.items.find((it) => it.serviceId === l.refId)!.used })}
                      </Button>
                    ) : null}
                    {redeemedPkg ? (
                      <Badge variant="success" className="gap-1">
                        <PackageCheckIcon />
                        {t("pos.coveredByPackage", { name: redeemedPkg.name })}
                        <button type="button" onClick={() => update(l.key, { redeemClientPackageId: null })} aria-label={t("pos.undoRedeem")}>
                          <XIcon />
                        </button>
                      </Badge>
                    ) : null}
                    <Button type="button" variant="ghost" size="icon-sm" className="ms-auto size-7" onClick={() => onLinesChange(lines.filter((x) => x.key !== l.key))} aria-label={t("pos.removeLine")}>
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-3 border-t bg-muted/20 p-3">
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={lines.length === 0}>
                <PercentIcon />
                {discount.kind === "none" ? t("pos.addDiscount") : `${t("pos.discount")}: ${discountLabel}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="grid w-72 gap-3">
              <Segmented value={discountMode} onValueChange={(v) => setDiscountMode(v as typeof discountMode)} className="w-full">
                {canDiscount ? <SegmentedItem value="percent" className="flex-1">{t("pos.discountPercent")}</SegmentedItem> : null}
                {canDiscount ? <SegmentedItem value="fixed" className="flex-1">{t("pos.discountFixed")}</SegmentedItem> : null}
                <SegmentedItem value="code" className="flex-1">{t("pos.discountCode")}</SegmentedItem>
              </Segmented>
              {discountMode === "code" ? (
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t("pos.discountCodePlaceholder")} dir="ltr" aria-label={t("pos.discountCode")} />
              ) : (
                <Input
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder={discountMode === "percent" ? "10" : minorToInput(5000)}
                  dir="ltr"
                  aria-label={t("pos.discount")}
                />
              )}
              <div className="flex justify-between gap-2">
                {discount.kind !== "none" ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDiscountChange({ kind: "none" })}>
                    {t("pos.removeDiscount")}
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="button" size="sm" onClick={applyDiscount} disabled={checking}>
                  {t("pos.applyCode")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={lines.length === 0}>
                <HeartHandshakeIcon />
                {tip.amountMinor > 0 ? `${t("pos.tip")}: ${org.money(tip.amountMinor)}` : t("pos.addTip")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="grid w-64 gap-3">
              <Field label={t("pos.tip")}>
                <MoneyInput value={tip.amountMinor} onChange={(v) => onTipChange({ ...tip, amountMinor: v })} currency={org.currency} />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {[1000, 2000, 5000].map((v) => (
                  <Button key={v} type="button" variant="outline" size="sm" onClick={() => onTipChange({ ...tip, amountMinor: v })}>
                    {org.money(v, { compact: true })}
                  </Button>
                ))}
              </div>
              <Field label={t("pos.tipFor")}>
                <Select value={tip.staffId ?? "__none"} onValueChange={(v) => onTipChange({ ...tip, staffId: v === "__none" ? null : v })}>
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">{t("pos.noStaff")}</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </PopoverContent>
          </Popover>
        </div>

        <dl className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("pos.subtotal")}</dt>
            <dd className="tabular">{org.money(pricing.subtotalMinor)}</dd>
          </div>
          {pricing.discountMinor > 0 ? (
            <div className="flex justify-between text-primary">
              <dt>{t("pos.discount")}</dt>
              <dd className="tabular">−{org.money(pricing.discountMinor)}</dd>
            </div>
          ) : null}
          {org.settings.tax.enabled ? (
            <div className="flex justify-between text-muted-foreground">
              <dt>{org.settings.tax.pricesIncludeTax ? t("pos.vatIncluded", { amount: "" }).trim() : t("pos.vat")}</dt>
              <dd className="tabular">{org.money(pricing.taxMinor)}</dd>
            </div>
          ) : null}
          {pricing.tipMinor > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("pos.tip")}</dt>
              <dd className="tabular">{org.money(pricing.tipMinor)}</dd>
            </div>
          ) : null}
          <div className="mt-1 flex items-baseline justify-between border-t pt-2">
            <dt className="font-semibold">{t("pos.total")}</dt>
            <dd className="text-xl font-semibold tabular">{org.money(pricing.dueMinor)}</dd>
          </div>
        </dl>
        <Button size="lg" className={cn("w-full")} disabled={lines.length === 0} onClick={onCharge}>
          {t("pos.charge", { amount: org.money(pricing.dueMinor) })}
        </Button>
      </div>
    </div>
  );
}
