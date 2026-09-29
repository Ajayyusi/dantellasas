"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";
import type { StaffDTO } from "@/lib/types";

import { saveStaffAction, uploadStaffPhotoAction } from "../actions";
import { emptyStaff, fromStaff, toInput, type StaffFormState } from "./form-state";
import { CommissionSection, HrSection, ProfileSection } from "./staff-form-sections";
import { ScheduleEditor } from "./schedule-editor";
import { ServicesPicker, type CategoryOption, type ServiceOption } from "./services-picker";

const TAB_FIELDS: Record<string, (key: string) => boolean> = {
  profile: (k) => !/^(schedule|commission|hr|serviceIds)/.test(k),
  services: (k) => k.startsWith("serviceIds"),
  schedule: (k) => k.startsWith("schedule"),
  commission: (k) => k.startsWith("commission"),
  hr: (k) => k.startsWith("hr"),
};

export interface StaffFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffDTO | null;
  services: ServiceOption[];
  categories: CategoryOption[];
  /** Used to pick a default colour for a new member. */
  staffCount: number;
  onSaved?: (id: string) => void;
}

export function StaffFormSheet(props: StaffFormSheetProps) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <StaffForm key={props.staff?.id ?? "new"} {...props} /> : null}
    </Sheet>
  );
}

function StaffForm({ onOpenChange, staff, services, categories, staffCount, onSaved }: StaffFormSheetProps) {
  const { t } = useI18n();
  const org = useOrg();
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState<StaffFormState>(() =>
    staff
      ? fromStaff(staff)
      : emptyStaff(
          org.branches.find((b) => b.id === org.branchId) ?? org.branches[0],
          staffCount,
          services.filter((s) => s.openToAll).map((s) => s.id),
        ),
  );
  const [photo, setPhoto] = useState<File | null>(null);

  const { run, pending, errorFor, fieldErrors } = useAction(saveStaffAction, {
    success: staff ? t("staff.saved") : t("staff.created"),
    onSuccess: async ({ id }) => {
      if (photo) {
        const fd = new FormData();
        fd.set("staffId", id);
        fd.set("file", photo);
        const res = await uploadStaffPhotoAction(fd).catch(() => null);
        if (!res?.ok) toast.error(t("staff.photo.failed"));
      }
      onOpenChange(false);
      onSaved?.(id);
    },
  });

  const errorTabs = new Set(
    Object.keys(fieldErrors).flatMap((k) => Object.entries(TAB_FIELDS).filter(([, m]) => m(k)).map(([tabKey]) => tabKey)),
  );
  const tabs = ["profile", "services", "schedule", "commission", "hr"] as const;

  return (
    <SheetContent className="sm:max-w-2xl">
      <SheetHeader>
        <SheetTitle>{staff ? t("staff.editStaff") : t("staff.newStaff")}</SheetTitle>
        <SheetDescription>{staff ? staff.displayName : t("staff.form.newDescription")}</SheetDescription>
      </SheetHeader>
      <form
        id="staff-form"
        className="contents"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await run(toInput(form, staff?.id));
          if (!res.ok && res.fieldErrors) {
            const firstTab = tabs.find((tk) => Object.keys(res.fieldErrors ?? {}).some((k) => TAB_FIELDS[tk]!(k)));
            if (firstTab) setTab(firstTab);
          }
        }}
      >
        <SheetBody className="pt-2">
          <Tabs value={tab} onValueChange={setTab} className="gap-5">
            <TabsList className="sticky top-0 z-10 -mx-6 w-auto bg-popover px-6">
              {tabs.map((tk) => (
                <TabsTrigger key={tk} value={tk}>
                  {t(`staff.form.tabs.${tk}`)}
                  {errorTabs.has(tk) ? <span className="size-1.5 rounded-full bg-destructive" aria-hidden /> : null}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="profile">
              <ProfileSection form={form} setForm={setForm} staff={staff} onPickPhoto={setPhoto} errorFor={errorFor} />
            </TabsContent>
            <TabsContent value="services" className="grid gap-3">
              <p className="text-[14px] text-muted-foreground">{t("staff.form.servicesHint")}</p>
              <ServicesPicker
                services={services}
                categories={categories}
                value={form.serviceIds}
                onChange={(serviceIds) => setForm((f) => ({ ...f, serviceIds }))}
              />
            </TabsContent>
            <TabsContent value="schedule">
              <ScheduleEditor
                value={form.schedule}
                onChange={(schedule) => setForm((f) => ({ ...f, schedule }))}
                errorFor={errorFor}
              />
            </TabsContent>
            <TabsContent value="commission">
              <CommissionSection form={form} setForm={setForm} errorFor={errorFor} />
            </TabsContent>
            <TabsContent value="hr">
              <HrSection form={form} setForm={setForm} errorFor={errorFor} />
            </TabsContent>
          </Tabs>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending || !form.firstName.trim()}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
