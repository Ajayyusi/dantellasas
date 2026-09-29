"use client";

import {
  CheckIcon,
  CreditCardIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
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
import type { MembershipPlanDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { deletePlanAction, setPlanActiveAction } from "../membership-actions";
import { TabToolbar } from "./catalog-view";
import { PlanFormSheet } from "./plan-form-sheet";
import { PlanMembersSheet } from "./plan-members-sheet";
import type { CatalogService } from "./types";

export function MembershipsTab({
  plans: initial,
  activeCounts,
  services,
}: {
  plans: MembershipPlanDTO[];
  activeCounts: Record<string, number>;
  services: CatalogService[];
}) {
  const { t, tp, te, locale } = useI18n();
  const org = useOrg();
  const [plans, setPlans] = useState(initial);
  const [synced, setSynced] = useState(initial);
  if (synced !== initial) {
    setSynced(initial);
    setPlans(initial);
  }
  const [sheet, setSheet] = useState<{ open: boolean; plan: MembershipPlanDTO | null }>({ open: false, plan: null });
  const [membersOf, setMembersOf] = useState<MembershipPlanDTO | null>(null);
  const [deleting, setDeleting] = useState<MembershipPlanDTO | null>(null);
  const serviceById = new Map(services.map((s) => [s.id, s]));

  async function toggle(p: MembershipPlanDTO, active: boolean) {
    setPlans((list) => list.map((x) => (x.id === p.id ? { ...x, active } : x)));
    const res = await setPlanActiveAction({ id: p.id, active });
    if (res.ok) toast.success(active ? t("catalog.memberships.activated") : t("catalog.memberships.deactivated"));
    else {
      toast.error(te(res.error));
      setPlans((list) => list.map((x) => (x.id === p.id ? { ...x, active: !active } : x)));
    }
  }

  const add = (
    <Button onClick={() => setSheet({ open: true, plan: null })}>
      <PlusIcon />
      {t("catalog.memberships.add")}
    </Button>
  );

  return (
    <>
      <TabToolbar description={t("catalog.memberships.description")} actions={plans.length > 0 ? add : null} />
      {plans.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={CreditCardIcon}
            title={t("catalog.memberships.empty")}
            description={t("catalog.memberships.emptyHint")}
            action={add}
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => {
            const members = activeCounts[p.id] ?? 0;
            const benefits: string[] = [];
            if (p.serviceDiscountBps > 0)
              benefits.push(
                t("catalog.memberships.offServices", { percent: formatPercent(p.serviceDiscountBps / 10000, locale, 2) }),
              );
            if (p.productDiscountBps > 0)
              benefits.push(
                t("catalog.memberships.offProducts", { percent: formatPercent(p.productDiscountBps / 10000, locale, 2) }),
              );
            for (const i of p.includedServices) {
              const s = serviceById.get(i.serviceId);
              benefits.push(
                t("catalog.memberships.includedLine", {
                  qty: i.quantity,
                  service: s ? localName(s, locale) : i.serviceName,
                  period: t(`catalog.memberships.periodNouns.${p.period}`),
                }),
              );
            }
            return (
              <li key={p.id} className={cn("flex flex-col rounded-xl border bg-card shadow-sm", !p.active && "opacity-70")}>
                <div className="flex items-start gap-3 p-4 pb-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-start outline-none focus-visible:underline"
                    onClick={() => setSheet({ open: true, plan: p })}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[16px] font-semibold">{localName(p, locale)}</h3>
                      {!p.active ? <Badge variant="neutral">{t("common.inactive")}</Badge> : null}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-semibold tabular">{org.money(p.priceMinor)}</span>
                      <span className="text-[14px] text-muted-foreground">
                        / {t(`catalog.memberships.periodNouns.${p.period}`)}
                      </span>
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setSheet({ open: true, plan: p })}>
                        <PencilIcon />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setMembersOf(p)}>
                        <UsersIcon />
                        {t("catalog.memberships.viewMembers")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toggle(p, !p.active)}>
                        <PowerIcon />
                        {p.active ? t("catalog.deactivate") : t("catalog.activate")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setDeleting(p)}>
                        <Trash2Icon />
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <ul className="grid gap-1.5 px-4 pb-4 text-[14px]">
                  {benefits.length === 0 ? (
                    <li className="text-muted-foreground">{t("catalog.memberships.noBenefits")}</li>
                  ) : (
                    benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" />
                        <span>{b}</span>
                      </li>
                    ))
                  )}
                </ul>
                <div className="mt-auto flex items-center gap-2 border-t px-4 py-2">
                  <Button variant="ghost" size="sm" className="-ms-2" onClick={() => setMembersOf(p)}>
                    <UsersIcon />
                    <span className="tabular">{tp("catalog.memberships.activeMembers", members)}</span>
                  </Button>
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

      <PlanFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        plan={sheet.plan}
        services={services}
      />
      <PlanMembersSheet plan={membersOf} onOpenChange={(o) => !o && setMembersOf(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("catalog.memberships.delete")}
        description={deleting ? t("catalog.memberships.deleteConfirm", { name: deleting.name }) : undefined}
        destructive
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deletePlanAction({ id: deleting.id });
          if (res.ok) toast.success(t("common.deleted"));
          else toast.error(te(res.error));
        }}
      />
    </>
  );
}
