import Link from "next/link";

import { requireOrg } from "@/lib/tenancy/guards";
import { listAccessibleBranches } from "@/lib/tenancy/service";

/** Branch picker — placeholder. Org dashboard is pending research. */
export default async function OrgHome({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { membership } = await requireOrg(orgId);
  const branches = await listAccessibleBranches(orgId, membership);

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">Branches</h1>
      <ul className="flex flex-col gap-2">
        {branches.map((b) => (
          <li key={b.id}>
            <Link className="underline" href={`/o/${orgId}/b/${b.id}`}>
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
