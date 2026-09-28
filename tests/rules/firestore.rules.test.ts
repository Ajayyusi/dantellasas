import { readFileSync } from "node:fs";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../../src/lib/permissions";

/**
 * Security rules tests (run with `npm run test:rules`, which starts the
 * Firestore emulator). They prove tenant isolation, permission-aware reads,
 * branch scoping and that the browser cannot write domain data.
 */

let env: RulesTestEnvironment;

const ORG_A = "orgA";
const ORG_B = "orgB";

function memberDoc(overrides: Record<string, unknown>) {
  return {
    status: "active",
    roleKey: "custom",
    permissions: [] as string[],
    allBranches: false,
    branchIds: [] as string[],
    staffId: null,
    ...overrides,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-dantella-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const seed: [string, Record<string, unknown>][] = [
      [`organizations/${ORG_A}`, { name: "Salon A", status: "active" }],
      [`organizations/${ORG_B}`, { name: "Salon B", status: "active" }],
      [`organizations/${ORG_A}/members/owner`, memberDoc({ roleKey: "owner", permissions: ALL_PERMISSIONS, allBranches: true })],
      [`organizations/${ORG_A}/members/reception`, memberDoc({ roleKey: "receptionist", permissions: DEFAULT_ROLE_PERMISSIONS.receptionist, branchIds: ["b1"] })],
      [`organizations/${ORG_A}/members/stylist`, memberDoc({ roleKey: "employee", permissions: DEFAULT_ROLE_PERMISSIONS.employee, branchIds: ["b1"], staffId: "staffSara" })],
      [`organizations/${ORG_A}/members/accountant`, memberDoc({ roleKey: "accountant", permissions: DEFAULT_ROLE_PERMISSIONS.accountant, allBranches: true })],
      [`organizations/${ORG_A}/members/suspended`, memberDoc({ status: "suspended", permissions: ALL_PERMISSIONS, allBranches: true })],
      [`organizations/${ORG_B}/members/ownerB`, memberDoc({ roleKey: "owner", permissions: ALL_PERMISSIONS, allBranches: true })],
      [`organizations/${ORG_A}/clients/c1`, { fullName: "Mariam Al Nuaimi" }],
      [`organizations/${ORG_B}/clients/c9`, { fullName: "Other tenant client" }],
      [`organizations/${ORG_A}/appointments/a1`, { branchId: "b1", staffIds: ["staffSara"], dateKey: "2026-10-01" }],
      [`organizations/${ORG_A}/appointments/a2`, { branchId: "b1", staffIds: ["staffMaria"], dateKey: "2026-10-01" }],
      [`organizations/${ORG_A}/appointments/a3`, { branchId: "b2", staffIds: ["staffSara"], dateKey: "2026-10-01" }],
      [`organizations/${ORG_A}/transactions/t1`, { branchId: "b1", totalMinor: 15000 }],
      [`organizations/${ORG_A}/transactions/t2`, { branchId: "b2", totalMinor: 9000 }],
      [`organizations/${ORG_A}/auditLogs/l1`, { action: "client.created" }],
      [`organizations/${ORG_A}/counters/invoice`, { value: 10 }],
      [`organizations/${ORG_A}/services/s1`, { name: "Haircut" }],
      [`users/owner`, { displayName: "Owner", locale: "en" }],
    ];
    for (const [path, data] of seed) await setDoc(doc(db, path), data);
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

describe("tenant isolation", () => {
  it("denies unauthenticated access", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `organizations/${ORG_A}`)));
    await assertFails(getDoc(doc(db, `organizations/${ORG_A}/clients/c1`)));
  });

  it("lets members read their own organization", async () => {
    await assertSucceeds(getDoc(doc(as("owner"), `organizations/${ORG_A}`)));
    await assertSucceeds(getDoc(doc(as("owner"), `organizations/${ORG_A}/clients/c1`)));
  });

  it("never lets organization A read organization B", async () => {
    const db = as("owner");
    await assertFails(getDoc(doc(db, `organizations/${ORG_B}`)));
    await assertFails(getDoc(doc(db, `organizations/${ORG_B}/clients/c9`)));
    await assertFails(getDocs(collection(db, `organizations/${ORG_B}/clients`)));
    await assertFails(getDoc(doc(as("ownerB"), `organizations/${ORG_A}/clients/c1`)));
  });

  it("denies suspended members", async () => {
    await assertFails(getDoc(doc(as("suspended"), `organizations/${ORG_A}`)));
    await assertFails(getDoc(doc(as("suspended"), `organizations/${ORG_A}/clients/c1`)));
  });

  it("does not let a user create a membership for themselves", async () => {
    await assertFails(
      setDoc(doc(as("intruder"), `organizations/${ORG_A}/members/intruder`), memberDoc({ permissions: ALL_PERMISSIONS, allBranches: true })),
    );
    await assertFails(
      updateDoc(doc(as("reception"), `organizations/${ORG_A}/members/reception`), { permissions: ALL_PERMISSIONS }),
    );
  });
});

