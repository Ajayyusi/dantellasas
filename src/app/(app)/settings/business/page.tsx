import type { Metadata } from "next";

import { BusinessView } from "@/features/settings/components/business-view";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Business settings" };

export default async function BusinessSettingsPage() {
  const ctx = await requirePagePermission("manage_settings");
  const b = ctx.settings.business;
  // logoUrl is stored next to logoPath; resolveSettings keeps unknown keys.
  const logoUrl = String((b as unknown as { logoUrl?: unknown }).logoUrl ?? "");
  const initial = {
    displayName: b.displayName || ctx.org.name,
    legalName: b.legalName,
    trn: b.trn,
    phone: b.phone,
    email: b.email,
    website: b.website,
    address: b.address,
  };
  return (
    <BusinessView
      key={JSON.stringify(initial)}
      initial={initial}
      logoUrl={logoUrl}
      registrationLabel={ctx.settings.tax.registrationLabel || "TRN"}
    />
  );
}
