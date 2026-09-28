"use client";

import { PageContainer, PageHeader } from "@/components/common/page-header";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeClockCard } from "@/features/attendance/components/time-clock-card";
import { useI18n } from "@/lib/i18n/client";
import { localeNames } from "@/lib/i18n/config";

import { PasswordCard } from "./password-card";
import { ProfileCard } from "./profile-card";

export function AccountView({
  displayName,
  email,
  roleName,
  clock,
}: {
  displayName: string;
  email: string;
  roleName: string;
  clock: React.ComponentProps<typeof TimeClockCard> | null;
}) {
  const { t, locale } = useI18n();
  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title={t("account.title")} description={t("account.description")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <ProfileCard displayName={displayName} email={email} roleName={roleName} />
          <Card>
            <CardHeader>
              <div className="grid gap-1">
                <CardTitle>{t("account.language")}</CardTitle>
                <CardDescription>{t("account.languageHint", { language: localeNames[locale] })}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <LanguageSwitcher variant="outline" />
            </CardContent>
          </Card>
        </div>
        <div className="grid content-start gap-6">
          {clock ? <TimeClockCard {...clock} /> : null}
          <PasswordCard email={email} />
        </div>
      </div>
    </PageContainer>
  );
}
