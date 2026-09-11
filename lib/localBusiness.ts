import { SITE_URL } from "@/lib/siteUrl";

/**
 * NAP (Name / Address / Phone) canonico de ALFA IT.
 *
 * Fuente unica de verdad para el JSON-LD `LocalBusiness` de todo el sitio
 * publico. Google compara estos datos contra el Perfil de Negocio y contra los
 * directorios: si no coinciden caracter por caracter, la senal local se
 * diluye. Antes de cambiar cualquier valor aqui, cambiarlo tambien en el
 * Perfil de Negocio de Google.
 *
 * Ver docs/modules/sitio-publico/MODULE_CONTEXT.md, seccion NAP.
 */

export const NAP = {
  legalName: "ALFA High End Services",
  brandName: "ALFA IT",
  streetAddress: "Franz Liszt 5160, Col. La Estancia",
  addressLocality: "Zapopan",
  addressRegion: "Jalisco",
  addressCountry: "MX",
  /** Confirmado por Leo el 2026-09-02. Debe coincidir con el Perfil de Negocio. */
  postalCode: "45030",
  /** E.164, formato requerido por Schema.org. */
  telephone: "+523318574884",
  /** Para mostrar en pantalla. */
  telephoneDisplay: "33 1857 4884",
  /** Solo digitos, formato que espera la API de wa.me. */
  whatsapp: "523318574884",
  opens: "09:00",
  closes: "19:00",
  /** Pendiente de confirmar con Leo: se asume lunes a viernes. */
  openDays: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ] as const,
} as const;

/** Cobertura geografica declarada. El orden importa: primero la ciudad objetivo. */
export const AREA_SERVED = [
  { "@type": "City", name: "Guadalajara" },
  { "@type": "City", name: "Zapopan" },
  { "@type": "City", name: "San Pedro Tlaquepaque" },
  { "@type": "City", name: "Tlajomulco de Zúñiga" },
  { "@type": "Place", name: "Zona Metropolitana de Guadalajara" },
  { "@type": "State", name: "Jalisco" },
  { "@type": "Country", name: "México" },
];

/** Frase de cobertura reutilizable en footer y cuerpo de pagina. */
export const COVERAGE_LINE =
  "Atendemos Guadalajara, Zapopan y toda la Zona Metropolitana de Guadalajara";

export function getPostalAddress() {
  return {
    "@type": "PostalAddress",
    streetAddress: NAP.streetAddress,
    addressLocality: NAP.addressLocality,
    addressRegion: NAP.addressRegion,
    postalCode: NAP.postalCode,
    addressCountry: NAP.addressCountry,
  };
}

/**
 * Direccion en una linea para mostrar en pantalla.
 *
 * Debe leerse igual que en el Perfil de Negocio de Google: el NAP visible
 * tambien es senal de ranking local, no solo el del JSON-LD.
 */
export function formatAddressOneLine() {
  return `${NAP.streetAddress}, ${NAP.postalCode} ${NAP.addressLocality}, ${NAP.addressRegion}`;
}

export function getOpeningHours() {
  return [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...NAP.openDays],
      opens: NAP.opens,
      closes: NAP.closes,
    },
  ];
}

/**
 * JSON-LD `LocalBusiness` para las paginas publicas.
 *
 * `pageUrl` es la ruta absoluta de la pagina donde se inserta; se usa como
 * `@id` para que Google entienda que todas las paginas describen el mismo
 * negocio en vez de tratarlas como negocios distintos.
 */
export function buildLocalBusinessJsonLd(options?: {
  pageUrl?: string;
  description?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": `${SITE_URL}/#localbusiness`,
    name: NAP.legalName,
    alternateName: NAP.brandName,
    description:
      options?.description ??
      "Integración tecnológica premium llave en mano: control de iluminación Lutron, audio de alta fidelidad, redes empresariales, videovigilancia CCTV y control de acceso en la Zona Metropolitana de Guadalajara.",
    url: options?.pageUrl ?? SITE_URL,
    logo: `${SITE_URL}/logo-alfa.png`,
    image: options?.image ?? `${SITE_URL}/projects/residencia-premium.jpeg`,
    telephone: NAP.telephone,
    priceRange: "$$$$",
    address: getPostalAddress(),
    geo: {
      "@type": "GeoCoordinates",
      latitude: 20.7167,
      longitude: -103.4167,
    },
    openingHoursSpecification: getOpeningHours(),
    areaServed: AREA_SERVED,
  };
}
