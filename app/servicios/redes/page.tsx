import type { Metadata } from "next";
import SeoContentPage from "@/components/SeoContentPage";

export const metadata: Metadata = {
  title: "Redes empresariales y cableado estructurado | ALFA High End Services",
  description:
    "Implementación de redes empresariales, WiFi profesional, cableado estructurado e infraestructura tecnológica para residencias, empresas e industria.",
};

export default function RedesPage() {
  return (
    <SeoContentPage
      eyebrow="Servicios"
      title="Redes e infraestructura tecnológica confiable."
      description="Diseñamos e implementamos conectividad estable para espacios que necesitan operar sin fricción."
      points={[
        "Cableado estructurado, racks, enlaces y distribución de red.",
        "WiFi profesional para operación, usuarios e invitados.",
        "Infraestructura preparada para crecer con el proyecto.",
        "Diagnóstico, documentación y soporte posterior.",
      ]}
    />
  );
}
