import type { Metadata } from "next";

import { ServicesView } from "@/features/services/components/services-view";
import { listCategories, listServices } from "@/features/services/queries";
import { listStaff } from "@/features/staff/queries";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const ctx = await requirePagePermission("manage_services");
  const [categories, services, staff] = await Promise.all([
    listCategories(ctx.org.id),
    listServices(ctx.org.id),
    listStaff(ctx.org.id),
  ]);
  return (
    <ServicesView
      categories={categories}
      services={services}
      staff={staff
        .filter((s) => s.status === "active")
        .map((s) => ({ id: s.id, displayName: s.displayName, color: s.color, photoUrl: s.photoUrl }))}
    />
  );
}
