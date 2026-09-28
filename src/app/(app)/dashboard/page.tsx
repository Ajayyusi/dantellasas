import { PageContainer, PageHeader } from "@/components/common/page-header";
import { requirePagePermission } from "@/lib/tenancy/context";

export default async function DashboardPage() {
  const ctx = await requirePagePermission("view_dashboard");
  return (
    <PageContainer>
      <PageHeader title={ctx.org.name} description="Dashboard" />
    </PageContainer>
  );
}
