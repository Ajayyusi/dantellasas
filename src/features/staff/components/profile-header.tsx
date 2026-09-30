"use client";

import {
  CalendarCheckIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  GaugeIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  ScissorsIcon,
  WalletIcon,
  HandCoinsIcon,
} from "lucide-react";
import Link from "next/link";

import { HeroChip, ProfileHero, profileAvatarClass } from "@/components/common/profile-hero";
import { StatCard } from "@/components/common/stat-card";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { formatPercent } from "@/lib/money";
import type { StaffDTO } from "@/lib/types";

import type { StaffMonthStats } from "../types";
import { DocumentsBadge, StaffStatusBadge } from "./staff-badges";

const contactLink = "inline-flex min-w-0 items-center gap-2 rounded-md outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring";

export function ProfileHeader({ staff, today, onEdit }: { staff: StaffDTO; today: string; onEdit: (() => void) | null }) {
  const { t } = useI18n();
  const org = useOrg();
  const branches = staff.branchIds.length === 0 ? t("common.allBranches") : staff.branchIds.map((b) => org.branchName(b)).join(", ");
  return (
    <div className="grid gap-4">
      {org.can("view_staff") ? (
        <Link
          href="/staff"
          className="inline-flex w-fit items-center gap-1 rounded-md text-[15px] font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeftIcon className="size-4 rtl-flip" />
          {t("staff.title")}
        </Link>
      ) : null}
      <ProfileHero
        accent={staff.color}
        avatar={
          <PersonAvatar
            name={staff.displayName}
            src={staff.photoUrl}
            color={staff.color}
            className={profileAvatarClass}
          />
        }
        title={staff.displayName}
        badges={
          <>
            <StaffStatusBadge status={staff.status} />
            {!staff.bookable ? <Badge variant="neutral">{t("staff.profile.notBookable")}</Badge> : null}
          </>
        }
        meta={
          <>
            {staff.position ? (
              <span className="inline-flex items-center gap-2 font-semibold text-primary">
                <ScissorsIcon className="size-4" />
                {staff.position}
              </span>
            ) : null}
            {staff.phone ? (
              <a href={`tel:${staff.phone.replace(/\s+/g, "")}`} className={contactLink}>
                <PhoneIcon className="size-4 text-primary" />
                <span dir="ltr" className="tabular">
                  {staff.phone}
                </span>
              </a>
            ) : null}
            {staff.email ? (
              <a href={`mailto:${staff.email}`} className={contactLink} dir="ltr">
                <MailIcon className="size-4 shrink-0 text-primary" />
                <span className="truncate">{staff.email}</span>
              </a>
            ) : null}
          </>
        }
        actions={
          <>
            {org.can("view_appointments") ? (
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link href={`/appointments?view=week&staff=${staff.id}`}>
                  <CalendarDaysIcon />
                  {t("staff.profile.viewCalendar")}
                </Link>
              </Button>
            ) : null}
            {onEdit ? (
              <Button variant="outline" onClick={onEdit}>
                <PencilIcon />
                {t("common.edit")}
              </Button>
            ) : null}
          </>
        }
        chips={
          <>
            <HeroChip>
              <MapPinIcon />
              <span className="truncate">{branches}</span>
            </HeroChip>
            {staff.hireDate ? (
              <HeroChip>
                <CalendarCheckIcon />
                {t("staff.profile.joined", { date: org.dateKey(staff.hireDate) })}
              </HeroChip>
            ) : null}
            <DocumentsBadge hr={staff.hr} today={today} detailed />
          </>
        }
      />
    </div>
  );
}

export function ProfileStats({ stats }: { stats: StaffMonthStats }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const utilisation = stats.scheduledMinutes > 0 ? stats.bookedMinutes / stats.scheduledMinutes : null;
  return (
    <section aria-labelledby="staff-month" className="grid gap-3">
      <h2 id="staff-month" className="font-display text-[17px] font-bold">
        {t("staff.stats.thisMonth")}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ScissorsIcon} tone="rose" label={t("staff.stats.performed")} value={String(stats.performed)} />
        {stats.revenueMinor !== null ? (
          <StatCard icon={WalletIcon} tone="gold" label={t("staff.stats.revenue")} value={org.money(stats.revenueMinor)} />
        ) : null}
        {stats.commissionMinor !== null ? (
          <StatCard icon={HandCoinsIcon} tone="sage" label={t("staff.stats.commission")} value={org.money(stats.commissionMinor)} />
        ) : null}
        <StatCard
          icon={GaugeIcon}
          tone="mauve"
          label={t("staff.stats.utilisation")}
          value={utilisation === null ? "—" : formatPercent(utilisation, locale)}
          hint={t("staff.stats.utilisationHint", {
            booked: Math.round(stats.bookedMinutes / 60),
            scheduled: Math.round(stats.scheduledMinutes / 60),
          })}
        />
      </div>
    </section>
  );
}
