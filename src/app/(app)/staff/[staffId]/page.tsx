import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";

import { attendanceForStaff, listLeave } from "@/features/attendance/queries";
import { StaffProfileView } from "@/features/staff/components/staff-profile-view";
import { monthStats, toSaleLines, toStaffLines } from "@/features/staff/profile";
import { getStaffMember, listStaff, staffAppointments, staffInBranches, staffTransactions } from "@/features/staff/queries";
import { listCategories, listServices } from "@/features/services/queries";
import { addDaysToKey, rangeForPreset, todayKey } from "@/lib/dates";
import { can, getAppContext } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Staff profile" };

export default async function StaffProfilePage(props: PageProps<"/staff/[staffId]">) {
  const ctx = await getAppContext();
  const { staffId } = await props.params;
  const sp = await props.searchParams;
  const self = ctx.staffId === staffId;
  if (!self && !can(ctx, "view_staff")) forbidden();

  const staff = await getStaffMember(ctx.org.id, staffId);
  if (!staff || (!self && !staffInBranches(staff, ctx.branches.map((b) => b.id)))) notFound();

  const tz = ctx.timezone;
  const today = todayKey(tz);
  const month = rangeForPreset("this_month", tz);
  const salesPreset = sp.sales === "last_month" ? "last_month" : "this_month";
  const salesRange = rangeForPreset(salesPreset, tz);
  const canSales = can(ctx, "view_sales") || can(ctx, "view_commissions");
  const canManage = can(ctx, "manage_staff");

  const [appointments, monthTx, rangeTx, attendance, leave, services, categories, allStaff] = await Promise.all([
    staffAppointments(ctx, staffId, { from: addDaysToKey(today, -60), to: addDaysToKey(today, 60) }),
    canSales ? staffTransactions(ctx, staffId, month) : Promise.resolve([]),
    canSales && salesPreset !== "this_month" ? staffTransactions(ctx, staffId, salesRange) : Promise.resolve(null),
    attendanceForStaff(ctx.org.id, staffId, 60),
    listLeave(ctx.org.id, { staffId }),
    canManage ? listServices(ctx.org.id) : Promise.resolve([]),
    canManage ? listCategories(ctx.org.id) : Promise.resolve([]),
    canManage ? listStaff(ctx.org.id) : Promise.resolve([]),
  ]);

  const lines = toStaffLines(appointments, staffId);
  const stats = monthStats({ lines, schedule: staff.schedule, month, transactions: canSales ? monthTx : null, staffId });
  const upcoming = lines
    .filter((l) => l.dateKey > today && l.status !== "cancelled" && l.status !== "no_show" && l.status !== "completed")
    .slice(0, 50);
  const completed = lines
    .filter((l) => l.status === "completed" && l.dateKey <= today)
    .reverse()
    .slice(0, 50);

  return (
    <StaffProfileView
      staff={staff}
      today={today}
      initialTab={typeof sp.tab === "string" ? sp.tab : undefined}
      nowIso={new Date().toISOString()}
      stats={stats}
      todayLines={lines.filter((l) => l.dateKey === today)}
      upcoming={upcoming}
      completed={completed}
      sales={canSales ? { preset: salesPreset, lines: toSaleLines(rangeTx ?? monthTx, staffId) } : null}
      attendance={attendance.filter((r) => self || ctx.scopeBranchIds.includes(r.branchId))}
      leave={leave}
      canRequestLeave={self || can(ctx, "manage_staff") || can(ctx, "manage_attendance")}
      edit={
        canManage
          ? {
              services: services
                .filter((s) => s.active)
                .map((s) => ({
                  id: s.id,
                  name: s.name,
                  nameAr: s.nameAr,
                  categoryId: s.categoryId,
                  durationMin: s.durationMin,
                  openToAll: s.staffIds.length === 0,
                })),
              categories: categories.map((c) => ({ id: c.id, name: c.name, nameAr: c.nameAr, color: c.color })),
              staffCount: allStaff.length,
            }
          : null
      }
    />
  );
}
