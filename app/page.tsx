import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { buildLocalBusinessJsonLd } from "@/lib/localBusiness";
import PublicLandingClient from "@/components/PublicLandingClient";

const seoTitle =
  "Automatización, Redes y Seguridad para Residencias Premium | ALFA";

const seoDescription =
  "ALFA diseña e implementa soluciones tecnológicas llave en mano para residencias y empresas. Redes estables, audio premium, videovigilancia y automatización con acompañamiento antes, durante y después del proyecto.";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: "Automatización, Redes y Audio para Residencias y Empresas | ALFA",
  description: seoDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: seoTitle,
    description: seoDescription,
    url: siteUrl,
    siteName: "ALFA High End Services",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: seoDescription,
  },
};

const organizationJsonLd = {
  // NAP, cobertura y horario vienen de lib/localBusiness.ts para que todas las
  // paginas publicas declaren exactamente los mismos datos que el Perfil de
  // Negocio de Google.
  ...buildLocalBusinessJsonLd({
    pageUrl: siteUrl,
    description:
      "Integración tecnológica premium llave en mano: audio de alta fidelidad, redes empresariales, videovigilancia CCTV, control de acceso y automatización con seguimiento vía ALFA OS.",
  }),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Servicios de Integración Tecnológica ALFA",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Control de Iluminación Arquitectónica y Persianas",
          url: `${siteUrl}/servicios/iluminacion`,
          description:
            "Sistemas de control de iluminación Lutron (HomeWorks / RadioRA 3), botoneras de diseño Palladiom y automatización inteligente Shelly.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Audio y Video Profesional",
          url: `${siteUrl}/servicios/audio-video`,
          description:
            "Sistemas de audio de alta fidelidad, Home Cinema y distribución audiovisual residencial y corporativa.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Redes e Infraestructura Tecnológica",
          url: `${siteUrl}/servicios/redes`,
          description:
            "Cableado estructurado, redes WiFi profesionales y racks de telecomunicaciones.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Seguridad Electrónica y CCTV",
          url: `${siteUrl}/servicios/cctv`,
          description:
            "Sistemas de videovigilancia, monitoreo y cámaras de seguridad IP de alto desempeño.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Control de Acceso",
          url: `${siteUrl}/servicios/control-de-acceso`,
          description:
            "Sistemas de control de accesos vehiculares y peatonales para residencias y empresas.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "ALFA OS - Seguimiento de Proyectos",
          url: `${siteUrl}/alfa-os`,
          description:
            "Plataforma centralizada de seguimiento en tiempo real, evidencias y soporte para clientes.",
        },
      },
    ],
  },
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
