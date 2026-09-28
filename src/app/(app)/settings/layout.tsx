import { PageContainer, PageHeader } from "@/components/common/page-header";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { visibleSections } from "@/features/settings/sections";
import { getI18n } from "@/lib/i18n/server";
import { getAppContext } from "@/lib/tenancy/context";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  const { t } = await getI18n();
  const sections = visibleSections(ctx.permissions).map((s) => s.key);
  return (
    <PageContainer>
      <PageHeader title={t("settings.title")} description={t("settings.description")} className="pb-4 lg:pb-6" />
      <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
        <SettingsNav sections={sections} />
        <div className="min-w-0">{children}</div>
      </div>
    </PageContainer>
  );
}
