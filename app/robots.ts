import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = SITE_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/dashboard",
          "/dashboard/*",
          "/director-dashboard",
          "/director-dashboard/*",
          "/portal",
          "/portal/*",
          "/api",
          "/api/*",
          // `/login` no va aqui a proposito: lleva noindex (app/login/layout.tsx)
          // y Google debe poder rastrearlo para leerlo.
          "/public",
          "/public/*",
          "/auth",
          "/auth/*",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
