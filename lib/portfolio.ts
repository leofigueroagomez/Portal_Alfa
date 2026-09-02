import {
  PortfolioProject,
  STATIC_PORTFOLIO_PROJECTS,
  PORTFOLIO_CATEGORIES,
} from "./portfolioData";
import { SITE_URL } from "@/lib/siteUrl";

export type { PortfolioProject, PortfolioEquipmentZone, PortfolioEquipmentItem, PortfolioMediaItem } from "./portfolioData";
export { PORTFOLIO_CATEGORIES } from "./portfolioData";

/**
 * Obtiene todos los proyectos públicos del portafolio
 */
export async function getPublicPortfolioProjects(
  categorySlug?: string
): Promise<PortfolioProject[]> {
  if (!categorySlug || categorySlug === "all") {
    return STATIC_PORTFOLIO_PROJECTS;
  }
  return STATIC_PORTFOLIO_PROJECTS.filter(
    (p) => p.category_slug === categorySlug
  );
}

/**
 * Obtiene un proyecto de portafolio por su slug
 */
export async function getPublicPortfolioProjectBySlug(
  slug: string
): Promise<PortfolioProject | null> {
  if (!slug?.trim()) return null;
  const normalized = slug.trim().toLowerCase();
  return (
    STATIC_PORTFOLIO_PROJECTS.find(
      (p) => p.slug.toLowerCase() === normalized || p.id.toLowerCase() === normalized
    ) || null
  );
}

/**
 * Obtiene proyectos relacionados para mostrar al final del caso de estudio
 */
export async function getRelatedPortfolioProjects(
  currentSlug: string,
  limit = 2
): Promise<PortfolioProject[]> {
  return STATIC_PORTFOLIO_PROJECTS.filter(
    (p) => p.slug !== currentSlug
  ).slice(0, limit);
}

/**
 * Genera el JSON-LD de un Proyecto de Portafolio para Google (Schema.org/Article + CreativeWork)
 */
export function generateProjectJsonLd(
  project: PortfolioProject,
  siteUrl: string = SITE_URL
) {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, "");
  const projectUrl = `${cleanSiteUrl}/portafolio/${project.slug}`;
  const fullHeroImageUrl = project.hero_image.startsWith("http")
    ? project.hero_image
    : `${cleanSiteUrl}${project.hero_image}`;

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    headline: `${project.title}: ${project.subtitle}`,
    description: project.summary,
    image: [fullHeroImageUrl],
    url: projectUrl,
    author: {
      "@type": "Organization",
      name: "ALFA High End Services",
      url: cleanSiteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "ALFA High End Services",
      url: cleanSiteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${cleanSiteUrl}/logo-alfa.png`,
      },
    },
    locationCreated: {
      "@type": "Place",
      name: project.location,
    },
    keywords: project.seo_keywords?.join(", "),
  };
}

/**
 * Genera el JSON-LD de Breadcrumb para Portafolio (Schema.org/BreadcrumbList)
 */
export function generatePortfolioBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
