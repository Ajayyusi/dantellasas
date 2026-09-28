import type { Metadata } from "next";

import { UsersView } from "@/features/settings/components/users-view";
import { listAllBranches, listMembers, listRoles, listStaffOptions } from "@/features/settings/queries";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Users" };

export default async function UsersSettingsPage() {
  const ctx = await requirePagePermission("manage_users");
  const [members, roles, branches, staff] = await Promise.all([
    listMembers(ctx.org.id),
    listRoles(ctx.org.id),
    listAllBranches(ctx.org.id),
    listStaffOptions(ctx.org.id),
  ]);
  return (
    <UsersView
      members={members}
      roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name, nameAr: r.nameAr }))}
      branches={branches}
      staff={staff}
    />
  );
}
