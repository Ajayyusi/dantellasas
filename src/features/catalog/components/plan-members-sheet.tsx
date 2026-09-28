"use client";

import { MoreHorizontalIcon, RefreshCwIcon, UsersIcon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import type { ClientMembershipDTO, MembershipPlanDTO } from "@/lib/types";

import { cancelMembershipAction, listPlanMembersAction, renewMembershipAction } from "../membership-actions";

const STATUS_VARIANT = { active: "success", expired: "warning", cancelled: "neutral" } as const;

export function PlanMembersSheet({
  plan,
  onOpenChange,
}: {
  plan: MembershipPlanDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={!!plan} onOpenChange={onOpenChange}>
      {plan ? <Members key={plan.id} plan={plan} /> : null}
    </Sheet>
  );
}

type LoadState = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; members: ClientMembershipDTO[] };

function Members({ plan }: { plan: MembershipPlanDTO }) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [confirm, setConfirm] = useState<{ kind: "cancel" | "renew"; member: ClientMembershipDTO } | null>(null);

  useEffect(() => {
    let alive = true;
    void listPlanMembersAction({ id: plan.id }).then((res) => {
      if (!alive) return;
      setState(res.ok ? { status: "ready", members: res.data } : { status: "error", error: res.error });
    });
    return () => {
      alive = false;
    };
  }, [plan.id, reload]);

  const patch = (id: string, change: Partial<ClientMembershipDTO>) =>
    setState((s) =>
      s.status === "ready" ? { ...s, members: s.members.map((m) => (m.id === id ? { ...m, ...change } : m)) } : s,
    );

  async function run() {
    if (!confirm) return;
    const { kind, member } = confirm;
    if (kind === "cancel") {
      const res = await cancelMembershipAction({ id: member.id });
      if (!res.ok) return toast.error(te(res.error));
      patch(member.id, { status: "cancelled", autoRenew: false });
      toast.success(t("catalog.members.cancelled"));
    } else {
      const res = await renewMembershipAction({ id: member.id });
      if (!res.ok) return toast.error(te(res.error));
      patch(member.id, { status: "active", endAt: res.data.endAt });
      toast.success(t("catalog.members.renewed", { date: org.date(res.data.endAt) }));
    }
  }

  const members = state.status === "ready" ? state.members : [];
  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <SheetContent className="sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{t("catalog.members.title", { plan: localName(plan, locale) })}</SheetTitle>
        <SheetDescription>
          {state.status === "ready"
            ? t("catalog.members.summary", { active: activeCount, total: members.length })
            : t("common.loading")}
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="px-0 py-0">
        {state.status === "loading" ? (
          <div className="grid gap-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title={te(state.error)}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setState({ status: "loading" });
                  setReload((n) => n + 1);
                }}
              >
                {t("common.retry")}
              </Button>
            }
          />
        ) : members.length === 0 ? (
          <EmptyState icon={UsersIcon} title={t("catalog.members.empty")} description={t("catalog.members.emptyHint")} />
        ) : (
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-6 py-3">
                <PersonAvatar name={m.clientName} className="size-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{m.clientName || t("common.unknown")}</span>
                    <Badge variant={STATUS_VARIANT[m.status]}>{t(`catalog.members.statuses.${m.status}`)}</Badge>
                  </div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground tabular">
                    {org.date(m.startAt)} – {org.date(m.endAt)}
                    {m.autoRenew && m.status === "active" ? ` · ${t("catalog.members.autoRenew")}` : ""}
                  </div>
                </div>
                {m.status !== "cancelled" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setConfirm({ kind: "renew", member: m })}>
                        <RefreshCwIcon />
                        {t("catalog.members.renew")}
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => setConfirm({ kind: "cancel", member: m })}>
                        <XCircleIcon />
                        {t("catalog.members.cancel")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SheetBody>
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "cancel" ? t("catalog.members.cancel") : t("catalog.members.renew")}
        description={
          confirm
            ? confirm.kind === "cancel"
              ? t("catalog.members.cancelConfirm", { name: confirm.member.clientName })
              : t("catalog.members.renewConfirm", {
                  name: confirm.member.clientName,
                  period: t(`catalog.memberships.periodNouns.${plan.period}`),
                })
            : undefined
        }
        destructive={confirm?.kind === "cancel"}
        confirmLabel={confirm?.kind === "cancel" ? t("catalog.members.cancel") : t("catalog.members.renew")}
        onConfirm={run}
      />
    </SheetContent>
  );
}
