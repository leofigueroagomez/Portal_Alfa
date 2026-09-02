import { buildLocalBusinessJsonLd } from "@/lib/localBusiness";

type Props = {
  /** Ruta absoluta de la pagina donde se inserta, p. ej. `${SITE_URL}/lutron-guadalajara`. */
  pageUrl?: string;
  description?: string;
  image?: string;
};

/**
 * Inserta el JSON-LD `LocalBusiness` con el NAP canonico de ALFA.
 *
 * Va solo en paginas publicas de marketing (home, servicios, landings de
 * ciudad). No usarlo en el portal, ALFA OS ni rutas administrativas.
 */
export default function LocalBusinessJsonLd({ pageUrl, description, image }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(buildLocalBusinessJsonLd({ pageUrl, description, image })),
      }}
    />
  );
}
