import { redirect } from "next/navigation";

import { visibleSections } from "@/features/settings/sections";
import { getAppContext } from "@/lib/tenancy/context";

export default async function SettingsIndexPage() {
  const ctx = await getAppContext();
  // "language" needs no permission, so there is always a section to land on.
  redirect(visibleSections(ctx.permissions)[0]?.href ?? "/settings/language");
}
