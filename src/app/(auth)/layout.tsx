import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden border-e bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
        <BrandMark size="lg" />
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">{t("auth.tagline")}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{t("auth.taglineBody")}</p>
        </div>
        <div aria-hidden className="grid grid-cols-3 gap-3 opacity-90">
          {[
            ["10:00", "w-3/4"],
            ["10:45", "w-1/2"],
            ["11:30", "w-2/3"],
          ].map(([time, width]) => (
            <div key={time} className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground tabular">{time}</div>
              <div className={`mt-2 h-2 rounded-full bg-primary/25 ${width}`} />
              <div className="mt-1.5 h-2 w-1/3 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </aside>
      <main className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <BrandMark className="lg:invisible" />
          <LanguageSwitcher variant="ghost" />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
