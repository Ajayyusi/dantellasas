import type { Metadata } from "next";

import { LanguageView } from "@/features/settings/components/language-view";
import { can, getAppContext } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Language" };

/** Any member may change their own language; the business default needs manage_settings. */
export default async function LanguageSettingsPage() {
  const ctx = await getAppContext();
  const orgDefault = can(ctx, "manage_settings") ? { defaultLocale: ctx.settings.locale.defaultLocale } : null;
  return <LanguageView orgDefault={orgDefault} />;
}
