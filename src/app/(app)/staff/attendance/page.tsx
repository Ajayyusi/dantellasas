import type { Metadata } from "next";

import { AttendanceView, type AttendanceTab } from "@/features/attendance/components/attendance-view";
import type { BoardEntry } from "@/features/attendance/components/today-board";
import { attendanceForBranches, currentRecord, listLeave } from "@/features/attendance/queries";
import { inRange } from "@/features/attendance/utils";
import { listStaff, staffForBranch, staffInBranches } from "@/features/staff/queries";
import { addDaysToKey, diffDays, isDateKey, todayKey, weekdayOfKey } from "@/lib/dates";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Attendance" };

const TABS: AttendanceTab[] = ["board", "records", "leave"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AttendancePage(props: PageProps<"/staff/attendance">) {
  const ctx = await requirePagePermission("manage_attendance");
  const sp = await props.searchParams;
  const tz = ctx.timezone;
  const today = todayKey(tz);

  const tabParam = one(sp.tab) as AttendanceTab | undefined;
  const tab = tabParam && TABS.includes(tabParam) ? tabParam : "board";
  let from = one(sp.from);
  let to = one(sp.to);
  if (!isDateKey(from)) from = addDaysToKey(today, -6);
  if (!isDateKey(to)) to = today;
  if (from > to) [from, to] = [to, from];
  if (diffDays(from, to) > 92) from = addDaysToKey(to, -92);
  const branchParam = one(sp.branch);
  const branchFilter = branchParam && ctx.scopeBranchIds.includes(branchParam) ? branchParam : "all";
  const recordBranches = branchFilter === "all" ? ctx.scopeBranchIds : [branchFilter];

  const [allStaff, todayRecords, records, leave] = await Promise.all([
    listStaff(ctx.org.id),
    attendanceForBranches(ctx.org.id, ctx.scopeBranchIds, { from: today, to: today }),
    attendanceForBranches(ctx.org.id, recordBranches, { from, to }),
    listLeave(ctx.org.id),
  ]);

  const staff = staffForBranch(allStaff, ctx.branchId).filter(
    (s) => s.status === "active" && staffInBranches(s, ctx.scopeBranchIds),
  );
  const staffIds = new Set(allStaff.filter((s) => staffInBranches(s, ctx.scopeBranchIds)).map((s) => s.id));
  const weekday = String(weekdayOfKey(today));

  const scheduled: BoardEntry[] = [];
  const others: BoardEntry[] = [];
  for (const s of staff) {
    const mine = todayRecords.filter((r) => r.staffId === s.id);
    const record = currentRecord(mine);
    const earlierMinutes = mine.filter((r) => r !== record && r.status === "closed").reduce((sum, r) => sum + r.workedMinutes, 0);
    const day = s.schedule[weekday];
    const onLeave = leave.find((l) => l.staffId === s.id && l.status === "approved" && inRange(today, l.startDate, l.endDate));
    const entry: BoardEntry = {
      staff: { id: s.id, displayName: s.displayName, position: s.position, photoUrl: s.photoUrl, color: s.color },
      shift: day?.working ? { start: day.start, end: day.end, breakStart: day.breakStart, breakEnd: day.breakEnd } : null,
      record,
      earlierMinutes,
      leaveType: onLeave?.type ?? null,
    };
    if (day?.working || record) scheduled.push(entry);
    else others.push(entry);
  }

  return (
    <AttendanceView
      tab={tab}
      today={today}
      nowIso={new Date().toISOString()}
      board={{ scheduled, others }}
      records={records}
      range={{ from, to }}
      branchFilter={branchFilter}
      leave={leave.filter((l) => staffIds.has(l.staffId))}
      staff={staff.map((s) => ({ id: s.id, displayName: s.displayName }))}
    />
  );
}
