"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";

import { addClientTagsAction } from "../actions";
import { TagInput } from "./tag-input";

export function BulkTagDialog({
  open,
  onOpenChange,
  ids,
  suggestions,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  suggestions: string[];
  onDone: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("clients.bulk.addTagTitle")}</DialogTitle>
          <DialogDescription>{t("clients.bulk.addTagDescription", { count: ids.length })}</DialogDescription>
        </DialogHeader>
        {open ? (
          <BulkTagForm
            ids={ids}
            suggestions={suggestions}
            onCancel={() => onOpenChange(false)}
            onDone={() => {
              onOpenChange(false);
              onDone();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BulkTagForm({
  ids,
  suggestions,
  onCancel,
  onDone,
}: {
  ids: string[];
  suggestions: string[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [tags, setTags] = useState<string[]>([]);
  const { run, pending } = useAction(addClientTagsAction, { success: t("clients.bulk.tagsAdded"), onSuccess: onDone });
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (tags.length > 0) void run({ ids, tags });
      }}
    >
      <TagInput value={tags} onChange={setTags} suggestions={suggestions} placeholder={t("clients.form.tagsPlaceholder")} max={10} autoFocus />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending || tags.length === 0}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t("clients.bulk.addTag")}
        </Button>
      </DialogFooter>
    </form>
  );
}
