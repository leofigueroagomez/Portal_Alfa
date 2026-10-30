import type { MetadataRoute } from "next";
import { STATIC_BRANDS, STATIC_CATALOG_PRODUCTS } from "@/lib/catalogData";
import { STATIC_PORTFOLIO_PROJECTS } from "@/lib/portfolioData";
import { STATIC_BLOG_POSTS } from "@/lib/blogData";
import { SITE_URL } from "@/lib/siteUrl";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  const currentDate = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/servicios/iluminacion`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      // Landing de ciudad: objetivo "Lutron Guadalajara" / "Lutron Zapopan".
      url: `${baseUrl}/lutron-guadalajara`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/servicios/audio-video`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/servicios/redes`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/servicios/cctv`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/servicios/control-de-acceso`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/alfa-os`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/arquitectos`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/marcas`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/portafolio`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/aviso-de-privacidad`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Brand URLs
  const brandPages: MetadataRoute.Sitemap = STATIC_BRANDS.map((brand) => ({
    url: `${baseUrl}/marcas/${brand.slug}`,
    lastModified: currentDate,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  // Product URLs (Lutron RadioRA 3, Sonos & others)
  const productPages: MetadataRoute.Sitemap = STATIC_CATALOG_PRODUCTS.map((prod) => ({
    url: `${baseUrl}/marcas/${prod.brand_slug}/${prod.slug}`,
    lastModified: currentDate,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  // Portfolio Project URLs
  const portfolioPages: MetadataRoute.Sitemap = STATIC_PORTFOLIO_PROJECTS.map((project) => ({
    url: `${baseUrl}/portafolio/${project.slug}`,
    lastModified: currentDate,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  // Blog Post URLs
  const blogPages: MetadataRoute.Sitemap = STATIC_BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: `${post.publishedAt}T08:00:00.000Z`,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [
    ...staticPages,
    ...brandPages,
    ...productPages,
    ...portfolioPages,
    ...blogPages,
  ];
}
