import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Readex_Pro } from "next/font/google";
import Script from "next/script";

import { AppProviders } from "@/components/providers/app-providers";
import { brand } from "@/config/brand";
import { getI18n } from "@/lib/i18n/server";

import "./globals.css";

// One family for the whole UI (headings are heavier and tighter); Arabic
// characters fall through to Readex Pro, which shares its geometric feel.
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const arabic = Readex_Pro({ subsets: ["arabic"], variable: "--font-arabic", display: "swap" });

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: "Beauty salon and spa management — appointments, clients, checkout and reporting.",
  applicationName: brand.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f6" },
    { media: "(prefers-color-scheme: dark)", color: "#151314" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Applies the saved theme before first paint so there is no flash. Light is the
// default; dark only when chosen (or "system" on a dark OS).
const themeScript = `(function(){try{var t=localStorage.getItem('dc-theme')||'light';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir, messages } = await getI18n();
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${sans.variable} ${arabic.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AppProviders locale={locale} messages={messages}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
