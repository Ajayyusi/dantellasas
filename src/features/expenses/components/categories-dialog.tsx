"use client";

import { CheckIcon, Loader2Icon, PencilIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/utils";

export interface SimpleCategory {
  id: string;
  name: string;
  nameAr: string;
  active: boolean;
}

export interface CategoryActions {
  save: (input: { id?: string; name: string; nameAr?: string }) => Promise<ActionResult<{ id: string }>>;
  setActive: (input: { id: string; active: boolean }) => Promise<ActionResult<null>>;
}

interface Labels {
  title: string;
  description: string;
  add: string;
  placeholder: string;
  saved: string;
  activated: string;
  deactivated: string;
}

/**
 * Add, rename (incl. Arabic name) and deactivate simple categories. Used for
 * expense categories and product categories; the actions decide which.
 */
export function CategoriesDialog({
  open,
  onOpenChange,
  categories,
  actions,
  labels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: SimpleCategory[];
  actions: CategoryActions;
  labels: Labels;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setEditing(null);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <ul className="-mx-2 grid max-h-[50vh] gap-0.5 overflow-y-auto px-2 scrollbar-thin">
          {categories.map((c) =>
            editing === c.id ? (
              <li key={c.id}>
                <CategoryEditor category={c} actions={actions} labels={labels} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <CategoryRow key={c.id} category={c} actions={actions} labels={labels} onEdit={() => setEditing(c.id)} />
            ),
          )}
        </ul>
        <div className="border-t pt-4">
          {editing === "new" ? (
            <CategoryEditor category={null} actions={actions} labels={labels} onDone={() => setEditing(null)} />
          ) : (
            <Button variant="outline" onClick={() => setEditing("new")}>
              <PlusIcon />
              {labels.add}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({
  category,
  actions,
  labels,
  onEdit,
}: {
  category: SimpleCategory;
  actions: CategoryActions;
  labels: Labels;
  onEdit: () => void;
}) {
  const { t, te } = useI18n();
  const [active, setActive] = useState(category.active);
  const [synced, setSynced] = useState(category.active);
  if (synced !== category.active) {
    setSynced(category.active);
    setActive(category.active);
  }
  return (
    <li className={cn("flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40", !active && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{category.name}</span>
          {!active ? <Badge variant="neutral">{t("common.inactive")}</Badge> : null}
        </div>
        {category.nameAr ? (
          <span dir="rtl" lang="ar" className="inline-block max-w-full truncate align-top text-[13px] text-muted-foreground">
            {category.nameAr}
          </span>
        ) : null}
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={t("common.edit")}>
        <PencilIcon />
      </Button>
      <Switch
        checked={active}
        aria-label={t("common.active")}
        onCheckedChange={async (v) => {
          setActive(v);
          const res = await actions.setActive({ id: category.id, active: v });
          if (res.ok) toast.success(v ? labels.activated : labels.deactivated);
          else {
            setActive(!v);
            toast.error(te(res.error));
          }
        }}
      />
    </li>
  );
}

function CategoryEditor({
  category,
  actions,
  labels,
  onDone,
}: {
  category: SimpleCategory | null;
  actions: CategoryActions;
  labels: Labels;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(category?.name ?? "");
  const [nameAr, setNameAr] = useState(category?.nameAr ?? "");
  const { run, pending, errorFor } = useAction(actions.save, {
    success: labels.saved,
    onSuccess: onDone,
  });
  return (
    <form
      className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        void run({ id: category?.id, name, nameAr });
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={labels.placeholder}
        aria-label={t("common.name")}
        aria-invalid={!!errorFor("name")}
        autoFocus
      />
      <Input dir="rtl" lang="ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t("common.nameAr")} aria-label={t("common.nameAr")} />
      <div className="flex gap-1">
        <Button type="submit" size="icon" disabled={pending || !name.trim()} aria-label={t("common.save")}>
          {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onDone} aria-label={t("common.cancel")}>
          <XIcon />
        </Button>
      </div>
    </form>
  );
}