describe("permission-aware reads", () => {
  it("hides clients from roles without view_customers", async () => {
    await assertSucceeds(getDoc(doc(as("reception"), `organizations/${ORG_A}/clients/c1`)));
    await assertFails(getDoc(doc(as("accountant"), `organizations/${ORG_A}/clients/c1`)));
  });

  it("restricts the audit log to view_audit_log", async () => {
    await assertSucceeds(getDoc(doc(as("owner"), `organizations/${ORG_A}/auditLogs/l1`)));
    await assertSucceeds(getDoc(doc(as("accountant"), `organizations/${ORG_A}/auditLogs/l1`)));
    await assertFails(getDoc(doc(as("reception"), `organizations/${ORG_A}/auditLogs/l1`)));
  });

  it("never exposes counters", async () => {
    await assertFails(getDoc(doc(as("owner"), `organizations/${ORG_A}/counters/invoice`)));
  });

  it("lets members read other members only with manage_users", async () => {
    await assertSucceeds(getDoc(doc(as("reception"), `organizations/${ORG_A}/members/reception`)));
    await assertFails(getDoc(doc(as("reception"), `organizations/${ORG_A}/members/owner`)));
    await assertSucceeds(getDoc(doc(as("owner"), `organizations/${ORG_A}/members/reception`)));
  });
});

describe("branch scoping", () => {
  it("limits transactions to the member's branches", async () => {
    await assertSucceeds(getDoc(doc(as("reception"), `organizations/${ORG_A}/transactions/t1`)));
    await assertFails(getDoc(doc(as("reception"), `organizations/${ORG_A}/transactions/t2`)));
    await assertSucceeds(getDoc(doc(as("accountant"), `organizations/${ORG_A}/transactions/t2`)));
  });

  it("supports branch-constrained queries", async () => {
    const db = as("reception");
    await assertSucceeds(getDocs(query(collection(db, `organizations/${ORG_A}/transactions`), where("branchId", "==", "b1"))));
    await assertFails(getDocs(collection(db, `organizations/${ORG_A}/transactions`)));
  });
});

describe("employee sees only own appointments", () => {
  it("allows own lines in own branch", async () => {
    await assertSucceeds(getDoc(doc(as("stylist"), `organizations/${ORG_A}/appointments/a1`)));
  });
  it("denies colleagues' appointments", async () => {
    await assertFails(getDoc(doc(as("stylist"), `organizations/${ORG_A}/appointments/a2`)));
  });
  it("denies other branches", async () => {
    await assertFails(getDoc(doc(as("stylist"), `organizations/${ORG_A}/appointments/a3`)));
  });
  it("lets the receptionist see every appointment in the branch", async () => {
    await assertSucceeds(getDoc(doc(as("reception"), `organizations/${ORG_A}/appointments/a2`)));
  });
});

describe("writes", () => {
  it("denies client-side writes to domain data, even for owners", async () => {
    const db = as("owner");
    await assertFails(setDoc(doc(db, `organizations/${ORG_A}/clients/new`), { fullName: "X" }));
    await assertFails(updateDoc(doc(db, `organizations/${ORG_A}/transactions/t1`), { totalMinor: 0 }));
    await assertFails(setDoc(doc(db, `organizations/${ORG_A}/services/s1`), { name: "Free" }));
    await assertFails(setDoc(doc(db, `organizations/${ORG_A}/auditLogs/fake`), { action: "x" }));
  });

  it("lets users update harmless fields on their own profile only", async () => {
    await assertSucceeds(updateDoc(doc(as("owner"), "users/owner"), { locale: "ar" }));
    await assertFails(updateDoc(doc(as("owner"), "users/owner"), { isPlatformAdmin: true }));
    await assertFails(getDoc(doc(as("reception"), "users/owner")));
  });

  it("denies unknown top-level collections", async () => {
    await assertFails(setDoc(doc(as("owner"), "anything/x"), { a: 1 }));
    await assertFails(getDoc(doc(as("owner"), "anything/x")));
  });
});
