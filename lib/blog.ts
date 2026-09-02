import {
  BlogPost,
  BlogCategory,
  STATIC_BLOG_POSTS,
  BLOG_CATEGORIES,
} from "./blogData";
import { SITE_URL } from "@/lib/siteUrl";

export type { BlogPost, BlogCategory, BlogAuthor, BlogAiDisclosure, BlogSection, BlogSectionImage, BlogFaqItem } from "./blogData";
export { BLOG_CATEGORIES, STATIC_BLOG_POSTS } from "./blogData";

/**
 * Obtiene todos los artículos públicos del blog, con filtro opcional por categoría
 */
export async function getPublicBlogPosts(
  categorySlug?: string
): Promise<BlogPost[]> {
  if (!categorySlug || categorySlug === "todos" || categorySlug === "all") {
    return STATIC_BLOG_POSTS;
  }
  return STATIC_BLOG_POSTS.filter((p) => p.categorySlug === categorySlug);
}

/**
 * Obtiene un artículo del blog por su slug
 */
export async function getPublicBlogPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  if (!slug?.trim()) return null;
  const normalized = slug.trim().toLowerCase();
  return (
    STATIC_BLOG_POSTS.find((p) => p.slug.toLowerCase() === normalized) || null
  );
}

/**
 * Obtiene artículos relacionados excluyendo el artículo actual
 */
export async function getRelatedBlogPosts(
  currentSlug: string,
  limit = 2
): Promise<BlogPost[]> {
  return STATIC_BLOG_POSTS.filter((p) => p.slug !== currentSlug).slice(0, limit);
}

/**
 * Genera el JSON-LD Schema.org para Google Rich Results (TechArticle / BlogPosting + Breadcrumbs)
 */
export function generateBlogArticleJsonLd(
  post: BlogPost,
  siteUrl: string = SITE_URL
) {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, "");
  const articleUrl = `${cleanSiteUrl}/blog/${post.slug}`;
  const fullCoverImageUrl = post.coverImage.startsWith("http")
    ? post.coverImage
    : `${cleanSiteUrl}${post.coverImage}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": articleUrl,
        isPartOf: {
          "@type": "WebSite",
          "@id": `${cleanSiteUrl}/#website`,
          name: "ALFA High End Services",
          url: cleanSiteUrl,
        },
        headline: post.title,
        description: post.metaDescription,
        url: articleUrl,
        mainEntityOfPage: articleUrl,
        image: fullCoverImageUrl,
        datePublished: `${post.publishedAt}T08:00:00-06:00`,
        dateModified: `${post.publishedAt}T08:00:00-06:00`,
        author: {
          "@type": "Person",
          name: post.author.name,
          jobTitle: post.author.role,
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
        about: [
          {
            "@type": "Product",
            name: "Hikvision DS-KLM28-12",
            description: post.subtitle,
            brand: {
              "@type": "Brand",
              name: "Hikvision",
            },
          },
        ],
        keywords: post.tags.join(", "),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: cleanSiteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${cleanSiteUrl}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: articleUrl,
          },
        ],
      },
    ],
  };
}
