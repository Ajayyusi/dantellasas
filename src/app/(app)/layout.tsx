import { cookies } from "next/headers";

import { AppShell } from "@/components/shell/app-shell";
import { SIDEBAR_COOKIE } from "@/lib/cookies";
import { userRef } from "@/lib/db";
import { listedAsPlatformAdmin } from "@/lib/platform/guard";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { getAppContext } from "@/lib/tenancy/context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  const jar = await cookies();
  const orgIndex = await userRef(ctx.session.uid).collection("orgs").limit(20).get();
  const orgs = orgIndex.docs.map((d) => ({ id: d.id, name: String(d.get("orgName") ?? d.id) }));
  if (!orgs.some((o) => o.id === ctx.org.id)) orgs.unshift({ id: ctx.org.id, name: ctx.org.name });

  // Tenant accent from Settings → Appearance; validated so it can be inlined safely.
  // The brand default uses the tuned palette as-is (earlier defaults resolve to it).
  const chosen = ctx.settings.appearance.accentColor.toLowerCase();
  const accent = /^#[0-9a-f]{6}$/.test(chosen) && chosen !== DEFAULT_SETTINGS.appearance.accentColor ? chosen : null;

  return (
    <>
      {accent ? (
        <style>{`html:root{--primary:${accent}}html.dark{--primary:color-mix(in oklch,${accent} 55%,white)}`}</style>
      ) : null}
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
          roleKey: ctx.member.roleKey,
          platformAdmin: listedAsPlatformAdmin(ctx.session.email),
        },
      }}
    >
        {children}
      </AppShell>
    </>
  );
}
