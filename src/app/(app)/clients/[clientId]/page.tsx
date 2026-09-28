import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientProfile } from "@/features/clients/components/profile/client-profile";
import {
  getClient,
  listClientActivity,
  listClientAppointments,
  listClientMemberships,
  listClientNotes,
  listClientPackages,
  listClientTransactions,
  requestTime,
} from "@/features/clients/queries";
import { listStaff } from "@/features/staff/queries";
import { can, getAppContext, requirePagePermission } from "@/lib/tenancy/context";

export async function generateMetadata({ params }: PageProps<"/clients/[clientId]">): Promise<Metadata> {
  const ctx = await getAppContext();
  if (!can(ctx, "view_customers")) return { title: "Clients" };
  const { clientId } = await params;
  const client = await getClient(ctx.org.id, clientId);
  return { title: client?.fullName ?? "Clients" };
}

export default async function ClientProfilePage({ params }: PageProps<"/clients/[clientId]">) {
  const ctx = await requirePagePermission("view_customers");
  const { clientId } = await params;
  const client = await getClient(ctx.org.id, clientId);
  if (!client) notFound();

  const [notes, appointments, transactions, packages, memberships, activity, staff] = await Promise.all([
    listClientNotes(ctx, clientId),
    can(ctx, "view_appointments") ? listClientAppointments(ctx, clientId) : null,
    can(ctx, "view_sales") ? listClientTransactions(ctx, clientId) : null,
    listClientPackages(ctx.org.id, clientId),
    listClientMemberships(ctx.org.id, clientId),
    can(ctx, "view_audit_log") ? listClientActivity(ctx.org.id, clientId) : null,
    listStaff(ctx.org.id),
  ]);

  return (
    <ClientProfile
      client={client}
      notes={notes}
      appointments={appointments}
      transactions={transactions}
      packages={packages}
      memberships={memberships}
      activity={activity}
      now={requestTime()}
      staff={staff
        .filter((s) => s.status !== "archived" || s.id === client.preferredStaffId)
        .map((s) => ({ id: s.id, displayName: s.displayName, color: s.color, photoUrl: s.photoUrl, active: s.status === "active" }))}
    />
  );
}
