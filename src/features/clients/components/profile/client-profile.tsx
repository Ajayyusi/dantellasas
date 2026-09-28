"use client";

import { useState } from "react";

import { PageContainer } from "@/components/common/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n/client";
import type {
  AppointmentDTO,
  AppointmentStatus,
  ClientDTO,
  ClientMembershipDTO,
  ClientPackageDTO,
  TransactionDTO,
} from "@/lib/types";

import type { ClientActivityView, ClientNoteView, StaffOption } from "../../types";
import { upcomingAt } from "../../utils";
import { ActivityTab } from "./activity-tab";
import { AppointmentsTab } from "./appointment-list";
import { NotesTab } from "./notes-tab";
import { OverviewTab, type ProfileTab } from "./overview-tab";
import { MembershipsTab, PackagesTab } from "./plans";
import { ProfileHeader } from "./profile-header";
import { ProfileStats } from "./profile-stats";
import { TransactionsTab } from "./transactions-tab";

const OPEN_STATUSES: AppointmentStatus[] = ["booked", "confirmed", "checked_in", "in_service"];

export interface ClientProfileData {
  client: ClientDTO;
  notes: ClientNoteView[];
  /** null when the member can't view appointments. */
  appointments: AppointmentDTO[] | null;
  /** null without `view_sales`. */
  transactions: TransactionDTO[] | null;
  packages: ClientPackageDTO[];
  memberships: ClientMembershipDTO[];
  /** null without `view_audit_log`. */
  activity: ClientActivityView[] | null;
  staff: StaffOption[];
  now: number;
}

function Count({ n }: { n: number }) {
  if (n === 0) return null;
  return <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium tabular text-muted-foreground">{n}</span>;
}

export function ClientProfile({ client, notes, appointments, transactions, packages, memberships, activity, staff, now }: ClientProfileData) {
  const { t } = useI18n();
  const [tab, setTab] = useState<ProfileTab>("overview");

  const upcoming = (appointments ?? [])
    .filter((a) => OPEN_STATUSES.includes(a.status) && Date.parse(a.endAt) >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const visits = appointments ? appointments.filter((a) => a.status === "completed") : null;
  const nextAt = upcoming[0]?.startAt ?? upcomingAt(client.stats.nextAppointmentAt, now);

  return (
    <PageContainer>
      <ProfileHeader client={client} staff={staff} />
      <ProfileStats client={client} nextAt={nextAt} now={now} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ProfileTab)}>
        <TabsList>
          <TabsTrigger value="overview">{t("clients.tabs.overview")}</TabsTrigger>
          {appointments ? (
            <TabsTrigger value="appointments">
              {t("clients.tabs.appointments")}
              <Count n={appointments.length} />
            </TabsTrigger>
          ) : null}
          {transactions ? (
            <TabsTrigger value="transactions">
              {t("clients.tabs.transactions")}
              <Count n={transactions.length} />
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="packages">
            {t("clients.tabs.packages")}
            <Count n={packages.length} />
          </TabsTrigger>
          <TabsTrigger value="memberships">
            {t("clients.tabs.memberships")}
            <Count n={memberships.length} />
          </TabsTrigger>
          <TabsTrigger value="notes">
            {t("clients.tabs.notes")}
            <Count n={notes.length} />
          </TabsTrigger>
          {activity ? <TabsTrigger value="activity">{t("clients.tabs.activity")}</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            client={client}
            notes={notes}
            upcoming={upcoming}
            visits={visits}
            packages={packages}
            memberships={memberships}
            staff={staff}
            now={now}
            onNavigate={setTab}
          />
        </TabsContent>
        {appointments ? (
          <TabsContent value="appointments">
            <AppointmentsTab clientId={client.id} appointments={appointments} archived={client.status === "archived"} />
          </TabsContent>
        ) : null}
        {transactions ? (
          <TabsContent value="transactions">
            <TransactionsTab transactions={transactions} />
          </TabsContent>
        ) : null}
        <TabsContent value="packages">
          <PackagesTab packages={packages} />
        </TabsContent>
        <TabsContent value="memberships">
          <MembershipsTab memberships={memberships} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesTab clientId={client.id} notes={notes} />
        </TabsContent>
        {activity ? (
          <TabsContent value="activity">
            <ActivityTab activity={activity} />
          </TabsContent>
        ) : null}
      </Tabs>
    </PageContainer>
  );
}
