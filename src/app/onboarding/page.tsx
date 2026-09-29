import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { getServerEnv } from "@/lib/env.server";
import { getI18n } from "@/lib/i18n/server";
import { resolveContext } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Set up your business" };

export default async function OnboardingPage() {
  const res = await resolveContext();
  if (res.ok) redirect("/");
  if (res.reason === "unauthenticated") redirect("/login");
  const { t, locale } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-brand-wash">
      <header className="flex items-center justify-between p-5 sm:p-7">
        <BrandMark tagline={t("shell.brandTagline")} />
        <LanguageSwitcher variant="outline" />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:pt-10">
        <div className="w-full max-w-xl animate-fade-up rounded-3xl border bg-card p-7 shadow-lg sm:p-10">
          <OnboardingForm defaultLocale={locale} allowDemo={getServerEnv().ALLOW_DEMO_DATA} />
        </div>
      </main>
    </div>
  );
}
