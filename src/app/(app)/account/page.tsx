import type { Metadata } from "next";

import { AccountView } from "@/features/account/components/account-view";
import { attendanceForStaffOnDay } from "@/features/attendance/queries";
import { getStaffMember } from "@/features/staff/queries";
import { todayKey, weekdayOfKey } from "@/lib/dates";
import { getAppContext } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const ctx = await getAppContext();
  const today = todayKey(ctx.timezone);
  const staff = ctx.staffId ? await getStaffMember(ctx.org.id, ctx.staffId) : null;
  const linked = staff && staff.status !== "archived" ? staff : null;
  const records = linked ? await attendanceForStaffOnDay(ctx.org.id, linked.id, today) : [];
  const day = linked?.schedule[String(weekdayOfKey(today))];

  return (
    <AccountView
      displayName={ctx.member.displayName || ctx.session.name}
      email={ctx.session.email}
      roleName={ctx.member.roleName}
      clock={
        linked
          ? {
              staff: { id: linked.id, displayName: linked.displayName, photoUrl: linked.photoUrl, color: linked.color },
              records,
              today,
              nowIso: new Date().toISOString(),
              shift: day?.working ? { start: day.start, end: day.end } : null,
            }
          : null
      }
    />
  );
}
