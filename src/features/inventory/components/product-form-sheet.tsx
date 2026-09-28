"use client";

import { Loader2Icon, Settings2Icon } from "lucide-react";
import { useState } from "react";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { formatPercent } from "@/lib/money";
import type { ProductCategoryDTO, SupplierDTO } from "@/lib/types";

import { saveProductAction } from "../actions";
import type { ProductInput } from "../schema";
import { PRODUCT_USAGES, type ProductRow, type StockOperation } from "../types";
import { ProductStockPanel } from "./product-stock-panel";

const NONE = "__none";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRow | null;
  categories: ProductCategoryDTO[];
  suppliers: SupplierDTO[];
  onManageCategories: () => void;
  onOperation: (product: ProductRow, op: StockOperation) => void;
}

export function ProductFormSheet(props: Props) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ProductForm key={props.product?.id ?? "new"} {...props} /> : null}
    </Sheet>
  );
}

function fromProduct(p: ProductRow): ProductInput {
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    nameAr: p.nameAr,
    brand: p.brand,
    categoryId: p.categoryId,
    supplierId: p.supplierId,
    costMinor: p.costMinor,
    priceMinor: p.priceMinor,
    taxMode: p.taxExempt ? "exempt" : p.taxRateId ? "rate" : "default",
    taxRateId: p.taxRateId,
    minStock: p.minStock,
    trackStock: p.trackStock,
    usage: p.usage,
    active: p.active,
  };
}

const EMPTY: ProductInput = {
  sku: "",
  barcode: "",
  name: "",
  nameAr: "",
  brand: "",
  categoryId: "",
  supplierId: null,
  costMinor: 0,
  priceMinor: 0,
  taxMode: "default",
  taxRateId: null,
  minStock: 0,
  trackStock: true,
  usage: "retail",
  active: true,
};

