"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CakeIcon,
  CalendarHeartIcon,
  CalendarPlusIcon,
  ChevronLeftIcon,
  CrownIcon,
  MailIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  ReceiptIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { HeroChip, ProfileHero, profileAvatarClass } from "@/components/common/profile-hero";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/client";
import type { ClientDTO, ClientMembershipDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { setClientStatusAction } from "../../actions";
import type { StaffOption } from "../../types";
import { avatarColor, daysUntilBirthday, telLink, whatsappLink } from "../../utils";
import { monthName } from "../birthday-field";
import { ClientFormSheet } from "../client-form-sheet";
import { ClientStatusBadge, TagList } from "../status-badges";

const contactLink =
  "inline-flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The client's hero: identity, loyalty (active membership), contact and the
 * day-to-day actions — book, check out, edit, archive.
 */
export function ProfileHeader({
  client,
  staff,
  membership,
  now,
}: {
  client: ClientDTO;
  staff: StaffOption[];
  /** The client's current active membership, shown as their loyalty status. */
  membership: ClientMembershipDTO | null;
  now: number;
}) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const code = org.settings.locale.phoneCountryCode;
  const tel = client.phone ? telLink(client.phone, code) : null;
  const wa = client.phone ? whatsappLink(client.phone, code) : null;
  const archived = client.status === "archived";
  const canEdit = org.can("edit_customers");
  const preferred = staff.find((s) => s.id === client.preferredStaffId) ?? null;
  const b = client.birthday;
  const bdayIn = b ? daysUntilBirthday(b, now, org.timezone) : null;
  const hasChips = Boolean(b || preferred || client.createdAt || client.tags.length > 0);

  async function setStatus(status: ClientDTO["status"]) {
    const res = await setClientStatusAction({ ids: [client.id], status });
    if (res.ok) toast.success(status === "archived" ? t("clients.profile.archived") : t("clients.profile.restored"));
    else toast.error(te(res.error));
  }

  return (
    <>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1 rounded-md text-[15px] font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeftIcon className="size-4 rtl-flip" />
        {t("clients.profile.backToClients")}
      </Link>

      {archived ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-5 py-3.5 text-sm">
          <span className="flex items-center gap-2">
            <ArchiveIcon className="size-4 shrink-0" />
            {t("clients.profile.archivedBanner")}
          </span>
          {canEdit ? (
            <Button size="sm" variant="outline" onClick={() => setStatus("active")}>
              <ArchiveRestoreIcon />
              {t("common.restore")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <ProfileHero
        className="mb-6"
        avatar={
          <PersonAvatar
            name={client.fullName}
            color={avatarColor(client.id)}
            className={cn(profileAvatarClass, membership && "ring-[color-mix(in_oklch,var(--gold)_65%,var(--card))]")}
          />
        }
        title={client.fullName}
        badges={
          <>
            {membership ? (
              <Badge variant="gold" className="h-7 gap-1.5 px-3 text-[13px]">
                <CrownIcon className="size-3.5" />
                {t("clients.profile.member", { plan: membership.planName })}
              </Badge>
            ) : null}
            {archived ? <ClientStatusBadge status={client.status} /> : null}
          </>
        }
        meta={
          <>
            {client.phone ? (
              <a href={tel ?? undefined} className={cn(contactLink, "font-medium hover:text-primary")} dir="ltr">
                <PhoneIcon className="size-4 text-primary" />
                <span className="tabular">{client.phone}</span>
              </a>
            ) : null}
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={cn(contactLink, "font-medium text-success hover:underline")}>
                <MessageCircleIcon className="size-4" />
                {t("clients.profile.whatsapp")}
              </a>
            ) : null}
            {client.email ? (
              <a href={`mailto:${client.email}`} className={cn(contactLink, "hover:text-primary")} dir="ltr">
                <MailIcon className="size-4 shrink-0 text-primary" />
                <span className="truncate">{client.email}</span>
              </a>
            ) : null}
            {!client.phone && !client.email ? <span className="text-muted-foreground">{t("clients.profile.noContact")}</span> : null}
          </>
        }
        actions={
          <>
            {!archived && org.can("create_appointments") ? (
              <Button asChild className="flex-1 sm:flex-none">
                <Link href={`/appointments?new=1&client=${client.id}`}>
                  <CalendarPlusIcon />
                  {t("clients.profile.book")}
                </Link>
              </Button>
            ) : null}
            {!archived && org.can("create_sales") ? (
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link href={`/pos?client=${client.id}`}>
                  <ReceiptIcon />
                  {t("clients.profile.checkout")}
                </Link>
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="outline" className="px-3 sm:px-4" onClick={() => setEditOpen(true)} aria-label={t("common.edit")}>
                <PencilIcon />
                <span className="hidden sm:inline">{t("common.edit")}</span>
              </Button>
            ) : null}
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label={t("common.more")}>
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {archived ? (
                    <DropdownMenuItem onSelect={() => setStatus("active")}>
                      <ArchiveRestoreIcon />
                      {t("common.restore")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem destructive onSelect={() => setConfirmArchive(true)}>
                      <ArchiveIcon />
                      {t("common.archive")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        }
        chips={
          hasChips ? (
            <>
              {b ? (
                <HeroChip highlight={bdayIn !== null && bdayIn <= 30}>
                  <CakeIcon />
                  {bdayIn === 0
                    ? t("clients.overview.birthdayToday")
                    : bdayIn !== null && bdayIn <= 30
                      ? t("clients.overview.birthdaySoon", { count: bdayIn })
                      : t("clients.profile.birthday", { date: [b.day, monthName(b.month, locale)].join(" ") })}
                </HeroChip>
              ) : null}
              {preferred ? (
                <HeroChip>
                  <PersonAvatar
                    name={preferred.displayName}
                    src={preferred.photoUrl}
                    color={preferred.color}
                    className="-ms-1.5 size-6 text-[11px] ring-0"
                  />
                  <span className="truncate">{t("clients.profile.prefers", { name: preferred.displayName })}</span>
                </HeroChip>
              ) : null}
              {client.createdAt ? (
                <HeroChip>
                  <CalendarHeartIcon />
                  {t("clients.profile.clientSince", { date: org.date(client.createdAt, "date") })}
                </HeroChip>
              ) : null}
              <TagList tags={client.tags} max={8} className="gap-1.5 [&>*]:max-w-60" />
            </>
          ) : null
        }
      />

      <ClientFormSheet open={editOpen} onOpenChange={setEditOpen} client={client} staff={staff} tagSuggestions={client.tags} />
      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={t("clients.profile.archiveTitle")}
        description={t("clients.profile.archiveBody", { name: client.fullName })}
        confirmLabel={t("common.archive")}
        destructive
        onConfirm={() => setStatus("archived")}
      />
    </>
  );
}
