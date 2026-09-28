"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import type { ServiceCategoryDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { saveCategoryAction } from "../actions";

export const CATEGORY_COLORS = ["#8b3a62", "#b4536e", "#c07a3a", "#3f7f6d", "#3e6fa8", "#6b5bb5", "#5b6472", "#a33f3f"];

export function CategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ServiceCategoryDTO | null;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? t("services.editCategory") : t("services.newCategory")}</DialogTitle>
        </DialogHeader>
        {open ? <CategoryForm key={category?.id ?? "new"} category={category} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({ category, onDone }: { category: ServiceCategoryDTO | null; onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(category?.name ?? "");
  const [nameAr, setNameAr] = useState(category?.nameAr ?? "");
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]!);
  const { run, pending, errorFor } = useAction(saveCategoryAction, {
    success: t("services.categorySaved"),
    onSuccess: onDone,
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run({ id: category?.id, name, nameAr, color });
      }}
    >
      <Field label={t("services.categoryName")} htmlFor="cat-name" required error={errorFor("name")}>
        <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("services.categoryNamePlaceholder")} autoFocus />
      </Field>
      <Field label={t("common.nameAr")} htmlFor="cat-name-ar" optionalLabel={t("common.optional")}>
        <Input id="cat-name-ar" dir="rtl" lang="ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
      </Field>
      <Field label={t("common.color")}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("common.color")}>
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn(
                "size-7 rounded-full border-2 border-transparent outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
                color === c && "ring-2 ring-foreground/60",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t("common.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
