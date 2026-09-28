"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CalendarPlusIcon,
  ChevronLeftIcon,
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
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/client";
import type { ClientDTO } from "@/lib/types";

import { setClientStatusAction } from "../../actions";
import type { StaffOption } from "../../types";
import { avatarColor, telLink, whatsappLink } from "../../utils";
import { ClientFormSheet } from "../client-form-sheet";
import { ClientStatusBadge, TagList } from "../status-badges";

export function ProfileHeader({ client, staff }: { client: ClientDTO; staff: StaffOption[] }) {
  const { t, te } = useI18n();
  const org = useOrg();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const code = org.settings.locale.phoneCountryCode;
  const tel = client.phone ? telLink(client.phone, code) : null;
  const wa = client.phone ? whatsappLink(client.phone, code) : null;
  const archived = client.status === "archived";
  const canEdit = org.can("edit_customers");

  async function setStatus(status: ClientDTO["status"]) {
    const res = await setClientStatusAction({ ids: [client.id], status });
    if (res.ok) toast.success(status === "archived" ? t("clients.profile.archived") : t("clients.profile.restored"));
    else toast.error(te(res.error));
  }

  return (
    <>
      <Link
        href="/clients"
        className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4 rtl-flip" />
        {t("clients.profile.backToClients")}
      </Link>

      {archived ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
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

      <div className="flex flex-col gap-4 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <PersonAvatar name={client.fullName} color={avatarColor(client.id)} className="size-14 text-lg sm:size-16" />
          <div className="grid min-w-0 gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[22px] font-semibold tracking-tight sm:text-2xl">{client.fullName}</h1>
              {archived ? <ClientStatusBadge status={client.status} /> : null}
            </div>
            <TagList tags={client.tags} max={8} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {client.phone ? (
                <a href={tel ?? undefined} className="inline-flex items-center gap-1.5 hover:text-primary" dir="ltr">
                  <PhoneIcon className="size-4 text-muted-foreground" />
                  <span className="tabular">{client.phone}</span>
                </a>
              ) : null}
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-success hover:underline"
                >
                  <MessageCircleIcon className="size-4" />
                  {t("clients.profile.whatsapp")}
                </a>
              ) : null}
              {client.email ? (
                <a href={`mailto:${client.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-primary" dir="ltr">
                  <MailIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{client.email}</span>
                </a>
              ) : null}
              {!client.phone && !client.email ? (
                <span className="text-muted-foreground">{t("clients.profile.noContact")}</span>
              ) : null}
            </div>
            {client.createdAt ? (
              <p className="text-[13px] text-muted-foreground">
                {t("clients.profile.clientSince", { date: org.date(client.createdAt, "date") })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {!archived && org.can("create_appointments") ? (
            <Button asChild>
              <Link href={`/appointments?new=1&client=${client.id}`}>
                <CalendarPlusIcon />
                {t("clients.profile.book")}
              </Link>
            </Button>
          ) : null}
          {!archived && org.can("create_sales") ? (
            <Button asChild variant="outline">
              <Link href={`/pos?client=${client.id}`}>
                <ReceiptIcon />
                {t("clients.profile.checkout")}
              </Link>
            </Button>
          ) : null}
          {canEdit ? (
            <Button variant="outline" onClick={() => setEditOpen(true)} aria-label={t("common.edit")}>
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
        </div>
      </div>

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
