import { redirect } from "next/navigation";

import { can, getAppContext } from "@/lib/tenancy/context";

/** Role-aware landing: owners/managers see the dashboard, front desk the calendar. */
export default async function Home() {
  const ctx = await getAppContext();
  if (can(ctx, "view_dashboard")) redirect("/dashboard");
  if (can(ctx, "view_appointments")) redirect("/appointments");
  if (can(ctx, "create_sales")) redirect("/pos");
  redirect("/account");
}
