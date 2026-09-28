import type { Metadata } from "next";

import { RolesView } from "@/features/settings/components/roles-view";
import { listRoles } from "@/features/settings/queries";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Roles & permissions" };

export default async function RolesSettingsPage() {
  const ctx = await requirePagePermission("manage_users");
  const roles = await listRoles(ctx.org.id);
  return <RolesView roles={roles} />;
}
