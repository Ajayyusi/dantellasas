import type { NextConfig } from "next";

/**
 * Firebase App Hosting injects the web app config as FIREBASE_WEBAPP_CONFIG
 * at build time. Mapping it onto NEXT_PUBLIC_* means a production deploy needs
 * no manual Firebase env vars; locally, .env.local provides them instead.
 */
function webAppConfigEnv(): Record<string, string> {
  const raw = process.env.FIREBASE_WEBAPP_CONFIG;
  if (!raw) return {};
  try {
    const c = JSON.parse(raw) as Record<string, string | undefined>;
    const map: Record<string, string | undefined> = {
      NEXT_PUBLIC_FIREBASE_API_KEY: c.apiKey,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: c.authDomain,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: c.projectId,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: c.storageBucket,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: c.messagingSenderId,
      NEXT_PUBLIC_FIREBASE_APP_ID: c.appId,
    };
    return Object.fromEntries(
      Object.entries(map).filter(
        (e): e is [string, string] => typeof e[1] === "string" && !process.env[e[0]],
      ),
    );
  } catch {
    return {};
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // firebase-admin must stay server-side and unbundled.
  serverExternalPackages: ["firebase-admin"],
  env: webAppConfigEnv(),
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
    authInterrupts: true,
  },
};

export default nextConfig;
