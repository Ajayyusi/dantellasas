import Link from "next/link";

import { requireSession } from "@/lib/auth/session";
import { listUserOrgs } from "@/lib/tenancy/service";

/** Organization picker — functional placeholder, not final UI. */
export default async function OrgsPage() {
  const session = await requireSession();
  const orgs = await listUserOrgs(session.uid);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Organizations</h1>
      {orgs.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No organizations yet. Create one via <code>POST /api/organizations</code> (onboarding UI pending).
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orgs.map((o) => (
            <li key={o.orgId}>
              <Link className="underline" href={`/o/${o.orgId}`}>
                {o.orgName}
              </Link>{" "}
              <span className="text-muted-foreground text-xs">({o.role})</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
