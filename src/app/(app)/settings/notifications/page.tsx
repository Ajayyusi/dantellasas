import type { Metadata } from "next";

import { NotificationsView } from "@/features/settings/components/notifications-view";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  const ctx = await requirePagePermission("manage_settings");
  const initial = ctx.settings.notifications;
  return <NotificationsView key={JSON.stringify(initial)} initial={initial} />;
}
