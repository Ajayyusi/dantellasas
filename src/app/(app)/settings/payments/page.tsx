import type { Metadata } from "next";

import { PaymentsView } from "@/features/settings/components/payments-view";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Payment settings" };

export default async function PaymentSettingsPage() {
  const ctx = await requirePagePermission("manage_settings");
  const initial = ctx.settings.payments;
  return <PaymentsView key={JSON.stringify(initial)} initial={initial} />;
}
