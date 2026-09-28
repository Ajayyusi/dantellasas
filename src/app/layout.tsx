import type { Metadata } from "next";

import { AuthProvider } from "@/components/providers/auth-provider";
import { getDefaultLocale, getDir } from "@/lib/i18n/config";

import "./globals.css";

// Product name is a placeholder until branding is decided.
export const metadata: Metadata = {
  title: "Salon Platform",
  description: "Multi-branch salon management platform (scaffold)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getDefaultLocale();
  return (
    <html lang={locale} dir={getDir(locale)} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
