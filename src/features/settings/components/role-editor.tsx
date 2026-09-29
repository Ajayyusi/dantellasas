"use client";

import { Loader2Icon, LockIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, type Permission } from "@/lib/permissions";
import type { RoleDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { saveRoleAction } from "../role-actions";
import { roleDescription } from "./role-labels";

/**
 * Permission matrix for one role. Keyed by the role's saved permissions, so a
 * save (which revalidates the page) remounts it with the new baseline.
 */
export function RoleEditor({
  role,
  onRename,
  onDelete,
}: {
  role: RoleDTO;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { t, tp, locale } = useI18n();
  const locked = role.locked || role.key === "owner";
  const baseline = locked ? ALL_PERMISSIONS : ALL_PERMISSIONS.filter((p) => role.permissions.includes(p));
  const [perms, setPerms] = useState<Set<string>>(() => new Set(baseline));
  const { run, pending } = useAction(saveRoleAction, { success: t("settings.roles.saved") });
  const dirty = !locked && (perms.size !== baseline.length || baseline.some((p) => !perms.has(p)));

  const toggle = (p: Permission, on: boolean) =>
    setPerms((s) => {
      const next = new Set(s);
      if (on) next.add(p);
      else next.delete(p);
      return next;
    });
  const toggleGroup = (list: readonly Permission[], on: boolean) =>
    setPerms((s) => {
      const next = new Set(s);
      list.forEach((p) => (on ? next.add(p) : next.delete(p)));
      return next;
    });

  function save(e: React.FormEvent) {
    e.preventDefault();
    void run({
      id: role.id,
      name: role.name,
      nameAr: role.nameAr,
      description: role.description,
      permissions: ALL_PERMISSIONS.filter((p) => perms.has(p)),
    });
  }

  return (
    <form onSubmit={save} className="grid min-w-0 gap-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{localName(role, locale)}</h3>
            <Badge variant={role.system ? "neutral" : "outline"}>{role.system ? t("settings.roles.system") : t("settings.roles.custom")}</Badge>
            {locked ? (
              <Badge variant="warning">
                <LockIcon />
                {t("settings.roles.locked")}
              </Badge>
            ) : null}
            <span className="text-[14px] text-muted-foreground">{tp("settings.roles.memberCount", role.memberCount ?? 0)}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{roleDescription(role, t)}</p>
        </div>
        {!locked ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" aria-label={t("common.actions")}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onRename}>
                <PencilIcon />
                {t("settings.roles.rename")}
              </DropdownMenuItem>
              {!role.system ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive disabled={(role.memberCount ?? 0) > 0} onSelect={onDelete}>
                    <Trash2Icon />
                    {t("settings.roles.delete")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {locked ? (
        <p className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-[14px] text-muted-foreground">
          <LockIcon className="mt-0.5 size-4 shrink-0" />
          {t("settings.roles.lockedHint")}
        </p>
      ) : null}

      <div className="grid gap-3">
        {PERMISSION_GROUPS.map((g) => {
          const list = g.permissions as readonly Permission[];
          const on = list.filter((p) => perms.has(p)).length;
          const groupLabel = t(`settings.permissionGroups.${g.key}`);
          const groupId = `grp-${role.id}-${g.key}`;
          return (
            <Card key={g.key} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2.5">
                <Checkbox
                  id={groupId}
                  checked={on === list.length ? true : on > 0 ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleGroup(list, v === true)}
                  disabled={locked}
                  aria-label={t("settings.roles.toggleGroup", { group: groupLabel })}
                />
                <label htmlFor={groupId} className="flex-1 cursor-pointer text-sm font-semibold">
                  {groupLabel}
                </label>
                <span className="text-xs tabular text-muted-foreground">
                  {t("settings.roles.groupCount", { on, total: list.length })}
                </span>
              </div>
              <ul className="divide-y">
                {list.map((p) => {
                  const id = `perm-${role.id}-${p}`;
                  return (
                    <li key={p}>
                      <label htmlFor={id} className={cn("flex items-start gap-3 px-4 py-2.5", !locked && "cursor-pointer hover:bg-muted/30")}>
                        <Checkbox id={id} checked={perms.has(p)} onCheckedChange={(v) => toggle(p, v === true)} disabled={locked} className="mt-0.5" />
                        <span className="grid min-w-0 gap-0.5">
                          <span className="text-sm font-medium">{t(`settings.permissions.${p}.label`)}</span>
                          <span className="text-[14px] text-muted-foreground">{t(`settings.permissions.${p}.description`)}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>

      {!locked ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-2 py-3",
            dirty && "sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t bg-background/90 px-4 backdrop-blur sm:mx-0 sm:px-0 lg:bottom-0",
          )}
        >
          <span className="me-auto text-[14px] text-muted-foreground">
            {dirty ? t("settings.unsaved") : t("settings.roles.membersNote")}
          </span>
          {dirty ? (
            <Button type="button" variant="ghost" onClick={() => setPerms(new Set(baseline))} disabled={pending}>
              {t("settings.discard")}
            </Button>
          ) : null}
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {pending ? t("common.saving") : t("common.saveChanges")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
