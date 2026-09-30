"use client";

import { AlertTriangleIcon, CakeIcon, HeartIcon } from "lucide-react";

import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import type { AppointmentDTO, ClientDTO, ClientMembershipDTO, ClientPackageDTO } from "@/lib/types";

import type { ClientNoteView, StaffOption } from "../../types";
import { daysUntilBirthday, favouriteServices } from "../../utils";
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
  const favourites = visits ? favouriteServices(visits) : null;
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
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary">
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
          <PersonAvatar name={preferred.displayName} src={preferred.photoUrl} color={preferred.color} className="size-6 text-[11px]" />
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-w-0 grid-cols-1 content-start gap-4">
        {client.stats.noShows >= 2 ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/6 px-5 py-3.5 text-[15px] text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            {t("clients.overview.noShowRisk", { count: client.stats.noShows })}
          </div>
        ) : null}

        {pinned.length > 0 ? (
          <section className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("clients.overview.pinnedNotes")}</h2>
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
        {favourites ? (
          <Section title={t("clients.overview.favouriteServices")}>
            <CardContent>
              {favourites.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("clients.overview.favouriteEmpty")}</p>
              ) : (
                <ul className="grid gap-2">
                  {favourites.map((f, i) => (
                    <li key={f.id} className="flex items-center gap-3 rounded-xl bg-muted/45 px-3 py-2.5">
                      <span
                        aria-hidden
                        className={
                          i === 0
                            ? "grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
                            : "grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"
                        }
                      >
                        <HeartIcon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{f.name}</span>
                      <span className="shrink-0 rounded-full bg-card px-2.5 py-0.5 text-[13px] font-semibold tabular text-muted-foreground">
                        ×{f.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Section>
        ) : null}
        <Section title={t("clients.overview.details")}>
          <CardContent>
            <dl className="grid divide-y text-[15px]">
              {details.map((d) => (
                <div key={d.label} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <dt className="shrink-0 text-muted-foreground">{d.label}</dt>
                  <dd className="min-w-0 text-end font-medium">{d.value}</dd>
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
