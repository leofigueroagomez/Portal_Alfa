import type { Metadata } from "next";
import SeoContentPage from "@/components/SeoContentPage";

export const metadata: Metadata = {
  title: "Control de acceso | ALFA High End Services",
  description:
    "Soluciones de control de acceso para oficinas, residencias, comercios e industria con integración tecnológica, seguridad y operación confiable.",
};

export default function ControlDeAccesoPage() {
  return (
    <SeoContentPage
      eyebrow="Servicios"
      title="Control de acceso para espacios seguros y bien operados."
      description="Diseñamos soluciones de acceso que ordenan la operación y ayudan a proteger personas, áreas y activos."
      points={[
        "Control de puertas, accesos restringidos y zonas críticas.",
        "Integración con seguridad electrónica y operación del inmueble.",
        "Sistemas pensados para usuarios, administradores y mantenimiento.",
        "Implementación documentada y soporte durante la vida del proyecto.",
      ]}
    />
  );
}
