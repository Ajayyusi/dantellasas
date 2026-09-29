"use client";

import { MotionConfig } from "motion/react";
import { Direction } from "radix-ui";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

export function AppProviders({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <I18nProvider locale={locale} messages={messages}>
      <Direction.Provider dir={locale === "ar" ? "rtl" : "ltr"}>
        {/* Honour the OS "reduce motion" setting for every motion component. */}
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </MotionConfig>
      </Direction.Provider>
    </I18nProvider>
  );
}
