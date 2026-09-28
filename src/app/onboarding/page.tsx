import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { getServerEnv } from "@/lib/env.server";
import { getLocale } from "@/lib/i18n/server";
import { resolveContext } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Set up your business" };

export default async function OnboardingPage() {
  const res = await resolveContext();
  if (res.ok) redirect("/");
  if (res.reason === "unauthenticated") redirect("/login");
  const locale = await getLocale();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between p-4 sm:p-6">
        <BrandMark />
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <OnboardingForm defaultLocale={locale} allowDemo={getServerEnv().ALLOW_DEMO_DATA} />
        </div>
      </main>
    </div>
  );
}
