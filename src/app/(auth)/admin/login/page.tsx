import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminSignIn } from "@/features/platform/components/admin-sign-in";
import { resolvePlatformAdmin } from "@/lib/platform/guard";

export const metadata: Metadata = { title: "Admin sign-in" };

/** Public: signed-out visitors to /admin land here (src/proxy.ts). */
export default async function AdminLoginPage() {
  const state = await resolvePlatformAdmin();
  if (state.ok || state.reason === "unverified") redirect("/admin");
  return <AdminSignIn signedInAs={state.reason === "denied" ? state.email || null : null} />;
}
