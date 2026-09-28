import type { Metadata } from "next";

import { StaffView } from "@/features/staff/components/staff-view";
import { listStaff, staffForBranch, staffInBranches } from "@/features/staff/queries";
import { listCategories, listServices } from "@/features/services/queries";
import { todayKey } from "@/lib/dates";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const ctx = await requirePagePermission("view_staff");
  const [all, services, categories] = await Promise.all([
    listStaff(ctx.org.id),
    listServices(ctx.org.id),
    listCategories(ctx.org.id),
  ]);
  const inScope = (s: (typeof all)[number]) => staffInBranches(s, ctx.scopeBranchIds);
  const current = staffForBranch(all, ctx.branchId).filter(inScope);
  const archived = all.filter(
    (s) => s.status === "archived" && inScope(s) && (!ctx.branchId || s.branchIds.length === 0 || s.branchIds.includes(ctx.branchId)),
  );
  return (
    <StaffView
      staff={[...current, ...archived]}
      services={services
        .filter((s) => s.active)
        .map((s) => ({
          id: s.id,
          name: s.name,
          nameAr: s.nameAr,
          categoryId: s.categoryId,
          durationMin: s.durationMin,
          openToAll: s.staffIds.length === 0,
        }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, nameAr: c.nameAr, color: c.color }))}
      today={todayKey(ctx.timezone)}
    />
  );
}
