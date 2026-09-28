import "server-only";

export interface SeedDemoInput {
  orgId: string;
  branchId: string;
  actorUid: string;
  actorName: string;
}

/** Filled in with the catalog/appointments/sales modules. */
export async function seedDemoData(input: SeedDemoInput): Promise<void> {
  void input;
}
