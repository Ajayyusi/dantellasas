import { UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer, PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { listAppointments, listBlockedTimes } from "@/features/appointments/queries";
import { BranchPrompt } from "@/features/appointments/components/branch-prompt";
import { CalendarView } from "@/features/appointments/components/calendar-view";
import type { CalendarViewMode } from "@/features/appointments/components/types";
import { listCategories, listServices } from "@/features/services/queries";
import { listStaff, staffForBranch } from "@/features/staff/queries";
import { addDaysToKey, isDateKey, startOfWeekKey, todayKey } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { can, requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Appointments" };

const VIEWS: CalendarViewMode[] = ["day", "week", "staff", "list"];

export default async function AppointmentsPage({ searchParams }: PageProps<"/appointments">) {
  const ctx = await requirePagePermission("view_appointments");
  const { t } = await getI18n();
  const params = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  const today = todayKey(ctx.timezone);
  const view = (VIEWS as string[]).includes(str(params.view) ?? "") ? (str(params.view) as CalendarViewMode) : "day";
  const date = isDateKey(str(params.date)) ? str(params.date)! : today;

  if (!ctx.branchId) {
    return (
      <PageContainer>
        <PageHeader title={t("appointments.title")} />
        <BranchPrompt />
      </PageContainer>
    );
  }

  const weekStart = startOfWeekKey(date, ctx.settings.locale.weekStartsOn);
  const [from, to] = view === "day" || view === "list" ? [date, date] : [weekStart, addDaysToKey(weekStart, 6)];

  const [allStaff, services, categories, appointments, blocked] = await Promise.all([
    listStaff(ctx.org.id),
    listServices(ctx.org.id),
    listCategories(ctx.org.id),
    listAppointments(ctx, ctx.branchId, from, to),
    listBlockedTimes(ctx, ctx.branchId, from, to),
  ]);

  // Members without view_all_appointments see only their own column.
  let staff = staffForBranch(allStaff, ctx.branchId).filter((s) => s.status === "active" && s.bookable);
  if (!can(ctx, "view_all_appointments")) staff = staff.filter((s) => s.id === ctx.staffId);

  if (staff.length === 0 && view !== "list") {
    return (
      <PageContainer>
        <PageHeader title={t("appointments.title")} />
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={UsersIcon}
            title={t("appointments.noStaffTitle")}
            description={t("appointments.noStaffBody")}
            action={
              can(ctx, "manage_staff") ? (
                <Button asChild>
                  <Link href="/staff">{t("appointments.addStaff")}</Link>
                </Button>
              ) : null
            }
          />
        </div>
      </PageContainer>
    );
  }

  const staffParam = str(params.staff);
  return (
    <CalendarView
      key={`${view}-${from}`}
      view={view}
      date={date}
      today={today}
      staffFilter={staffParam && staff.some((s) => s.id === staffParam) ? staffParam : null}
      branchId={ctx.branchId}
      catalog={{
        services,
        categories,
        staff: staff.map((s) => ({
          id: s.id,
          displayName: s.displayName,
          color: s.color,
          photoUrl: s.photoUrl,
          schedule: s.schedule,
          serviceIds: s.serviceIds,
        })),
      }}
      appointments={appointments}
      blocked={blocked}
      focusAppointmentId={str(params.appointment) ?? null}
      openNew={str(params.new) === "1" && can(ctx, "create_appointments")}
      prefillClientId={str(params.client) ?? null}
    />
  );
}
