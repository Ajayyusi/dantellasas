"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import type { SupplierDTO } from "@/lib/types";

import { saveSupplierAction } from "../actions";
import type { SupplierInput } from "../schema";

export function SupplierDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierDTO | null;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{supplier ? t("inventory.editSupplier") : t("inventory.newSupplier")}</DialogTitle>
        </DialogHeader>
        {open ? <SupplierForm key={supplier?.id ?? "new"} supplier={supplier} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function SupplierForm({ supplier, onDone }: { supplier: SupplierDTO | null; onDone: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState<SupplierInput>(() =>
    supplier
      ? { ...supplier }
      : { name: "", contactName: "", phone: "", email: "", trn: "", notes: "", active: true },
  );
  const { run, pending, errorFor } = useAction(saveSupplierAction, {
    success: supplier ? t("inventory.supplierSaved") : t("inventory.supplierCreated"),
    onSuccess: onDone,
  });
  const set = <K extends keyof SupplierInput>(key: K, value: SupplierInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(form);
      }}
    >
      <Field label={t("inventory.supplierName")} htmlFor="sup-name" required error={errorFor("name")}>
        <Input
          id="sup-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("inventory.supplierNamePlaceholder")}
          aria-invalid={!!errorFor("name")}
          autoFocus
        />
      </Field>
      <FieldGroup className="items-start">
        <Field label={t("inventory.contactName")} htmlFor="sup-contact" optionalLabel={t("common.optional")} error={errorFor("contactName")}>
          <Input id="sup-contact" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
        </Field>
        <Field label={t("common.phone")} htmlFor="sup-phone" optionalLabel={t("common.optional")} error={errorFor("phone")}>
          <Input id="sup-phone" type="tel" dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+971 4 123 4567" />
        </Field>
        <Field label={t("common.email")} htmlFor="sup-email" optionalLabel={t("common.optional")} error={errorFor("email")}>
          <Input id="sup-email" type="email" dir="ltr" value={form.email} onChange={(e) => set("email", e.target.value.trim())} />
        </Field>
        <Field label={t("inventory.trn")} htmlFor="sup-trn" optionalLabel={t("common.optional")} error={errorFor("trn")}>
          <Input
            id="sup-trn"
            dir="ltr"
            inputMode="numeric"
            value={form.trn}
            onChange={(e) => set("trn", e.target.value)}
            placeholder="100XXXXXXXXXXX3"
            title={t("inventory.trnHint")}
          />
        </Field>
      </FieldGroup>
      <Field label={t("common.notes")} htmlFor="sup-notes" optionalLabel={t("common.optional")} error={errorFor("notes")}>
        <Textarea id="sup-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{t("common.active")}</span>
        <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !form.name.trim()}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t("common.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
