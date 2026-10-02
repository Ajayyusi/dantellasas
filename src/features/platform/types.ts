/** One business on the platform, as the admin list shows it. */
export interface SalonRow {
  id: string;
  name: string;
  status: "active" | "suspended";
  createdAt: string | null;
  owner: { uid: string; name: string; email: string } | null;
  plan: string;
  trialEndsAt: string | null;
  branches: number;
  staff: number;
  clients: number;
  members: number;
  lastActivityAt: string | null;
}
