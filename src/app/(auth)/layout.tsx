import { CalendarHeartIcon, GemIcon, SparklesIcon } from "lucide-react";

import { BrandMark, Rosette } from "@/components/brand-mark";
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
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden border-e bg-brand-wash lg:flex lg:flex-col lg:justify-between lg:p-14">
        <Rosette className="pointer-events-none absolute -end-44 -top-44 size-[560px] opacity-60" />
        <Rosette className="pointer-events-none absolute -bottom-40 -start-32 size-[420px] opacity-40" />

        <BrandMark size="lg" tagline={t("shell.brandTagline")} className="relative" />

        <div className="relative max-w-lg animate-fade-up">
          <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-foreground">
            <span aria-hidden className="h-px w-10 bg-gold" />
            {t("auth.eyebrow")}
          </div>
          <h2 className="font-display text-[58px] font-semibold leading-[1.02] text-foreground">{t("auth.tagline")}</h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{t("auth.taglineBody")}</p>
          <ul className="mt-9 grid gap-3.5">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5 text-base font-medium">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-gold/40 bg-card/70 text-primary shadow-xs">
                  <Icon className="size-5" strokeWidth={1.6} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden className="relative flex items-end gap-4">
          <div className="w-60 animate-float rounded-2xl border bg-card/90 p-4 shadow-md backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground tabular">10:30</span>
              <span className="size-2 rounded-full bg-[var(--status-confirmed)]" />
            </div>
            <div className="mt-3 h-2.5 w-4/5 rounded-full bg-primary/30" />
            <div className="mt-2 h-2 w-1/2 rounded-full bg-muted" />
            <div className="mt-4 flex -space-x-2 rtl:space-x-reverse">
              {["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"].map((c) => (
                <span key={c} className="size-6 rounded-full ring-2 ring-card" style={{ backgroundColor: `color-mix(in oklch, ${c} 45%, var(--card))` }} />
              ))}
            </div>
          </div>
          <div className="mb-8 w-52 animate-float rounded-2xl border bg-card/90 p-4 shadow-md backdrop-blur [animation-delay:-3.5s]">
            <span className="text-xs font-semibold text-muted-foreground">{t("common.today")}</span>
            <div className="mt-1 font-display text-3xl font-semibold tabular">AED 7,297</div>
            <svg viewBox="0 0 120 32" className="mt-2 h-8 w-full" fill="none">
              <path d="M2 26 C 18 24, 24 12, 38 16 S 62 28, 74 14 S 98 4, 118 8" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
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
          <div className="w-full max-w-[460px] animate-fade-up rounded-3xl border bg-card p-7 shadow-lg sm:p-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
