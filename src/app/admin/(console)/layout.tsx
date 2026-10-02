import { AdminHeader } from "@/features/platform/components/admin-header";
import { VerifyEmail } from "@/features/platform/components/verify-email";
import { resolvePlatformAdmin } from "@/lib/platform/guard";

/**
 * Chrome for the platform admin. It only shapes the UI: the pages redirect
 * signed-out visitors and render the 403 page for everyone else, and every
 * admin page and action checks access again.
 */
export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const state = await resolvePlatformAdmin();
  if (state.ok) {
    return (
      <div className="min-h-dvh bg-background">
        <AdminHeader email={state.admin.email} />
        <main>{children}</main>
      </div>
    );
  }
  if (state.reason === "unverified") {
    return (
      <div className="min-h-dvh bg-background">
        <AdminHeader email={state.email} />
        <main className="px-4 py-10 sm:py-16">
          <VerifyEmail email={state.email} />
        </main>
      </div>
    );
  }
  return <>{children}</>;
}
