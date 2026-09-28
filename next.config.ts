import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // firebase-admin must stay server-side and unbundled.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
