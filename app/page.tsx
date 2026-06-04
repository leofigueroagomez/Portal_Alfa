import type { Metadata } from "next";
import PublicLandingClient from "@/components/PublicLandingClient";

const seoTitle =
  "ALFA High End Services | Integración tecnológica, audio y video, redes y seguridad";

const seoDescription =
  "ALFA diseña, implementa y respalda soluciones tecnológicas para residencias, empresas e industria: audio y video profesional, redes, CCTV, control de acceso, automatización y soporte especializado.";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

export const metadata: Metadata = {
  title: seoTitle,
  description: seoDescription,
  keywords: [
    "audio y video profesional",
    "salas de juntas",
    "videoconferencia",
    "video wall",
    "redes empresariales",
    "cableado estructurado",
    "CCTV",
    "cámaras de seguridad",
    "control de acceso",
    "automatización residencial",
    "integración tecnológica",
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
  telephone: "+52 1 000 000 0000",
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
