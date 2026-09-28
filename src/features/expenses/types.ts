import type { ExpenseDTO } from "@/lib/types";

/**
 * ExpenseDTO plus fields the list/form need that the shared DTO doesn't carry
 * yet (see report: candidates for src/lib/types.ts).
 */
export interface ExpenseRow extends ExpenseDTO {
  supplierId: string | null;
}

export interface SupplierOption {
  id: string;
  name: string;
  active: boolean;
}
