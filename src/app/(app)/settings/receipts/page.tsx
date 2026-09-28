import type { Metadata } from "next";

import { ReceiptsView } from "@/features/settings/components/receipts-view";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Receipt settings" };

export default async function ReceiptSettingsPage() {
  const ctx = await requirePagePermission("manage_settings");
  const initial = ctx.settings.receipts;
  return <ReceiptsView key={JSON.stringify(initial)} initial={initial} />;
}
