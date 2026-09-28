"use client";

import { ArrowLeftIcon, CalendarCheckIcon, MailIcon, MapPinIcon, PencilIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";

import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { formatPercent } from "@/lib/money";
import type { StaffDTO } from "@/lib/types";

import type { StaffMonthStats } from "../types";
import { DocumentsBadge, StaffStatusBadge } from "./staff-badges";

export function ProfileHeader({ staff, today, onEdit }: { staff: StaffDTO; today: string; onEdit: (() => void) | null }) {
  const { t } = useI18n();
  const org = useOrg();
  const branches = staff.branchIds.length === 0 ? t("common.allBranches") : staff.branchIds.map((b) => org.branchName(b)).join(", ");
  return (
    <div className="grid gap-4">
      {org.can("view_staff") ? (
        <Button variant="ghost" size="sm" asChild className="-ms-2 w-fit text-muted-foreground">
          <Link href="/staff">
            <ArrowLeftIcon className="rtl-flip" />
            {t("staff.title")}
          </Link>
        </Button>
      ) : null}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-start">
        <PersonAvatar name={staff.displayName} src={staff.photoUrl} color={staff.color} className="size-20 text-2xl" />
        <div className="grid min-w-0 flex-1 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[22px] font-semibold tracking-tight">{staff.displayName}</h1>
            <StaffStatusBadge status={staff.status} />
            {!staff.bookable ? <span className="text-[13px] text-muted-foreground">· {t("staff.profile.notBookable")}</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {staff.position ? <span className="font-medium text-foreground">{staff.position}</span> : null}
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="size-3.5" />
              {branches}
            </span>
            {staff.hireDate ? (
              <span className="flex items-center gap-1.5">
                <CalendarCheckIcon className="size-3.5" />
                {t("staff.profile.joined", { date: org.dateKey(staff.hireDate) })}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {staff.phone ? (
              <a href={`tel:${staff.phone.replace(/\s+/g, "")}`} className="flex items-center gap-1.5 hover:underline">
                <PhoneIcon className="size-3.5 text-muted-foreground" />
                <span dir="ltr">{staff.phone}</span>
              </a>
            ) : null}
            {staff.email ? (
              <a href={`mailto:${staff.email}`} className="flex items-center gap-1.5 hover:underline">
                <MailIcon className="size-3.5 text-muted-foreground" />
                {staff.email}
              </a>
            ) : null}
          </div>
          <DocumentsBadge hr={staff.hr} today={today} detailed />
        </div>
        {onEdit ? (
          <Button variant="outline" onClick={onEdit} className="self-start">
            <PencilIcon />
            {t("common.edit")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ProfileStats({ stats }: { stats: StaffMonthStats }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const utilisation = stats.scheduledMinutes > 0 ? stats.bookedMinutes / stats.scheduledMinutes : null;
  const items: { label: string; value: string; hint?: string }[] = [
    { label: t("staff.stats.performed"), value: String(stats.performed) },
  ];
  if (stats.revenueMinor !== null) items.push({ label: t("staff.stats.revenue"), value: org.money(stats.revenueMinor) });
  if (stats.commissionMinor !== null) items.push({ label: t("staff.stats.commission"), value: org.money(stats.commissionMinor) });
  items.push({
    label: t("staff.stats.utilisation"),
    value: utilisation === null ? "—" : formatPercent(utilisation, locale),
    hint: t("staff.stats.utilisationHint", {
      booked: Math.round(stats.bookedMinutes / 60),
      scheduled: Math.round(stats.scheduledMinutes / 60),
    }),
  });
  return (
    <section aria-label={t("staff.stats.thisMonth")} className="grid gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("staff.stats.thisMonth")}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <div className="text-[13px] text-muted-foreground">{i.label}</div>
            <div className="mt-1 text-xl font-semibold tabular">{i.value}</div>
            {i.hint ? <div className="mt-0.5 text-xs text-muted-foreground">{i.hint}</div> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
