import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/quotes/[id]/premium-pdf": [
      "./public/logo-print.png",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
    "/api/quotes/*/premium-pdf": [
      "./public/logo-print.png",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
};

export default nextConfig;
