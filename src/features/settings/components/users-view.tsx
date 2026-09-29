"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { KeyRoundIcon, MoreHorizontalIcon, PauseCircleIcon, PencilIcon, PlayCircleIcon, PlusIcon, UserMinusIcon, UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/states";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import type { BranchDTO, MemberDTO } from "@/lib/types";

import { memberSetupLinkAction, removeMemberAction, setMemberStatusAction, type SetupLinkResult } from "../member-actions";
import type { RoleOption, StaffOption } from "../types";
import { SectionHeader } from "./form-parts";
import { MemberSheet } from "./member-sheet";
import { SetupLinkDialog } from "./setup-link-dialog";

const STATUS_VARIANT = { active: "success", invited: "info", suspended: "warning" } as const;

export function UsersView({
  members,
  roles,
  branches,
  staff,
}: {
  members: MemberDTO[];
  roles: RoleOption[];
  branches: BranchDTO[];
  staff: StaffOption[];
}) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const me = org.user.uid;
  const actorIsOwner = members.find((m) => m.uid === me)?.roleKey === "owner";
  const [sheet, setSheet] = useState<{ open: boolean; member: MemberDTO | null }>({ open: false, member: null });
  const [link, setLink] = useState<SetupLinkResult | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "suspend" | "remove"; member: MemberDTO } | null>(null);

  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const branchName = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);
  const staffName = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  const roleLabel = (m: MemberDTO) => {
    const r = roleById.get(m.roleId);
    return r ? localName(r, locale) : m.roleName;
  };
  const branchLabel = (m: MemberDTO) =>
    m.allBranches || m.roleKey === "owner" || m.roleKey === "admin"
      ? t("settings.users.allBranches")
      : m.branchIds.map((id) => branchName.get(id)).filter(Boolean).join(", ") || "—";
  const canManage = (m: MemberDTO) => m.uid !== me && (m.roleKey !== "owner" || actorIsOwner);

  async function getLink(m: MemberDTO) {
    const res = await memberSetupLinkAction({ uid: m.uid });
    if (res.ok) setLink(res.data);
    else toast.error(te(res.error));
  }
  async function setStatus(m: MemberDTO, status: "active" | "suspended") {
    const res = await setMemberStatusAction({ uid: m.uid, status });
    if (res.ok) toast.success(status === "active" ? t("settings.users.reactivated") : t("settings.users.suspended"));
    else toast.error(te(res.error));
  }
  async function remove(m: MemberDTO) {
    const res = await removeMemberAction({ uid: m.uid });
    if (res.ok) toast.success(t("settings.users.removed"));
    else toast.error(te(res.error));
  }

  const person = (m: MemberDTO) => (
    <div className="flex min-w-0 items-center gap-3">
      <PersonAvatar name={m.displayName || m.email} className="size-8 text-xs" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{m.displayName || m.email}</span>
          {m.uid === me ? <Badge variant="primary">{t("settings.users.you")}</Badge> : null}
        </div>
        <div className="truncate text-[14px] text-muted-foreground" dir="ltr">
          {m.email}
        </div>
      </div>
    </div>
  );
  const statusBadge = (m: MemberDTO) => <Badge variant={STATUS_VARIANT[m.status]}>{t(`settings.users.statuses.${m.status}`)}</Badge>;

  const menu = (m: MemberDTO) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem disabled={m.roleKey === "owner" && !actorIsOwner} onSelect={() => setSheet({ open: true, member: m })}>
          <PencilIcon />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => getLink(m)}>
          <KeyRoundIcon />
          {t("settings.users.setupLink")}
        </DropdownMenuItem>
        {canManage(m) ? (
          <>
            <DropdownMenuSeparator />
            {m.status === "suspended" ? (
              <DropdownMenuItem onSelect={() => setStatus(m, "active")}>
                <PlayCircleIcon />
                {t("settings.users.reactivate")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => setConfirm({ kind: "suspend", member: m })}>
                <PauseCircleIcon />
                {t("settings.users.suspend")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem destructive onSelect={() => setConfirm({ kind: "remove", member: m })}>
              <UserMinusIcon />
              {t("settings.users.remove")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: ColumnDef<MemberDTO, unknown>[] = [
    {
      id: "name",
      header: t("settings.users.name"),
      accessorFn: (m) => m.displayName || m.email,
      cell: ({ row }) => person(row.original),
      enableHiding: false,
    },
    { id: "role", header: t("settings.users.role"), accessorFn: roleLabel },
    {
      id: "branches",
      header: t("common.branches"),
      accessorFn: branchLabel,
      cell: ({ getValue }) => <span className="line-clamp-2 max-w-56 text-muted-foreground">{String(getValue())}</span>,
    },
    {
      id: "staff",
      header: t("settings.users.linkedStaff"),
      accessorFn: (m) => (m.staffId ? (staffName.get(m.staffId)?.displayName ?? "—") : "—"),
      cell: ({ row, getValue }) => {
        const s = row.original.staffId ? staffName.get(row.original.staffId) : null;
        return s ? (
          <span className="flex items-center gap-2">
            <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-6 text-[11px]" />
            {s.displayName}
          </span>
        ) : (
          <span className="text-muted-foreground">{String(getValue())}</span>
        );
      },
    },
    { id: "status", header: t("settings.users.status"), accessorFn: (m) => m.status, cell: ({ row }) => statusBadge(row.original) },
    { id: "actions", header: "", enableSorting: false, enableHiding: false, cell: ({ row }) => <div className="text-end">{menu(row.original)}</div> },
  ];

  return (
    <div className="grid gap-4">
      <SectionHeader
        title={t("settings.sections.users.title")}
        description={t("settings.sections.users.description")}
        actions={
          <Button onClick={() => setSheet({ open: true, member: null })}>
            <PlusIcon />
            {t("settings.users.add")}
          </Button>
        }
      />
      <DataTable
        data={members}
        columns={columns}
        getRowId={(m) => m.uid}
        searchText={(m) => `${m.displayName} ${m.email}`}
        searchPlaceholder={t("settings.users.searchPlaceholder")}
        facets={[
          {
            id: "role",
            label: t("settings.users.role"),
            options: roles.map((r) => ({ value: r.id, label: localName(r, locale) })),
            match: (m, v) => m.roleId === v,
          },
          {
            id: "status",
            label: t("settings.users.status"),
            options: (["active", "suspended"] as const).map((s) => ({ value: s, label: t(`settings.users.statuses.${s}`) })),
            match: (m, v) => m.status === v,
          },
        ]}
        onRowClick={(m) => (m.roleKey !== "owner" || actorIsOwner ? setSheet({ open: true, member: m }) : undefined)}
        mobileCard={(m) => (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">{person(m)}</div>
            <div className="grid justify-items-end gap-1 text-[14px]">
              {statusBadge(m)}
              <span className="text-muted-foreground">{roleLabel(m)}</span>
            </div>
          </div>
        )}
        empty={
          <EmptyState
            compact
            icon={UsersIcon}
            title={t("settings.users.empty")}
            description={t("settings.users.emptyHint")}
            action={<Button onClick={() => setSheet({ open: true, member: null })}>{t("settings.users.add")}</Button>}
          />
        }
      />

      <MemberSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        member={sheet.member}
        roles={roles}
        branches={branches}
        staff={staff}
        actorIsOwner={actorIsOwner}
        onInvited={setLink}
      />
      <SetupLinkDialog result={link} onOpenChange={(o) => !o && setLink(null)} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm
            ? t(confirm.kind === "suspend" ? "settings.users.suspendTitle" : "settings.users.removeTitle", {
                name: confirm.member.displayName || confirm.member.email,
              })
            : ""
        }
        description={confirm ? t(confirm.kind === "suspend" ? "settings.users.suspendBody" : "settings.users.removeBody") : undefined}
        destructive
        confirmLabel={confirm?.kind === "suspend" ? t("settings.users.suspend") : t("settings.users.remove")}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.kind === "suspend") await setStatus(confirm.member, "suspended");
          else await remove(confirm.member);
        }}
      />
    </div>
  );
}
