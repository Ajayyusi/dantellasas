"use client";

import { Building2Icon, MapPinIcon, MoreHorizontalIcon, PencilIcon, PhoneIcon, PlusIcon, PowerIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SortableList } from "@/components/common/sortable-list";
import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/client";
import type { BranchDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { reorderBranchesAction, setBranchActiveAction } from "../branch-actions";
import { WEEKDAYS } from "../schema";
import { BranchSheet } from "./branch-sheet";
import { useHydrated } from "./use-hydrated";
import { SectionHeader } from "./form-parts";

export function BranchesView({ branches: initial }: { branches: BranchDTO[] }) {
  const { t, te } = useI18n();
  const [branches, setBranches] = useState(initial);
  const hydrated = useHydrated();
  const [synced, setSynced] = useState(initial);
  if (synced !== initial) {
    // Fresh server data after a mutation replaces the optimistic copy.
    setSynced(initial);
    setBranches(initial);
  }
  const [sheet, setSheet] = useState<{ open: boolean; branch: BranchDTO | null }>({ open: false, branch: null });
  const [deactivating, setDeactivating] = useState<BranchDTO | null>(null);
  const activeCount = branches.filter((b) => b.active).length;

  async function reorder(ids: string[]) {
    setBranches(ids.map((id) => branches.find((b) => b.id === id)!));
    const res = await reorderBranchesAction({ ids });
    if (!res.ok) toast.error(te(res.error));
  }

  async function setActive(b: BranchDTO, active: boolean) {
    const res = await setBranchActiveAction({ id: b.id, active });
    if (res.ok) toast.success(active ? t("settings.branches.activated") : t("settings.branches.deactivated"));
    else toast.error(te(res.error));
  }

  const hoursSummary = (b: BranchDTO) => {
    const open = WEEKDAYS.filter((d) => b.workingHours?.[d]?.open);
    if (open.length === 0) return t("settings.branches.closedAllWeek");
    const first = b.workingHours[open[0]!]!;
    const same = open.every((d) => b.workingHours[d]!.start === first.start && b.workingHours[d]!.end === first.end);
    const days = open.length === 7 ? "" : open.map((d) => t(`common.weekdaysShort.${d}`)).join(" ");
    return [days, same ? `${first.start}–${first.end}` : null].filter(Boolean).join(" · ");
  };

  return (
    <div className="grid gap-4">
      <SectionHeader
        title={t("settings.sections.branches.title")}
        description={t("settings.sections.branches.description")}
        actions={
          <Button onClick={() => setSheet({ open: true, branch: null })}>
            <PlusIcon />
            {t("settings.branches.add")}
          </Button>
        }
      />
      {branches.length === 0 ? (
        <Card>
          <EmptyState icon={Building2Icon} title={t("settings.branches.add")} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <SortableList
            disabled={!hydrated}
            items={branches}
            onReorder={reorder}
            className="divide-y"
            render={(b, handle) => (
              <div className={cn("flex items-center gap-2 px-2 py-3 sm:gap-3 sm:px-3", !b.active && "bg-muted/30")}>
                {handle ?? <span className="size-7 shrink-0" aria-hidden />}
                <button
                  type="button"
                  className="grid min-w-0 flex-1 gap-1 text-start outline-none focus-visible:underline"
                  onClick={() => setSheet({ open: true, branch: b })}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("truncate text-sm font-medium", !b.active && "text-muted-foreground")}>{b.name}</span>
                    {b.code ? (
                      <Badge variant="outline" className="font-mono">
                        {b.code}
                      </Badge>
                    ) : null}
                    {!b.active ? <Badge variant="neutral">{t("settings.branches.inactive")}</Badge> : null}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-0.5 text-[14px] text-muted-foreground">
                    <span className="tabular" dir="auto">{hoursSummary(b)}</span>
                    {b.phone ? (
                      <span className="inline-flex items-center gap-1" dir="ltr">
                        <PhoneIcon className="size-3" />
                        {b.phone}
                      </span>
                    ) : null}
                    {b.address ? (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPinIcon className="size-3 shrink-0" />
                        <span className="truncate">{b.address}</span>
                      </span>
                    ) : null}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setSheet({ open: true, branch: b })}>
                      <PencilIcon />
                      {t("common.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {b.active ? (
                      <DropdownMenuItem destructive disabled={activeCount <= 1} onSelect={() => setDeactivating(b)}>
                        <PowerIcon />
                        {t("settings.branches.deactivate")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => setActive(b, true)}>
                        <PowerIcon />
                        {t("settings.branches.activate")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          />
        </Card>
      )}
      {branches.length > 1 ? <p className="text-[14px] text-muted-foreground">{t("settings.branches.reorderHint")}</p> : null}

      <BranchSheet open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} branch={sheet.branch} />
      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(o) => !o && setDeactivating(null)}
        title={deactivating ? t("settings.branches.deactivateTitle", { name: deactivating.name }) : ""}
        description={t("settings.branches.deactivateBody")}
        destructive
        confirmLabel={t("settings.branches.deactivate")}
        onConfirm={async () => {
          if (deactivating) await setActive(deactivating, false);
        }}
      />
    </div>
  );
}
