import type { Metadata } from "next";

import { BranchesView } from "@/features/settings/components/branches-view";
import { listAllBranches } from "@/features/settings/queries";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Branches" };

export default async function BranchesSettingsPage() {
  const ctx = await requirePagePermission("manage_settings");
  const branches = await listAllBranches(ctx.org.id);
  return <BranchesView branches={branches} />;
}
