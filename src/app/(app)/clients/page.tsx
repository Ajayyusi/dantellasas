import type { Metadata } from "next";

import { ClientsView } from "@/features/clients/components/clients-view";
import { CLIENT_DIRECTORY_CAP, listClients, requestTime } from "@/features/clients/queries";
import { listStaff } from "@/features/staff/queries";
import { requirePagePermission } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const ctx = await requirePagePermission("view_customers");
  const sp = await searchParams;
  const status = sp.status === "archived" ? "archived" : "active";
  const [{ clients, capped }, staff] = await Promise.all([listClients(ctx.org.id, status), listStaff(ctx.org.id)]);
  return (
    <ClientsView
      clients={clients}
      status={status}
      capped={capped}
      cap={CLIENT_DIRECTORY_CAP}
      openNew={sp.new === "1"}
      now={requestTime()}
      staff={staff
        .filter((s) => s.status !== "archived")
        .map((s) => ({ id: s.id, displayName: s.displayName, color: s.color, photoUrl: s.photoUrl, active: s.status === "active" }))}
    />
  );
}
