import { formatCurrency } from "@/lib/format";

export const engineeringSystems = [
  "Voz y Datos (Cableado Estructurado)",
  "Audio Ambiental",
  "Cine / Teatro en Casa",
  "Control de Iluminación",
  "Detección de Incendio",
  "Alarma de Intrusión",
  "Cámaras de Seguridad (CCTV)",
  "Control de Acceso",
  "Automatización (Todo desde un app)",
  "Repetición de Señal Celular",
];

export const defaultDeliverables = [
  "Planos ejecutivos con ubicaciones de equipos, cédula de cableado y trayectorias de canalizaciones.",
  "Alcance de los sistemas propuestos.",
  "Detalles de montaje de los equipos.",
  "Requerimientos eléctricos para el funcionamiento de los equipos principales y periféricos.",
  "Listado técnico de equipos.",
  "Especificaciones de los equipos propuestos.",
  "Entrega electrónica del proyecto ejecutivo.",
];

export const defaultRequirements = [
  "Descripción de alcances o necesidades que el cliente tiene de cada uno de los sistemas.",
  "Última versión de planos arquitectónicos.",
];

export const defaultCommercialTerms = [
  "Anticipo del 50%, 25% al realizar la primera entrega de planos y 25% al entregar el proyecto.",
  "En caso de contratar la ejecución del proyecto, el monto pagado por la ingeniería será tomado a cuenta de anticipo.",
  "Se incluyen 5 revisiones para cambios de ingeniería.",
  "El tiempo estimado de entrega se definirá en la propuesta.",
  "Los documentos se entregarán de manera digital y ordenados en carpetas.",
  "El presupuesto contempla hasta 2 visitas a obra mensuales durante la revisión de ingenierías, con citas de máximo 2 horas y previo aviso de 2 días.",
];

export function versionToLetter(version: number) {
  const normalizedVersion = Math.max(1, version);
  let value = normalizedVersion;
  let result = "";

  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }

  return result;
}

export function buildEngineeringQuoteNumber(
  clientNumber: number | null | undefined,
  projectNumber: number | null | undefined,
  version: number
) {
  const clientPart = String(clientNumber || 0).padStart(3, "0");
  const projectPart = String(projectNumber || 0).padStart(3, "0");

  return `ING-${clientPart}-${projectPart}-${versionToLetter(version)}`;
}

export function formatMoneyMXN(value: number | null | undefined) {
  return formatCurrency(value, "MXN");
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
