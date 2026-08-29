/**
 * Ajustes de presentación del catálogo público por marca.
 *
 * El catálogo (`/marcas/[marca]`) es genérico: toma marca + productos de
 * `lib/catalog.ts`. Algunas marcas necesitan copys o etiquetas propias
 * (p. ej. Lutron habla de "RadioRA 3"; Sonos de "audio multiroom"). Estos
 * helpers concentran esas diferencias sin ramificar la UI en cada componente.
 */

/**
 * Etiqueta de línea de producto que acompaña al nombre de la marca en los
 * encabezados ("Lutron RadioRA 3"). `null` = usar solo el nombre de la marca.
 */
export function brandLineLabel(slug: string): string | null {
  if (slug === "lutron") return "RadioRA 3";
  return null;
}

/** Texto de la tarjeta de contacto rápido en el hub de marca. */
export function brandAdvisoryCopy(slug: string): string {
  switch (slug) {
    case "lutron":
      return "Te asesoramos con la selección exacta de procesadores, botoneras Sunnata y cálculo de cargas sin costo.";
    case "sonos":
      return "Te asesoramos con la arquitectura del sistema, zonas de audio, amplificación y la instalación sin costo.";
    default:
      return "Te asesoramos con la selección de equipos y la ingeniería del proyecto sin costo.";
  }
}

/** Placeholder del buscador del catálogo de marca. */
export function brandSearchPlaceholder(slug: string, name: string): string {
  switch (slug) {
    case "lutron":
      return "Buscar por modelo (ej. RRPROC3KIT, Sunnata, RRSTPRONWH)...";
    case "sonos":
      return "Buscar equipo o modelo (ej. Arc Ultra, Era 300, Beam, Sub)...";
    default:
      return `Buscar por modelo o nombre en el catálogo ${name}...`;
  }
}

/** Valor del campo `interest` enviado a `/api/leads` desde el catálogo. */
export function brandLeadInterest(slug: string): string {
  switch (slug) {
    case "lutron":
      return "Iluminación y persianas (Lutron / Shelly)";
    case "sonos":
      return "Audio, video y teatro en casa (Sonos)";
    default:
      return "Integración y automatización premium";
  }
}
