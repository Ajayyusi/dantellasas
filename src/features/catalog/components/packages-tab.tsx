"use client";

import { MoreHorizontalIcon, PackageIcon, PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { formatPercent } from "@/lib/money";
import type { PackageDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { deletePackageAction, setPackageActiveAction } from "../package-actions";
import { packageValueMinor, savingRatio } from "../periods";
import { TabToolbar } from "./catalog-view";
import { PackageFormSheet } from "./package-form-sheet";
import { linesSummary } from "./service-lines-editor";
import type { CatalogService } from "./types";

export function PackagesTab({
  packages: initial,
  soldCounts,
  services,
}: {
  packages: PackageDTO[];
  soldCounts: Record<string, number>;
  services: CatalogService[];
}) {
  const { t, tp, te, locale } = useI18n();
  const org = useOrg();
  const [packages, setPackages] = useState(initial);
  const [synced, setSynced] = useState(initial);
  if (synced !== initial) {
    setSynced(initial);
    setPackages(initial);
  }
  const [sheet, setSheet] = useState<{ open: boolean; pkg: PackageDTO | null }>({ open: false, pkg: null });
  const [deleting, setDeleting] = useState<PackageDTO | null>(null);
  const prices = new Map(services.map((s) => [s.id, s.priceMinor]));

  async function toggle(p: PackageDTO, active: boolean) {
    setPackages((list) => list.map((x) => (x.id === p.id ? { ...x, active } : x)));
    const res = await setPackageActiveAction({ id: p.id, active });
    if (res.ok) toast.success(active ? t("catalog.packages.activated") : t("catalog.packages.deactivated"));
    else {
      toast.error(te(res.error));
      setPackages((list) => list.map((x) => (x.id === p.id ? { ...x, active: !active } : x)));
    }
  }

  const add = (
    <Button onClick={() => setSheet({ open: true, pkg: null })}>
      <PlusIcon />
      {t("catalog.packages.add")}
    </Button>
  );

  return (
    <>
      <TabToolbar description={t("catalog.packages.description")} actions={packages.length > 0 ? add : null} />
      {packages.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={PackageIcon}
            title={t("catalog.packages.empty")}
            description={t("catalog.packages.emptyHint")}
            action={add}
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map((p) => {
            const value = packageValueMinor(p, (id) => prices.get(id));
            const saving = savingRatio(value, p.priceMinor);
            const sold = soldCounts[p.id] ?? 0;
            return (
              <li key={p.id} className={cn("flex flex-col rounded-xl border bg-card", !p.active && "opacity-70")}>
                <div className="flex items-start gap-3 p-4 pb-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-start outline-none focus-visible:underline"
                    onClick={() => setSheet({ open: true, pkg: p })}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[16px] font-semibold">{localName(p, locale)}</h3>
                      <Badge variant={p.kind === "credit" ? "info" : "primary"}>{t(`catalog.packages.kinds.${p.kind}`)}</Badge>
                      {!p.active ? <Badge variant="neutral">{t("common.inactive")}</Badge> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[14px] text-muted-foreground">
                      {p.kind === "credit"
                        ? t("catalog.packages.creditSummary", { value: org.money(p.creditMinor) })
                        : linesSummary(p.items, services, locale)}
                    </p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setSheet({ open: true, pkg: p })}>
                        <PencilIcon />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toggle(p, !p.active)}>
                        <PowerIcon />
                        {p.active ? t("catalog.deactivate") : t("catalog.activate")}
                      </DropdownMenuItem>
                      {sold === 0 ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setDeleting(p)}>
                            <Trash2Icon />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 px-4 pb-3">
                  <div>
                    <div className="text-xl font-semibold tabular">{org.money(p.priceMinor)}</div>
                    {saving ? (
                      <div className="flex flex-wrap items-center gap-2 text-[14px]">
                        <span className="text-muted-foreground line-through tabular">{org.money(value)}</span>
                        <Badge variant="success">{t("catalog.packages.save", { percent: formatPercent(saving, locale) })}</Badge>
                      </div>
                    ) : value > 0 ? (
                      <div className="text-[14px] text-muted-foreground tabular">
                        {t("catalog.packages.valueOf", { value: org.money(value) })}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3 border-t px-4 py-2.5 text-[14px] text-muted-foreground">
                  <span>
                    {p.validityDays > 0
                      ? t("catalog.packages.validFor", { days: p.validityDays })
                      : t("catalog.packages.noExpiry")}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="tabular">{tp("catalog.packages.soldCount", sold)}</span>
                  <Switch
                    className="ms-auto"
                    checked={p.active}
                    onCheckedChange={(v) => toggle(p, v)}
                    aria-label={t("common.active")}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PackageFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        pkg={sheet.pkg}
        services={services}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("catalog.packages.delete")}
        description={deleting ? t("catalog.packages.deleteConfirm", { name: deleting.name }) : undefined}
        destructive
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deletePackageAction({ id: deleting.id });
          if (res.ok) toast.success(t("common.deleted"));
          else toast.error(te(res.error));
        }}
      />
    </>
  );
}