function ProductForm({ onOpenChange, product, categories, suppliers, onManageCategories, onOperation }: Props) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const [form, setForm] = useState<ProductInput>(() => (product ? fromProduct(product) : EMPTY));
  const { run, pending, errorFor } = useAction(saveProductAction, {
    success: product ? t("inventory.productSaved") : t("inventory.productCreated"),
    onSuccess: () => onOpenChange(false),
  });
  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const tax = org.settings.tax;
  const defaultRate = tax.rates.find((r) => r.isDefault) ?? tax.rates[0];
  const margin = (form.priceMinor ?? 0) > 0 ? ((form.priceMinor ?? 0) - (form.costMinor ?? 0)) / (form.priceMinor ?? 1) : null;

  return (
    <SheetContent className="sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{product ? t("inventory.editProduct") : t("inventory.newProduct")}</SheetTitle>
        {product ? (
          <SheetDescription>
            {localName(product, locale)}
            {product.brand ? ` · ${product.brand}` : ""}
          </SheetDescription>
        ) : null}
      </SheetHeader>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          void run(form);
        }}
      >
        <SheetBody className="grid grid-cols-[minmax(0,1fr)] gap-6">
          {product ? (
            <>
              <ProductStockPanel product={product} onOperation={(op) => onOperation(product, op)} />
              <Separator />
            </>
          ) : null}

          <FormSection title={t("common.details")}>
            <Field label={t("inventory.productName")} htmlFor="prd-name" required error={errorFor("name")}>
              <Input
                id="prd-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("inventory.productNamePlaceholder")}
                aria-invalid={!!errorFor("name")}
                autoFocus={!product}
              />
            </Field>
            <Field label={t("common.nameAr")} htmlFor="prd-name-ar" hint={t("common.nameArHint")} optionalLabel={t("common.optional")}>
              <Input id="prd-name-ar" dir="rtl" lang="ar" value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} />
            </Field>
            <FieldGroup className="items-start">
              <Field label={t("inventory.brand")} htmlFor="prd-brand" optionalLabel={t("common.optional")} error={errorFor("brand")}>
                <Input id="prd-brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder={t("inventory.brandPlaceholder")} />
              </Field>
              <Field
                label={t("common.category")}
                htmlFor="prd-category"
                error={errorFor("categoryId")}
                labelAction={
                  <button type="button" onClick={onManageCategories} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Settings2Icon className="size-3" />
                    {t("inventory.manage")}
                  </button>
                }
              >
                <Select value={form.categoryId || NONE} onValueChange={(v) => set("categoryId", v === NONE ? "" : v)}>
                  <SelectTrigger id="prd-category" className="min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("inventory.uncategorized")}</SelectItem>
                    {categories
                      .filter((c) => c.active || c.id === form.categoryId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {localName(c, locale)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("inventory.sku")} htmlFor="prd-sku" optionalLabel={t("common.optional")} error={errorFor("sku")}>
                <Input id="prd-sku" value={form.sku} onChange={(e) => set("sku", e.target.value)} dir="ltr" aria-invalid={!!errorFor("sku")} />
              </Field>
              <Field label={t("inventory.barcode")} htmlFor="prd-barcode" optionalLabel={t("common.optional")} error={errorFor("barcode")}>
                <Input
                  id="prd-barcode"
                  value={form.barcode}
                  onChange={(e) => set("barcode", e.target.value)}
                  inputMode="numeric"
                  dir="ltr"
                  aria-invalid={!!errorFor("barcode")}
                />
              </Field>
              <Field label={t("inventory.supplier")} htmlFor="prd-supplier" error={errorFor("supplierId")}>
                <Select value={form.supplierId ?? NONE} onValueChange={(v) => set("supplierId", v === NONE ? null : v)}>
                  <SelectTrigger id="prd-supplier" className="min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("inventory.noSupplier")}</SelectItem>
                    {suppliers
                      .filter((s) => s.active || s.id === form.supplierId)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("inventory.usage")} htmlFor="prd-usage" hint={t(`inventory.usageHint.${form.usage ?? "retail"}`)}>
                <Select value={form.usage} onValueChange={(v) => set("usage", v as ProductInput["usage"])}>
                  <SelectTrigger id="prd-usage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_USAGES.map((u) => (
                      <SelectItem key={u} value={u}>
                        {t(`inventory.usages.${u}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </FormSection>

          <Separator />

          <FormSection title={t("inventory.pricing")}>
            <FieldGroup className="items-start">
              <Field label={t("inventory.cost")} htmlFor="prd-cost" hint={t("inventory.costHint")} error={errorFor("costMinor")}>
                <MoneyInput id="prd-cost" value={form.costMinor ?? 0} onChange={(v) => set("costMinor", v)} currency={org.currency} />
              </Field>
              <Field
                label={t("inventory.sellingPrice")}
                htmlFor="prd-price"
                hint={
                  [tax.enabled ? (tax.pricesIncludeTax ? t("inventory.priceInclTax") : t("inventory.priceExclTax")) : "", margin !== null ? t("inventory.margin", { margin: formatPercent(margin, locale) }) : ""]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                error={errorFor("priceMinor")}
              >
                <MoneyInput id="prd-price" value={form.priceMinor ?? 0} onChange={(v) => set("priceMinor", v)} currency={org.currency} />
              </Field>
              {tax.enabled ? (
                <Field label={t("inventory.tax")} htmlFor="prd-tax" error={errorFor("taxRateId")}>
                  <Select
                    value={form.taxMode === "rate" ? `rate:${form.taxRateId}` : (form.taxMode ?? "default")}
                    onValueChange={(v) => {
                      if (v.startsWith("rate:")) setForm((f) => ({ ...f, taxMode: "rate", taxRateId: v.slice(5) }));
                      else setForm((f) => ({ ...f, taxMode: v as "default" | "exempt", taxRateId: null }));
                    }}
                  >
                    <SelectTrigger id="prd-tax">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        {t("inventory.taxDefault", { rate: defaultRate ? formatPercent(defaultRate.rateBps / 10000, locale, 2) : "0%" })}
                      </SelectItem>
                      {tax.rates
                        .filter((r) => !r.isDefault)
                        .map((r) => (
                          <SelectItem key={r.id} value={`rate:${r.id}`}>
                            {r.name} ({formatPercent(r.rateBps / 10000, locale, 2)})
                          </SelectItem>
                        ))}
                      <SelectItem value="exempt">{t("inventory.taxExempt")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </FieldGroup>
          </FormSection>

          <Separator />

          <FormSection title={t("inventory.stockSettings")}>
            <label className="flex items-center justify-between gap-4">
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{t("inventory.trackStock")}</span>
                <span className="text-[13px] text-muted-foreground">{t("inventory.trackStockHint")}</span>
              </span>
              <Switch checked={form.trackStock} onCheckedChange={(v) => set("trackStock", v)} />
            </label>
            {form.trackStock ? (
              <Field label={t("inventory.minStock")} htmlFor="prd-min" hint={t("inventory.minStockHint")} error={errorFor("minStock")} className="sm:max-w-[50%]">
                <Input
                  id="prd-min"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={String(form.minStock ?? 0)}
                  onChange={(e) => set("minStock", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  className="tabular"
                />
              </Field>
            ) : null}
            <label className="flex items-center justify-between gap-4">
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{t("common.active")}</span>
                <span className="text-[13px] text-muted-foreground">{t("inventory.activeHint")}</span>
              </span>
              <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
            </label>
          </FormSection>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending || !form.name.trim()}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
