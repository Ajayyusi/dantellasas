"use client";

import { AlertTriangleIcon, CakeIcon } from "lucide-react";

import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDaysToKey, dateKeyOf, diffDays } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { AppointmentDTO, ClientDTO, ClientMembershipDTO, ClientPackageDTO } from "@/lib/types";

import type { ClientNoteView, StaffOption } from "../../types";
import { monthName } from "../birthday-field";
import { AppointmentRow } from "./appointment-list";
import { NoteCard } from "./notes-tab";
import { MembershipCard, PackageCard } from "./plans";

export type ProfileTab = "overview" | "appointments" | "transactions" | "packages" | "memberships" | "notes" | "activity";

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-center pb-3">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      {children}
    </Card>
  );
}

function daysUntilBirthday(b: NonNullable<ClientDTO["birthday"]>, now: number, tz: string): number {
  const today = dateKeyOf(now, tz);
  const year = Number(today.slice(0, 4));
  const key = (y: number) => addDaysToKey(`${y}-${String(b.month).padStart(2, "0")}-01`, b.day - 1);
  const thisYear = key(year);
  return thisYear >= today ? diffDays(today, thisYear) : diffDays(today, key(year + 1));
}

export function OverviewTab({
  client,
  notes,
  upcoming,
  visits,
  packages,
  memberships,
  staff,
  now,
  onNavigate,
}: {
  client: ClientDTO;
  notes: ClientNoteView[];
  upcoming: AppointmentDTO[];
  visits: AppointmentDTO[] | null;
  packages: ClientPackageDTO[];
  memberships: ClientMembershipDTO[];
  staff: StaffOption[];
  now: number;
  onNavigate: (tab: ProfileTab) => void;
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const pinned = notes.filter((n) => n.pinned);
  const activePackages = packages.filter((p) => p.status === "active");
  const activeMemberships = memberships.filter((m) => m.status === "active");
  const preferred = staff.find((s) => s.id === client.preferredStaffId) ?? null;
  const editable = org.can("edit_customers");
  const b = client.birthday;
  const bdayIn = b ? daysUntilBirthday(b, now, org.timezone) : null;
  const viewAll = (tab: ProfileTab) => (
    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onNavigate(tab)}>
      {t("clients.overview.viewAll")}
    </Button>
  );
  const notSet = <span className="text-muted-foreground">{t("clients.overview.notSet")}</span>;

  const details: { label: string; value: React.ReactNode }[] = [
    {
      label: t("clients.overview.birthday"),
      value: b ? (
        <span className="grid justify-items-end gap-0.5">
          <span>{[b.day, monthName(b.month, locale), b.year].filter(Boolean).join(" ")}</span>
          {bdayIn !== null && bdayIn <= 30 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <CakeIcon className="size-3.5" />
              {bdayIn === 0 ? t("clients.overview.birthdayToday") : t("clients.overview.birthdaySoon", { count: bdayIn })}
            </span>
          ) : null}
        </span>
      ) : (
        notSet
      ),
    },
    {
      label: t("clients.overview.preferredStaff"),
      value: preferred ? (
        <span className="inline-flex items-center gap-2">
          <PersonAvatar name={preferred.displayName} src={preferred.photoUrl} color={preferred.color} className="size-5 text-[9px]" />
          {preferred.displayName}
        </span>
      ) : (
        notSet
      ),
    },
    { label: t("clients.overview.source"), value: client.source || notSet },
    { label: t("clients.overview.nationality"), value: client.nationality || notSet },
    ...(org.settings.clients.askGender
      ? [{ label: t("clients.overview.gender"), value: client.gender ? t(`common.gender.${client.gender}`) : notSet }]
      : []),
    {
      label: t("clients.overview.consent"),
      value: client.marketingConsent ? (
        <span className="text-success">{t("clients.overview.consentYes")}</span>
      ) : (
        <span className="text-muted-foreground">{t("clients.overview.consentNo")}</span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid min-w-0 grid-cols-1 content-start gap-4">
        {client.stats.noShows >= 2 ? (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            {t("clients.overview.noShowRisk", { count: client.stats.noShows })}
          </div>
        ) : null}

        {pinned.length > 0 ? (
          <section className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">{t("clients.overview.pinnedNotes")}</h2>
              {viewAll("notes")}
            </div>
            {pinned.map((n) => (
              <NoteCard key={n.id} note={n} clientId={client.id} editable={editable} />
            ))}
          </section>
        ) : null}

        {visits !== null ? (
          <Section title={t("clients.overview.upcoming")} action={upcoming.length > 0 ? viewAll("appointments") : null}>
            {upcoming.length === 0 ? (
              <CardContent className="text-sm text-muted-foreground">{t("clients.overview.noUpcoming")}</CardContent>
            ) : (
              <ul className="divide-y border-t">
                {upcoming.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <AppointmentRow appointment={a} compact />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ) : null}

        {visits !== null ? (
          <Section title={t("clients.overview.recentVisits")} action={visits.length > 0 ? viewAll("appointments") : null}>
            {visits.length === 0 ? (
              <CardContent className="text-sm text-muted-foreground">{t("clients.overview.noVisits")}</CardContent>
            ) : (
              <ul className="divide-y border-t">
                {visits.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <AppointmentRow appointment={a} compact />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ) : null}

        <Section title={t("clients.overview.plans")}>
          <CardContent className="grid grid-cols-1 gap-3">
            {activePackages.length === 0 && activeMemberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("clients.overview.noPlans")}</p>
            ) : (
              <>
                {activeMemberships.map((m) => (
                  <MembershipCard key={m.id} membership={m} className="bg-background" />
                ))}
                {activePackages.map((p) => (
                  <PackageCard key={p.id} pkg={p} className="bg-background" />
                ))}
              </>
            )}
          </CardContent>
        </Section>
      </div>

      <div className="grid min-w-0 grid-cols-1 content-start gap-4">
        <Section title={t("clients.overview.details")}>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              {details.map((d) => (
                <div key={d.label} className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">{d.label}</dt>
                  <dd className="min-w-0 text-end">{d.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Section>
        {client.notes ? (
          <Section title={t("clients.overview.generalNotes")}>
            <CardContent>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed" dir="auto">
                {client.notes}
              </p>
            </CardContent>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
