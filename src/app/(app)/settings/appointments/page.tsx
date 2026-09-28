import type { Metadata } from "next";

import { AppointmentsView } from "@/features/settings/components/appointments-view";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Appointment settings" };

export default async function AppointmentSettingsPage() {
  const ctx = await requirePagePermission("manage_settings");
  const initial = ctx.settings.appointments;
  return <AppointmentsView key={JSON.stringify(initial)} initial={initial} />;
}
