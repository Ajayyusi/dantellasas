"use client";

import { useState } from "react";

import { PageContainer } from "@/components/common/page-header";
import { LeavePanel } from "@/features/attendance/components/leave-panel";
import { RecordsTable } from "@/features/attendance/components/records-table";
import { useNow } from "@/features/attendance/components/use-now";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { weekdayOfKey } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { AttendanceDTO, LeaveDTO, StaffDTO } from "@/lib/types";

import type { StaffLine, StaffMonthStats, StaffSaleLine } from "../types";
import { AppointmentLines } from "./appointment-lines";
import { ProfileHeader, ProfileStats } from "./profile-header";
import { SalesTab } from "./sales-tab";
import { ScheduleSummary } from "./schedule-summary";
import type { CategoryOption, ServiceOption } from "./services-picker";
import { StaffFormSheet } from "./staff-form-sheet";

const TABS = ["today", "upcoming", "completed", "sales", "attendance", "leave"] as const;
type ProfileTab = (typeof TABS)[number];

export function StaffProfileView({
  staff,
  today,
  nowIso,
  initialTab,
  stats,
  todayLines,
  upcoming,
  completed,
  sales,
  attendance,
  leave,
  canRequestLeave,
  edit,
}: {
  staff: StaffDTO;
  today: string;
  nowIso: string;
  initialTab: string | undefined;
  stats: StaffMonthStats;
  todayLines: StaffLine[];
  upcoming: StaffLine[];
  completed: StaffLine[];
  sales: { preset: "this_month" | "last_month"; lines: StaffSaleLine[] } | null;
  attendance: AttendanceDTO[];
  leave: LeaveDTO[];
  canRequestLeave: boolean;
  edit: { services: ServiceOption[]; categories: CategoryOption[]; staffCount: number } | null;
}) {
  const { t } = useI18n();
  const now = useNow(nowIso);
  const tabs = TABS.filter((k) => k !== "sales" || sales);
  const [tab, setTab] = useState<ProfileTab>(
    tabs.includes(initialTab as ProfileTab) ? (initialTab as ProfileTab) : "today",
  );
  const [editing, setEditing] = useState(false);

  const counts: Partial<Record<ProfileTab, number>> = {
    today: todayLines.length,
    upcoming: upcoming.length,
  };

  return (
    <PageContainer className="grid grid-cols-1 gap-6">
      <ProfileHeader staff={staff} today={today} onEdit={edit ? () => setEditing(true) : null} />
      <ProfileStats stats={stats} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as ProfileTab)}>
        <TabsList>
          {tabs.map((k) => (
            <TabsTrigger key={k} value={k}>
              {t(`staff.profile.tabs.${k}`)}
              {counts[k] ? <span className="rounded-full bg-primary-soft px-2 py-px text-[12px] font-semibold tabular text-primary">{counts[k]}</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="today">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <AppointmentLines lines={todayLines} empty={t("staff.profile.noToday")} />
            <ScheduleSummary schedule={staff.schedule} todayWeekday={String(weekdayOfKey(today))} />
          </div>
        </TabsContent>
        <TabsContent value="upcoming">
          <AppointmentLines lines={upcoming} showDate empty={t("staff.profile.noUpcoming")} />
        </TabsContent>
        <TabsContent value="completed">
          <AppointmentLines lines={completed} showDate empty={t("staff.profile.noCompleted")} />
        </TabsContent>
        {sales ? (
          <TabsContent value="sales">
            <SalesTab staffId={staff.id} preset={sales.preset} lines={sales.lines} />
          </TabsContent>
        ) : null}
        <TabsContent value="attendance">
          <RecordsTable records={attendance} today={today} now={now} showStaff={false} csvName={`attendance-${staff.displayName}`} />
        </TabsContent>
        <TabsContent value="leave">
          <LeavePanel
            leave={leave}
            staff={canRequestLeave ? [{ id: staff.id, displayName: staff.displayName }] : []}
            defaultStaffId={staff.id}
            today={today}
            showStaff={false}
          />
        </TabsContent>
      </Tabs>
      {edit ? (
        <StaffFormSheet
          open={editing}
          onOpenChange={setEditing}
          staff={staff}
          services={edit.services}
          categories={edit.categories}
          staffCount={edit.staffCount}
        />
      ) : null}
    </PageContainer>
  );
}
