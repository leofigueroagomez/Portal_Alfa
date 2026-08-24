import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.alfait.com.mx"
  ).replace(/\/+$/, "");

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
          "/login",
          "/login/*",
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
