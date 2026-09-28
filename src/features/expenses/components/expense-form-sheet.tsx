"use client";

import { CalculatorIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { todayKey } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { formatPercent, splitTax } from "@/lib/money";
import { defaultTaxRate } from "@/lib/settings";
import type { ExpenseCategoryDTO } from "@/lib/types";

import { saveExpenseAction } from "../actions";
import type { ExpenseInput } from "../schema";
import type { ExpenseRow, SupplierOption } from "../types";
import { AttachmentField } from "./attachment-field";
import { expenseMethods, paymentMethodLabel } from "./labels";

const NONE = "__none";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseRow | null;
  categories: ExpenseCategoryDTO[];
  suppliers: SupplierOption[];
  onDelete: (expense: ExpenseRow) => void;
}

export function ExpenseFormSheet(props: Props) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ExpenseForm key={props.expense?.id ?? "new"} {...props} /> : null}
    </Sheet>
  );
}

function ExpenseForm({ onOpenChange, expense, categories, suppliers, onDelete }: Props) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const methods = expenseMethods(org.settings.payments.methods);
  const rate = defaultTaxRate(org.settings);
  const [form, setForm] = useState<ExpenseInput>(() =>
    expense
      ? {
          id: expense.id,
          categoryId: expense.categoryId,
          amountMinor: expense.amountMinor,
          taxMinor: expense.taxMinor,
          dateKey: expense.dateKey,
          branchId: expense.branchId,
          vendor: expense.vendor,
          supplierId: expense.supplierId,
          paymentMethod: expense.paymentMethod,
          description: expense.description,
          removeAttachment: false,
        }
      : {
          categoryId: "",
          amountMinor: 0,
          taxMinor: 0,
          dateKey: todayKey(org.timezone),
          branchId: org.branchId ?? org.branches[0]?.id ?? "",
          vendor: "",
          supplierId: null,
          paymentMethod: methods[0]?.id ?? "",
          description: "",
          removeAttachment: false,
        },
  );
  const [file, setFile] = useState<File | null>(null);
  const { run, pending, errorFor } = useAction(saveExpenseAction, {
    success: expense ? t("expenses.saved") : t("expenses.created"),
    onSuccess: () => onOpenChange(false),
  });
  const set = <K extends keyof ExpenseInput>(key: K, value: ExpenseInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const categoryOptions = categories.filter((c) => c.active || c.id === form.categoryId);
  const supplierOptions = suppliers.filter((s) => s.active || s.id === form.supplierId);
  const canSubmit = !!form.categoryId && (form.amountMinor ?? 0) > 0 && !!form.dateKey && !!form.branchId;

  function submit() {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(form));
    if (file) fd.set("file", file);
    void run(fd);
  }

  return (
    <SheetContent className="sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>{expense ? t("expenses.editExpense") : t("expenses.newExpense")}</SheetTitle>
        <SheetDescription>{expense ? `${org.dateKey(expense.dateKey)} · ${org.money(expense.amountMinor)}` : t("expenses.formHint")}</SheetDescription>
      </SheetHeader>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <SheetBody className="grid grid-cols-[minmax(0,1fr)] gap-6">
          <FormSection title={t("common.details")}>
            <Field label={t("common.category")} htmlFor="exp-category" required error={errorFor("categoryId")}>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger id="exp-category" className="min-w-0" aria-invalid={!!errorFor("categoryId")}>
                  <SelectValue placeholder={t("expenses.chooseCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {localName(c, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <FieldGroup className="items-start">
              <Field label={t("expenses.amount")} htmlFor="exp-amount" required hint={t("expenses.amountHint")} error={errorFor("amountMinor")}>
                <MoneyInput
                  id="exp-amount"
                  value={form.amountMinor ?? 0}
                  onChange={(v) => set("amountMinor", v)}
                  currency={org.currency}
                  invalid={!!errorFor("amountMinor")}
                />
              </Field>
              <Field
                label={t("expenses.vat")}
                htmlFor="exp-vat"
                optionalLabel={t("common.optional")}
                error={errorFor("taxMinor")}
                hint={
                  rate ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-50"
                      disabled={!form.amountMinor}
                      onClick={() => set("taxMinor", splitTax(form.amountMinor ?? 0, rate.rateBps, true).taxMinor)}
                    >
                      <CalculatorIcon className="size-3.5" />
                      {t("expenses.calcVat", { rate: formatPercent(rate.rateBps / 10000, locale, 2) })}
                    </button>
                  ) : undefined
                }
              >
                <MoneyInput
                  id="exp-vat"
                  value={form.taxMinor ?? 0}
                  onChange={(v) => set("taxMinor", v)}
                  currency={org.currency}
                  invalid={!!errorFor("taxMinor")}
                />
              </Field>
              <Field label={t("common.date")} htmlFor="exp-date" required error={errorFor("dateKey")}>
                <Input id="exp-date" type="date" value={form.dateKey} onChange={(e) => set("dateKey", e.target.value)} />
              </Field>
              {org.branches.length > 1 ? (
                <Field label={t("common.branch")} htmlFor="exp-branch" required error={errorFor("branchId")}>
                  <Select value={form.branchId} onValueChange={(v) => set("branchId", v)}>
                    <SelectTrigger id="exp-branch">
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
              <Field label={t("expenses.paymentMethod")} htmlFor="exp-method" error={errorFor("paymentMethod")}>
                <Select value={form.paymentMethod || NONE} onValueChange={(v) => set("paymentMethod", v === NONE ? "" : v)}>
                  <SelectTrigger id="exp-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("expenses.notSpecified")}</SelectItem>
                    {methods.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {paymentMethodLabel(org.settings.payments.methods, m.id, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </FormSection>

          <Separator />

          <FormSection title={t("expenses.paidTo")}>
            <FieldGroup className="items-start">
              {suppliers.length > 0 ? (
                <Field label={t("expenses.supplier")} htmlFor="exp-supplier" optionalLabel={t("common.optional")} error={errorFor("supplierId")}>
                  <Select
                    value={form.supplierId ?? NONE}
                    onValueChange={(v) => {
                      const id = v === NONE ? null : v;
                      const prev = suppliers.find((s) => s.id === form.supplierId);
                      const next = suppliers.find((s) => s.id === id);
                      setForm((f) => ({
                        ...f,
                        supplierId: id,
                        // Mirror the supplier name into vendor unless the user typed something else.
                        vendor: !f.vendor || f.vendor === prev?.name ? (next?.name ?? "") : f.vendor,
                      }));
                    }}
                  >
                    <SelectTrigger id="exp-supplier" className="min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("expenses.noSupplier")}</SelectItem>
                      {supplierOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field
                label={t("expenses.vendor")}
                htmlFor="exp-vendor"
                optionalLabel={t("common.optional")}
                error={errorFor("vendor")}
                className={suppliers.length > 0 ? undefined : "sm:col-span-2"}
              >
                <Input id="exp-vendor" value={form.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder={t("expenses.vendorPlaceholder")} />
              </Field>
            </FieldGroup>
            <Field label={t("common.description")} htmlFor="exp-desc" optionalLabel={t("common.optional")} error={errorFor("description")}>
              <Textarea
                id="exp-desc"
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder={t("expenses.descriptionPlaceholder")}
              />
            </Field>
          </FormSection>

          <Separator />

          <FormSection title={t("expenses.attachment")} description={t("expenses.attachmentDescription")}>
            <AttachmentField
              existing={expense?.attachment ?? null}
              file={file}
              removed={!!form.removeAttachment}
              onFile={setFile}
              onRemovedChange={(v) => set("removeAttachment", v)}
            />
          </FormSection>
        </SheetBody>
        <SheetFooter>
          {expense ? (
            <Button type="button" variant="ghost" className="me-auto text-destructive hover:text-destructive" onClick={() => onDelete(expense)}>
              <Trash2Icon />
              {t("common.delete")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending || !canSubmit}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
