import { requireBranch } from "@/lib/tenancy/guards";

/**
 * Branch workspace root. Deliberately empty: appointment, POS, CRM and
 * dashboard screens will be designed only after docs/product-research.md
 * is verified.
 */
export default async function BranchHome({
  params,
}: {
  params: Promise<{ orgId: string; branchId: string }>;
}) {
  const { orgId, branchId } = await params;
  const { branch } = await requireBranch(orgId, branchId);

  return (
    <main className="flex flex-col gap-2 p-6">
      <h1 className="text-lg font-semibold">{branch.name}</h1>
      <p className="text-muted-foreground text-sm">Branch workspace — UI pending verified product research.</p>
    </main>
  );
}
