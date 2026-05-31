import type { Metadata } from "next";
import SeoContentPage from "@/components/SeoContentPage";

export const metadata: Metadata = {
  title: "ALFA OS | Seguimiento transparente de proyectos tecnológicos",
  description:
    "ALFA OS centraliza avances, evidencias, documentos, historial y soporte para que cada cliente pueda dar seguimiento claro a su proyecto tecnológico.",
};

export default function AlfaOsPage() {
  return (
    <SeoContentPage
      eyebrow="ALFA OS"
      title="Seguimiento transparente para proyectos tecnológicos."
      description="ALFA OS es la plataforma con la que mantenemos informados a nuestros clientes durante el ciclo de vida de cada proyecto."
      points={[
        "Consulta avances, estados y documentación desde un solo lugar.",
        "Revisa evidencias fotográficas y actividades relevantes del proyecto.",
        "Mantén historial y soporte centralizado después de la entrega.",
        "Trabaja con un equipo que entiende que la confianza también se documenta.",
      ]}
    />
  );
}
