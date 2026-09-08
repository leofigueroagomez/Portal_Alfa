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
    case "hikvision":
    case "tiandy":
      return "Te asesoramos con el diseño del sistema: número de cámaras, cobertura por zona, resolución, grabador y almacenamiento, sin costo.";
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
    case "hikvision":
      return "Buscar por modelo (ej. DS-2CD2047G3, ColorVu, AcuSense, NVR)...";
    case "tiandy":
      return "Buscar por modelo (ej. TC-C321N, ColorMaker, Starlight, NVR)...";
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
    case "hikvision":
      return "Videovigilancia y CCTV (Hikvision)";
    case "tiandy":
      return "Videovigilancia y CCTV (Tiandy)";
    default:
      return "Integración y automatización premium";
  }
}

/**
 * Aspectos clave que se muestran cuando el producto no trae `highlights`.
 * Vivian hardcodeados en la ficha de producto con texto de Lutron, que se
 * filtraba a las demas marcas.
 */
export function brandFallbackHighlights(slug: string): string[] {
  switch (slug) {
    case "lutron":
      return [
        "Tecnología RF Clear Connect Type X nativa",
        "Integración con procesador RadioRA 3 y ALFA OS",
      ];
    case "sonos":
      return [
        "Audio multiroom sincronizado por app",
        "Integración y calibración con ALFA OS",
      ];
    case "hikvision":
    case "tiandy":
      return [
        "Monitoreo remoto y grabación continua",
        "Ingeniería, instalación y soporte ALFA OS",
      ];
    default:
      return [
        "Suministro con garantía oficial en México",
        "Ingeniería, instalación y soporte ALFA OS",
      ];
  }
}
