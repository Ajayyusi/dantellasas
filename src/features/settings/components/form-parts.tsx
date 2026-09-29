"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Title row of a settings section (h2 under the page's h1). */
export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SettingsCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      {title ? (
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action}
        </CardHeader>
      ) : null}
      <CardContent className={cn(!title && "pt-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

/** A labelled switch row: title, one-line hint and the control at the end. */
export function ToggleRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <label htmlFor={id} className="grid min-w-0 cursor-pointer gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-[14px] text-muted-foreground">{hint}</span> : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

/** Sticky footer for a settings form: appears active only when something changed. */
export function SaveBar({
  dirty,
  pending,
  onReset,
  disabled,
}: {
  dirty: boolean;
  pending: boolean;
  onReset: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 py-3",
        // Only pinned to the viewport while there is something to save.
        dirty && "sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t bg-background/90 px-4 backdrop-blur sm:mx-0 sm:px-0 lg:bottom-0",
      )}
    >
      {dirty ? <span className="me-auto text-[14px] text-muted-foreground">{t("settings.unsaved")}</span> : null}
      {dirty ? (
        <Button type="button" variant="ghost" onClick={onReset} disabled={pending}>
          {t("settings.discard")}
        </Button>
      ) : null}
      <Button type="submit" disabled={!dirty || pending || disabled}>
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        {pending ? t("common.saving") : t("common.saveChanges")}
      </Button>
    </div>
  );
}
