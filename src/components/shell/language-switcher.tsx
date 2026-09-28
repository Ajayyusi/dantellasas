"use client";

import { LanguagesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import { localeNames } from "@/lib/i18n/config";

/** Toggles English ⇄ Arabic; the whole layout mirrors on the next render. */
export function LanguageSwitcher({
  variant = "ghost",
  showLabel = true,
}: {
  variant?: "ghost" | "outline";
  showLabel?: boolean;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <Button
      variant={variant}
      size={showLabel ? "sm" : "icon-sm"}
      disabled={pending}
      aria-label={`${t("shell.language")}: ${localeNames[next]}`}
      onClick={() =>
        startTransition(async () => {
          await setLocaleAction(next);
          router.refresh();
        })
      }
    >
      <LanguagesIcon />
      {showLabel ? <span lang={next}>{localeNames[next]}</span> : null}
    </Button>
  );
}
