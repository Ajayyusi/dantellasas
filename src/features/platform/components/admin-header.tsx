"use client";

import { ExternalLinkIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";

/** Top bar of the platform admin: brand, admin badge, a way back to the app, language and sign-out. */
export function AdminHeader({ email }: { email: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/admin" className="rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-ring">
          <BrandMark size="sm" />
        </Link>
        <Badge variant="primary">{t("platform.badge")}</Badge>
        <div className="ms-auto flex items-center gap-1.5">
          {email ? <span className="me-1 hidden truncate text-[13px] text-muted-foreground md:inline" dir="ltr">{email}</span> : null}
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/dashboard">
              <ExternalLinkIcon />
              {t("platform.openApp")}
            </Link>
          </Button>
          <LanguageSwitcher showLabel={false} />
          <Button
            variant="outline"
            size="sm"
            aria-label={t("platform.signOut")}
            onClick={async () => {
              await signOutEverywhere();
              router.replace("/admin/login");
              router.refresh();
            }}
          >
            <LogOutIcon />
            <span className="hidden sm:inline">{t("platform.signOut")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
