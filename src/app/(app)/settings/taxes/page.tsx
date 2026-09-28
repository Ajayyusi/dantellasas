import type { Metadata } from "next";

import { TaxesView } from "@/features/settings/components/taxes-view";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Tax settings" };

export default async function TaxSettingsPage() {
  const ctx = await requirePagePermission("manage_settings");
  const initial = ctx.settings.tax;
  return <TaxesView key={JSON.stringify(initial)} initial={initial} />;
}
