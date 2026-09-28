/**
 * Creates a demo tenant with one login per role, then fills it with demo data.
 *
 *   npm run emulators          # in another terminal
 *   npm run seed               # uses the emulators by default
 *
 * Against a real project (careful — writes data): set SEED_ALLOW_PRODUCTION=true
 * plus GOOGLE_APPLICATION_CREDENTIALS / project env vars.
 */
import { getAuth } from "firebase-admin/auth";

import { seedDemoData } from "@/features/demo/seed-demo";
import { provisionOrganization } from "@/features/org/provision";
import { orgCol, userRef } from "@/lib/db";
import { getAdminApp } from "@/lib/firebase/admin";
import { DEFAULT_ROLE_PERMISSIONS, type SystemRoleKey } from "@/lib/permissions";

const PASSWORD = process.env.SEED_PASSWORD || "Dantella#2026";

async function ensureUser(email: string, displayName: string): Promise<string> {
  const auth = getAuth(getAdminApp());
  try {
    const u = await auth.getUserByEmail(email);
    return u.uid;
  } catch {
    const u = await auth.createUser({ email, password: PASSWORD, displayName, emailVerified: true });
    return u.uid;
  }
}

async function main() {
  const emulated = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  if (!emulated && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    throw new Error("Refusing to seed a real project. Start the emulators or set SEED_ALLOW_PRODUCTION=true.");
  }

  const ownerUid = await ensureUser("owner@dantella.app", "Abdelrahman Aljayousi");
  const { orgId, branchId } = await provisionOrganization({
    ownerUid,
    ownerEmail: "owner@dantella.app",
    ownerName: "Abdelrahman Aljayousi",
    businessName: "Dantella Beauty Lounge",
    branchName: "Jumeirah",
    phone: "+971 4 344 1200",
    defaultLocale: "en",
  });
  console.log(`Organization ${orgId} (branch ${branchId})`);

  const result = await seedDemoData({ orgId, branchId, actorUid: ownerUid, actorName: "Abdelrahman Aljayousi" });
  console.log(`Seeded ${result.appointments} appointments and ${result.transactions} invoices`);

  const team: { email: string; name: string; role: SystemRoleKey; branches: string[] | "all"; staffKey?: string }[] = [
    { email: "manager@dantella.app", name: "Rania Mansour", role: "branch_manager", branches: [branchId] },
    { email: "reception@dantella.app", name: "Mira Aziz", role: "receptionist", branches: [branchId] },
    { email: "cashier@dantella.app", name: "Grace Mendoza", role: "cashier", branches: [branchId] },
    { email: "sara@dantella.app", name: "Sara Haddad", role: "employee", branches: [branchId], staffKey: "sara" },
    { email: "accountant@dantella.app", name: "Rohit Varma", role: "accountant", branches: "all" },
  ];
  for (const m of team) {
    const uid = await ensureUser(m.email, m.name);
    const staffId = m.staffKey ? result.staffIds[m.staffKey] ?? null : null;
    await orgCol(orgId, "members").doc(uid).set({
      uid,
      email: m.email,
      displayName: m.name,
      roleId: m.role,
      roleKey: m.role,
      roleName: m.role.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
      permissions: DEFAULT_ROLE_PERMISSIONS[m.role],
      allBranches: m.branches === "all",
      branchIds: m.branches === "all" ? [] : m.branches,
      staffId,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await userRef(uid).set({ uid, email: m.email, displayName: m.name, lastOrgId: orgId }, { merge: true });
    await userRef(uid).collection("orgs").doc(orgId).set({ orgId, orgName: "Dantella Beauty Lounge", roleKey: m.role, createdAt: new Date() });
    if (staffId) await orgCol(orgId, "staff").doc(staffId).update({ memberUid: uid });
    console.log(`  ${m.role.padEnd(15)} ${m.email}`);
  }
  console.log(`\nAll demo logins use the password: ${PASSWORD}`);
  console.log("  owner          owner@dantella.app");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
