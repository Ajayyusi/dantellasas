import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-header";
import { SalonsView } from "@/features/platform/components/salons-view";
import { listSalons, requestTime } from "@/features/platform/queries";
import { getServerEnv } from "@/lib/env.server";
import { platformAdminForPage } from "@/lib/platform/guard";

export const metadata: Metadata = { title: "Platform admin" };

export default async function PlatformAdminPage() {
  const gate = await platformAdminForPage();
  if (!("admin" in gate)) return null;
  const salons = await listSalons();
  return (
    <PageContainer>
      <SalonsView salons={salons} allowDemo={getServerEnv().ALLOW_DEMO_DATA} now={requestTime()} />
    </PageContainer>
  );
}
