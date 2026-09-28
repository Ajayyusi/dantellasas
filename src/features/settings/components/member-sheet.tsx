"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { MultiSelect } from "@/components/common/multi-select";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import { ORG_WIDE_ROLES, type RoleKey } from "@/lib/permissions";
import type { BranchDTO, MemberDTO } from "@/lib/types";

import { inviteMemberAction, updateMemberAction, type SetupLinkResult } from "../member-actions";
import type { RoleOption, StaffOption } from "../types";

const NO_STAFF = "__none";

interface FormState {
  email: string;
  displayName: string;
  roleId: string;
  allBranches: boolean;
  branchIds: string[];
  staffId: string | null;
}

export interface MemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberDTO | null;
  roles: RoleOption[];
  branches: BranchDTO[];
  staff: StaffOption[];
  actorIsOwner: boolean;
  onInvited: (result: SetupLinkResult) => void;
}

export function MemberSheet(props: MemberSheetProps) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <MemberForm key={props.member?.uid ?? "new"} {...props} /> : null}
    </Sheet>
  );
}

function MemberForm({ onOpenChange, member, roles, branches, staff, actorIsOwner, onInvited }: MemberSheetProps) {
  const { t, locale } = useI18n();
  const defaultRole = roles.find((r) => r.key === "receptionist") ?? roles.find((r) => r.key !== "owner") ?? roles[0];
  const [form, setForm] = useState<FormState>(() => ({
    email: member?.email ?? "",
    displayName: member?.displayName ?? "",
    roleId: member?.roleId ?? defaultRole?.id ?? "",
    allBranches: member?.allBranches ?? true,
    branchIds: member?.branchIds ?? [],
    staffId: member?.staffId ?? null,
  }));
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const close = () => onOpenChange(false);

  const invite = useAction(inviteMemberAction, {
    success: t("settings.users.invited"),
    onSuccess: (res) => {
      close();
      onInvited(res);
    },
  });
  const update = useAction(updateMemberAction, { success: t("settings.users.updated"), onSuccess: close });
  const { pending, errorFor } = member ? update : invite;

  const role = roles.find((r) => r.id === form.roleId);
  const orgWide = !!role && ORG_WIDE_ROLES.includes(role.key as RoleKey);
  const staffChoices = staff.filter((s) => !s.memberUid || s.memberUid === member?.uid);
  const needsBranches = !orgWide && !form.allBranches && form.branchIds.length === 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const access = { roleId: form.roleId, allBranches: orgWide || form.allBranches, branchIds: form.branchIds, staffId: form.staffId };
    if (member) void update.run({ uid: member.uid, displayName: form.displayName, ...access });
    else void invite.run({ email: form.email, displayName: form.displayName, ...access });
  }

  return (
    <SheetContent className="sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>{member ? t("settings.users.editTitle") : t("settings.users.addTitle")}</SheetTitle>
        <SheetDescription>{member ? member.email : t("settings.users.addDescription")}</SheetDescription>
      </SheetHeader>
      <form className="contents" onSubmit={submit} noValidate>
        <SheetBody className="grid gap-6">
          <FormSection title={t("common.details")}>
            {member ? null : (
              <Field label={t("settings.users.email")} htmlFor="mb-email" required hint={t("settings.users.emailHint")} error={errorFor("email")}>
                <Input
                  id="mb-email"
                  type="email"
                  dir="ltr"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  autoFocus
                />
              </Field>
            )}
            <Field label={t("settings.users.name")} htmlFor="mb-name" required error={errorFor("displayName")}>
              <Input id="mb-name" value={form.displayName} onChange={(e) => set("displayName", e.target.value)} autoComplete="off" />
            </Field>
            <Field label={t("settings.users.role")} htmlFor="mb-role" required error={errorFor("roleId")}>
              <Select value={form.roleId} onValueChange={(v) => set("roleId", v)}>
                <SelectTrigger id="mb-role">
                  <SelectValue placeholder={t("settings.roles.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id} disabled={r.key === "owner" && !actorIsOwner}>
                      {localName(r, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FormSection>

          <Separator />

          <FormSection title={t("settings.users.branchAccess")}>
            {orgWide ? (
              <p className="text-[13px] text-muted-foreground">{t("settings.users.orgWideRole")}</p>
            ) : (
              <div className="grid gap-3">
                <RadioGroup
                  value={form.allBranches ? "all" : "some"}
                  onValueChange={(v) => set("allBranches", v === "all")}
                  className="grid gap-2"
                  aria-label={t("settings.users.branchAccess")}
                >
                  <label className="flex items-start gap-2.5 text-sm">
                    <RadioGroupItem value="all" className="mt-0.5" />
                    <span className="grid gap-0.5">
                      <span className="font-medium">{t("settings.users.allBranches")}</span>
                      <span className="text-[13px] text-muted-foreground">{t("settings.users.allBranchesHint")}</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm">
                    <RadioGroupItem value="some" />
                    <span className="font-medium">{t("settings.users.specificBranches")}</span>
                  </label>
                </RadioGroup>
                {!form.allBranches ? (
                  <Field error={errorFor("branchIds")}>
                    <MultiSelect
                      options={branches.map((b) => ({ value: b.id, label: b.name, hint: b.active ? undefined : t("settings.branches.inactive") }))}
                      value={form.branchIds}
                      onChange={(v) => set("branchIds", v)}
                      placeholder={t("settings.users.pickBranches")}
                    />
                  </Field>
                ) : null}
              </div>
            )}
          </FormSection>

          <Separator />

          <FormSection title={t("settings.users.linkedStaff")} description={t("settings.users.linkedStaffHint")}>
            <Field error={errorFor("staffId")}>
              <Select value={form.staffId ?? NO_STAFF} onValueChange={(v) => set("staffId", v === NO_STAFF ? null : v)}>
                <SelectTrigger aria-label={t("settings.users.linkedStaff")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_STAFF}>{t("settings.users.noStaff")}</SelectItem>
                  {staffChoices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-5 text-[9px]" />
                      {s.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FormSection>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={pending || !form.displayName.trim() || !form.roleId || (!member && !form.email.trim()) || needsBranches}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {member ? t("common.save") : t("settings.users.add")}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
