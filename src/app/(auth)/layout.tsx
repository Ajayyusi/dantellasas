import { CalendarHeartIcon, GemIcon, SparklesIcon } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  const highlights = [
    { icon: CalendarHeartIcon, text: t("auth.highlights.calendar") },
    { icon: GemIcon, text: t("auth.highlights.checkout") },
    { icon: SparklesIcon, text: t("auth.highlights.insights") },
  ];
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden border-e bg-brand-wash lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
        <BrandMark size="lg" tagline={t("shell.brandTagline")} className="relative" />

        <div className="relative max-w-lg animate-fade-up">
          <p className="mb-4 text-[13px] font-semibold text-primary">{t("auth.eyebrow")}</p>
          <h2 className="font-display text-[44px] font-bold leading-[1.06] tracking-[-0.035em] text-foreground xl:text-[48px]">
            {t("auth.tagline")}
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">{t("auth.taglineBody")}</p>
          <ul className="mt-8 grid gap-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] font-medium">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-card text-primary">
                  <Icon className="size-[18px]" strokeWidth={1.7} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden className="relative flex items-end gap-4">
          <div className="w-60 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground tabular">10:30</span>
              <span className="size-2 rounded-full bg-[var(--status-confirmed)]" />
            </div>
            <div className="mt-3 h-2.5 w-4/5 rounded-full bg-primary/25" />
            <div className="mt-2 h-2 w-1/2 rounded-full bg-muted" />
            <div className="mt-4 flex -space-x-2 rtl:space-x-reverse">
              {["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"].map((c) => (
                <span key={c} className="size-6 rounded-full ring-2 ring-card" style={{ backgroundColor: `color-mix(in oklch, ${c} 30%, var(--card))` }} />
              ))}
            </div>
          </div>
          <div className="mb-8 w-52 rounded-2xl border bg-card p-4 shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground">{t("common.today")}</span>
            <div className="mt-1 font-display text-[26px] font-bold tabular">AED 7,297</div>
            <svg viewBox="0 0 120 32" className="mt-2 h-8 w-full" fill="none">
              <path d="M2 26 C 18 24, 24 12, 38 16 S 62 28, 74 14 S 98 4, 118 8" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-col bg-background">
        <div className="flex items-center justify-between p-5 sm:p-7">
          <BrandMark tagline={t("shell.brandTagline")} className="lg:invisible" />
          <LanguageSwitcher variant="outline" />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="w-full max-w-[440px] animate-fade-up rounded-2xl border bg-card p-6 shadow-sm sm:p-9">{children}</div>
        </div>
      </main>
    </div>
  );
}
