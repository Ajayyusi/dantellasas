import { requireOrg } from "@/lib/tenancy/guards";

/**
 * Tenant boundary: every route under /o/[orgId] is membership-checked here.
 * The app shell (navigation, dashboard layout) is intentionally NOT designed
 * yet — it depends on verified product research.
 */
export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const { org, membership } = await requireOrg(orgId);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b px-6 py-3 text-sm">
        <span className="font-medium">{org.name}</span>
        <span className="text-muted-foreground ms-2">· {membership.role}</span>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
