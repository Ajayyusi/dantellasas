import type { Metadata } from "next";

import { AppearanceView } from "@/features/settings/components/appearance-view";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearanceSettingsPage() {
  const ctx = await requirePagePermission("manage_settings");
  const initial = ctx.settings.appearance;
  return <AppearanceView key={JSON.stringify(initial)} initial={initial} />;
}
