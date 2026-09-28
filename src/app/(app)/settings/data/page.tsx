import type { Metadata } from "next";

import { DataView } from "@/features/settings/components/data-view";
import { getServerEnv } from "@/lib/env.server";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Data" };

export default async function DataSettingsPage() {
  const ctx = await requirePagePermission("manage_settings");
  const demo = !getServerEnv().ALLOW_DEMO_DATA ? "disabled" : ctx.member.roleKey !== "owner" ? "owner_only" : "ok";
  const branch = ctx.branches.find((b) => b.id === ctx.branchId) ?? ctx.branches[0];
  return <DataView demo={demo} branchName={branch?.name ?? ""} />;
}
