import type { Metadata } from "next";
import PublicLandingClient from "@/components/PublicLandingClient";

const seoTitle =
  "Automatización, Redes y Seguridad para Residencias Premium | ALFA";

const seoDescription =
  "ALFA diseña e implementa soluciones tecnológicas llave en mano para residencias y empresas. Redes estables, audio premium, videovigilancia y automatización con acompañamiento antes, durante y después del proyecto.";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

export const metadata: Metadata = {
  title: seoTitle,
  description: seoDescription,
  keywords: [
    "redes residenciales",
    "wifi residencial",
    "internet estable",
    "audio residencial",
    "audio multiroom",
    "cámaras de seguridad",
    "videovigilancia residencial",
    "automatización residencial",
    "casa inteligente",
    "control de acceso",
    "integración tecnológica",
    "soluciones llave en mano",
  ],
  openGraph: {
    title: seoTitle,
    description: seoDescription,
    type: "website",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "ALFA High End Services",
  description:
    "Integración tecnológica premium para residencias, empresas e industria.",
  areaServed: "México",
  url: siteUrl,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Zapopan",
    addressRegion: "Jalisco",
    addressCountry: "MX",
  },
  sameAs: [],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <PublicLandingClient />
    </>
  );
}
