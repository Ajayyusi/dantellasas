"use client";

import { ChevronRightIcon, LockIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import type { RoleDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { deleteRoleAction } from "../role-actions";
import { SectionHeader } from "./form-parts";
import { CreateRoleDialog, RenameRoleDialog } from "./role-dialogs";
import { RoleEditor } from "./role-editor";

export function RolesView({ roles }: { roles: RoleDTO[] }) {
  const { t, tp, te, locale } = useI18n();
  const firstEditable = roles.find((r) => !r.locked && r.key !== "owner") ?? roles[0];
  const [selectedId, setSelectedId] = useState(firstEditable?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<RoleDTO | null>(null);
  const [deleting, setDeleting] = useState<RoleDTO | null>(null);
  const selected = roles.find((r) => r.id === selectedId) ?? firstEditable;

  return (
    <div className="grid gap-4">
      <SectionHeader
        title={t("settings.sections.roles.title")}
        description={t("settings.sections.roles.description")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            {t("settings.roles.add")}
          </Button>
        }
      />
      <div className="grid items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="overflow-hidden xl:sticky xl:top-20">
          <ul className="divide-y" role="listbox" aria-label={t("settings.roles.selectRole")}>
            {roles.map((r) => {
              const active = r.id === selected?.id;
              return (
                <li key={r.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 py-2.5 text-start outline-none focus-visible:bg-accent",
                      active ? "bg-primary/8 text-foreground" : "hover:bg-muted/40",
                    )}
                  >
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className={cn("flex items-center gap-1.5 truncate text-sm", active && "font-semibold")}>
                        {r.locked ? <LockIcon className="size-3 shrink-0 text-muted-foreground" /> : null}
                        {localName(r, locale)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tp("settings.roles.memberCount", r.memberCount ?? 0)} ·{" "}
                        {r.system ? t("settings.roles.system") : t("settings.roles.custom")}
                      </span>
                    </span>
                    <ChevronRightIcon className={cn("rtl-flip size-4 shrink-0 text-muted-foreground", !active && "opacity-40")} />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
        {selected ? (
          <RoleEditor
            key={`${selected.id}:${selected.permissions.join(",")}`}
            role={selected}
            onRename={() => setRenaming(selected)}
            onDelete={() => setDeleting(selected)}
          />
        ) : null}
      </div>

      <CreateRoleDialog
        open={creating}
        onOpenChange={setCreating}
        roles={roles}
        defaultCloneId={selected?.id ?? roles[0]?.id ?? ""}
        onCreated={setSelectedId}
      />
      <RenameRoleDialog role={renaming} onOpenChange={(o) => !o && setRenaming(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting ? t("settings.roles.deleteTitle", { name: localName(deleting, locale) }) : ""}
        description={t("settings.roles.deleteBody")}
        destructive
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteRoleAction({ id: deleting.id });
          if (res.ok) {
            toast.success(t("settings.roles.deleted"));
            setSelectedId(firstEditable?.id ?? "");
          } else toast.error(te(res.error));
        }}
      />
    </div>
  );
}
