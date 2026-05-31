import type { Metadata } from "next";
import SeoContentPage from "@/components/SeoContentPage";

export const metadata: Metadata = {
  title: "CCTV y cámaras de seguridad | ALFA High End Services",
  description:
    "Diseño e instalación de CCTV, cámaras de seguridad, videovigilancia y monitoreo para residencias, comercios, corporativos e industria.",
};

export default function CctvPage() {
  return (
    <SeoContentPage
      eyebrow="Servicios"
      title="CCTV y videovigilancia para proteger lo importante."
      description="Integramos sistemas de seguridad electrónica con criterios de cobertura, confiabilidad y facilidad de operación."
      points={[
        "Cámaras de seguridad para interiores, exteriores y perímetros.",
        "Grabación, monitoreo y consulta remota según el proyecto.",
        "Selección de tecnología según riesgo, entorno y presupuesto.",
        "Entrega documentada y soporte especializado.",
      ]}
    />
  );
}
