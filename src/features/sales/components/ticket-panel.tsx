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
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="border-b p-4">
        <ClientPicker value={client} onChange={onClientChange} />
        {wallet?.membership ? (
          <Badge variant="primary" className="mt-2">
            <HeartHandshakeIcon />
            {t("pos.activeMembership", { plan: wallet.membership.planName })}
          </Badge>
        ) : null}
        {appointmentLabel ? <p className="mt-2 text-[13px] font-medium text-muted-foreground">{appointmentLabel}</p> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-8 py-14 text-center">
            <span className="mb-2 grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <ShoppingBagIcon className="size-6" strokeWidth={1.7} />
            </span>
            <p className="font-display text-[17px] font-bold leading-tight">{t("pos.emptyTicket")}</p>
            <p className="max-w-64 text-[14px] text-muted-foreground">{t("pos.emptyTicketHint")}</p>
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
                <li key={l.key} className="grid animate-fade-up gap-2.5 px-4 py-3.5">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">{l.name}</div>
                      <div className="truncate text-[13px] text-muted-foreground">{l.detail}</div>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="rounded-lg px-1.5 py-0.5 text-end outline-none transition-colors hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring" aria-label={t("pos.editLine")}>
                          <div className="text-[15px] font-semibold tabular">{org.money(priced?.totalMinor ?? 0)}</div>
                          {priced && priced.discountMinor > 0 ? (
                            <div className="text-[13px] tabular text-muted-foreground line-through">{org.money(priced.baseMinor)}</div>
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
                        <SelectTrigger size="sm" className="h-8 w-auto min-w-32 max-w-48 rounded-lg text-[13px]" aria-label={t("pos.staff")}>
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
                      <div className="flex h-8 items-center rounded-lg border bg-card">
                        <button type="button" className="grid size-8 place-items-center rounded-s-lg text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-40" disabled={l.quantity <= 1} onClick={() => update(l.key, { quantity: l.quantity - 1 })} aria-label={t("common.remove")}>
                          <MinusIcon className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-[14px] font-semibold tabular">{l.quantity}</span>
                        <button type="button" className="grid size-8 place-items-center rounded-e-lg text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary" onClick={() => update(l.key, { quantity: l.quantity + 1 })} aria-label={t("common.add")}>
                          <PlusIcon className="size-3.5" />
                        </button>
                      </div>
                    ) : null}
                    {redeemable ? (
                      <Button type="button" variant="soft" size="sm" className="h-8 text-[13px]" onClick={() => update(l.key, { redeemClientPackageId: redeemable.id })}>
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
                    <Button type="button" variant="ghost" size="icon-sm" className="ms-auto size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => onLinesChange(lines.filter((x) => x.key !== l.key))} aria-label={t("pos.removeLine")}>
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-3.5 border-t bg-muted/35 p-4">
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

        <dl className="grid gap-1.5 text-[15px]">
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
          <div className="mt-1.5 flex items-baseline justify-between border-t border-dashed pt-3">
            <dt className="text-base font-semibold">{t("pos.total")}</dt>
            <dd className="font-display text-[26px] font-bold leading-none tabular">{org.money(pricing.dueMinor)}</dd>
          </div>
        </dl>
        <Button size="lg" className={cn("h-12 w-full rounded-xl text-[16px]")} disabled={lines.length === 0} onClick={onCharge}>
          {t("pos.charge", { amount: org.money(pricing.dueMinor) })}
        </Button>
      </div>
    </div>
  );
}
