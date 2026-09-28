"use client";

import { FileTextIcon, ImageIcon, PaperclipIcon, RefreshCwIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import type { ExpenseDTO } from "@/lib/types";

import { RECEIPT_ACCEPT, RECEIPT_MAX_MB } from "../schema";

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Receipt picker: shows the current file (with link), lets you replace or remove it. */
export function AttachmentField({
  existing,
  file,
  removed,
  onFile,
  onRemovedChange,
}: {
  existing: ExpenseDTO["attachment"];
  file: File | null;
  removed: boolean;
  onFile: (file: File | null) => void;
  onRemovedChange: (removed: boolean) => void;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const shown = file
    ? { name: file.name, size: file.size, contentType: file.type, url: null as string | null }
    : existing && !removed
      ? existing
      : null;
  const Icon = shown?.contentType === "application/pdf" ? FileTextIcon : ImageIcon;

  return (
    <div className="grid gap-2">
      <input
        ref={input}
        type="file"
        accept={RECEIPT_ACCEPT.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (!f) return;
          if (!RECEIPT_ACCEPT.includes(f.type)) {
            toast.error(t("expenses.attachmentType"));
            return;
          }
          if (f.size > RECEIPT_MAX_MB * 1024 * 1024) {
            toast.error(t("expenses.attachmentTooLarge", { max: RECEIPT_MAX_MB }));
            return;
          }
          onFile(f);
        }}
      />
      {shown ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-card text-muted-foreground shadow-sm">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            {shown.url ? (
              <a href={shown.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-primary hover:underline">
                {shown.name}
              </a>
            ) : (
              <span className="block truncate text-sm font-medium">{shown.name}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatSize(shown.size)}
              {file ? ` · ${t("expenses.attachmentPending")}` : ""}
            </span>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => input.current?.click()} aria-label={t("expenses.replaceAttachment")}>
            <RefreshCwIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (file) onFile(null);
              else onRemovedChange(true);
            }}
            aria-label={t("expenses.removeAttachment")}
          >
            <Trash2Icon />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => input.current?.click()}>
            <PaperclipIcon />
            {t("expenses.attachReceipt")}
          </Button>
          <span className="text-xs text-muted-foreground">{t("expenses.attachmentHint", { max: RECEIPT_MAX_MB })}</span>
          {existing && removed ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onRemovedChange(false)}>
              <Undo2Icon />
              {t("expenses.undoRemove")}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
