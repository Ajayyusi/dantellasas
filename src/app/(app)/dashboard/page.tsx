import type { Metadata } from "next";

import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { loadDashboard } from "@/features/dashboard/queries";
import { minutesOfDay } from "@/lib/dates";
import { rangeFromParams } from "@/lib/range-params";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Dashboard" };

function greetingFor(tz: string) {
  const minutes = minutesOfDay(new Date(), tz);
  if (minutes < 12 * 60) return "morning" as const;
  if (minutes < 17 * 60) return "afternoon" as const;
  return "evening" as const;
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const ctx = await requirePagePermission("view_dashboard");
  const { preset, range } = rangeFromParams(await searchParams, ctx.timezone, ctx.settings.locale.weekStartsOn, "this_month");
  const data = await loadDashboard(ctx, range);
  return <DashboardView data={data} preset={preset} range={range} greeting={greetingFor(ctx.timezone)} />;
}
