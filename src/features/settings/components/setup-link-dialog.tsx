"use client";

import { CheckIcon, CopyIcon, InfoIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";

import type { SetupLinkResult } from "../member-actions";

/** Shows a password-setup link to copy and share — the app never sends emails itself. */
export function SetupLinkDialog({ result, onOpenChange }: { result: SetupLinkResult | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      toast.success(t("settings.users.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (non-secure origin); the field stays selectable.
      document.getElementById("setup-link")?.focus();
    }
  }

  return (
    <Dialog
      open={!!result}
      onOpenChange={(o) => {
        if (!o) setCopied(false);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
            <KeyRoundIcon className="size-5" />
          </div>
          <DialogTitle>{t("settings.users.linkTitle")}</DialogTitle>
          {result ? (
            <DialogDescription>
              {result.created
                ? t("settings.users.linkBodyNew", { name: result.displayName || result.email, email: result.email })
                : t("settings.users.linkBodyExisting", { email: result.email })}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {result ? (
          <div className="flex gap-2">
            <Input
              id="setup-link"
              readOnly
              dir="ltr"
              value={result.link}
              aria-label={t("settings.users.setupLink")}
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button type="button" onClick={copy} className="shrink-0">
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? t("common.copied") : t("settings.users.copyLink")}
            </Button>
          </div>
        ) : null}
        <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-[13px] text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          {t("settings.users.linkNoEmail")}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
