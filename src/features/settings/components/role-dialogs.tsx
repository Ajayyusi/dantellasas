"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import type { RoleDTO } from "@/lib/types";

import { createRoleAction, saveRoleAction } from "../role-actions";

export function CreateRoleDialog({
  open,
  onOpenChange,
  roles,
  defaultCloneId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleDTO[];
  defaultCloneId: string;
  onCreated: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.roles.addTitle")}</DialogTitle>
          <DialogDescription>{t("settings.roles.addDescription")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <CreateRoleForm
            key={defaultCloneId}
            roles={roles}
            defaultCloneId={defaultCloneId}
            onDone={(id) => {
              onOpenChange(false);
              if (id) onCreated(id);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateRoleForm({
  roles,
  defaultCloneId,
  onDone,
}: {
  roles: RoleDTO[];
  defaultCloneId: string;
  onDone: (id: string | null) => void;
}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [cloneFromId, setCloneFromId] = useState(defaultCloneId);
  const { run, pending, errorFor } = useAction(createRoleAction, {
    success: t("settings.roles.created"),
    onSuccess: (res) => onDone(res.id),
  });
  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void run({ name, nameAr, cloneFromId });
      }}
    >
      <Field label={t("settings.roles.name")} htmlFor="role-name" required error={errorFor("name")}>
        <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={40} />
      </Field>
      <Field label={t("settings.roles.nameAr")} htmlFor="role-name-ar" optionalLabel={t("common.optional")}>
        <Input id="role-name-ar" dir="rtl" lang="ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} maxLength={40} />
      </Field>
      <Field label={t("settings.roles.cloneFrom")} htmlFor="role-clone">
        <Select value={cloneFromId} onValueChange={setCloneFromId}>
          <SelectTrigger id="role-clone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {localName(r, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onDone(null)}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t("common.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RenameRoleDialog({ role, onOpenChange }: { role: RoleDTO | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={!!role} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.roles.renameTitle")}</DialogTitle>
        </DialogHeader>
        {role ? <RenameForm key={role.id} role={role} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({ role, onDone }: { role: RoleDTO; onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(role.name);
  const [nameAr, setNameAr] = useState(role.nameAr);
  const [description, setDescription] = useState(role.description);
  const { run, pending, errorFor } = useAction(saveRoleAction, { success: t("common.changesSaved"), onSuccess: onDone });
  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        // Only the naming changes here; permissions are saved as they are stored.
        void run({ id: role.id, name, nameAr, description, permissions: role.permissions });
      }}
    >
      <Field label={t("settings.roles.name")} htmlFor="rn-name" required error={errorFor("name")}>
        <Input id="rn-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={40} />
      </Field>
      <Field label={t("settings.roles.nameAr")} htmlFor="rn-name-ar" optionalLabel={t("common.optional")}>
        <Input id="rn-name-ar" dir="rtl" lang="ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} maxLength={40} />
      </Field>
      <Field label={t("settings.roles.description")} htmlFor="rn-desc" optionalLabel={t("common.optional")}>
        <Textarea id="rn-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {t("common.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
