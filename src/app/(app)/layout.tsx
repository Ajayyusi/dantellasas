import { cookies } from "next/headers";

import { AppShell } from "@/components/shell/app-shell";
import { SIDEBAR_COOKIE } from "@/lib/cookies";
import { userRef } from "@/lib/db";
import { getAppContext } from "@/lib/tenancy/context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  const jar = await cookies();
  const orgIndex = await userRef(ctx.session.uid).collection("orgs").limit(20).get();
  const orgs = orgIndex.docs.map((d) => ({ id: d.id, name: String(d.get("orgName") ?? d.id) }));
  if (!orgs.some((o) => o.id === ctx.org.id)) orgs.unshift({ id: ctx.org.id, name: ctx.org.name });

  return (
    <AppShell
      initialCollapsed={jar.get(SIDEBAR_COOKIE)?.value === "1"}
      orgs={orgs}
      org={{
        orgId: ctx.org.id,
        orgName: ctx.org.name,
        settings: ctx.settings,
        branches: ctx.branches,
        branchId: ctx.branchId,
        permissions: ctx.permissions,
        staffId: ctx.staffId,
        user: {
          uid: ctx.session.uid,
          name: ctx.member.displayName || ctx.session.name,
          email: ctx.session.email,
          roleName: ctx.member.roleName,
        },
      }}
    >
      {children}
    </AppShell>
  );
}
