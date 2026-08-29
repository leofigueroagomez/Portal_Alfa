# Módulo: Portafolio de Proyectos y Casos de Estudio

Guía de referencia y directrices operativas para la sección pública de Portafolio en **ALFA OS / Portal_Alfa**.

---

## 1. Propósito del Módulo

El objetivo de `/portafolio` y sus casos de estudio individuales (`/portafolio/[slug]`):

1. **Credibilidad y Prueba Social "High End":** Demostrar la capacidad de ingeniería, nivel de marcas integradas (McIntosh, Denon, Bowers & Wilkins, Lutron, Sonos, Panamax) y acabados impecables en proyectos reales.
2. **Posicionamiento SEO de Casos Reales:** Capturar búsquedas de proyectos residenciales de lujo, salas de cine Dolby Atmos, cuartos de audio audiófilo e iluminación de autor.
3. **Conversión y Captación de Leads:** Permitir que los clientes interesados en un proyecto similar soliciten asesoría técnica o propuesta a través de `/api/leads` o WhatsApp directo.

---

## 2. Estructura de Enrutamiento y Archivos Clave

| Ruta | Componente / Archivo | Responsabilidad |
| :--- | :--- | :--- |
| `/portafolio` | `app/portafolio/page.tsx` | Directorio principal de proyectos con filtro por categorías. |
| — | `app/portafolio/PortfolioDirectoryClient.tsx` | Componente cliente de filtrado y grid interactivo. |
| `/portafolio/[slug]` | `app/portafolio/[slug]/page.tsx` | Caso de estudio inmersivo, narrativa, ficha técnica y resultados. |
| — | `app/portafolio/[slug]/PortfolioMediaGallery.tsx` | Galería multimedia interactiva con soporte para fotos y video MP4. |
| — | `app/portafolio/[slug]/ProjectQuoteModal.tsx` | Modal de captación de leads conectado a `/api/leads`. |
| — | `lib/portfolioData.ts` | Dataset tipado de proyectos y especificaciones de equipamiento. |
| — | `lib/portfolio.ts` | Capa de servicios y generadores Schema.org (`Article` / `CreativeWork`). |
| `/sitemap.xml` | `app/sitemap.ts` | Indexación automática de proyectos en Google. |

---

## 3. Reglas Críticas y de Integridad de Información

> [!CAUTION]
> **REGLA DE ORO: NUNCA CREAR NI PUBLICAR PROYECTOS FICTICIOS O PLACEHOLDERS.**
> Solo se deben dar de alta y mostrar en el sitio proyectos 100% reales confirmados explícitamente por el usuario, con sus marcas, modelos y contexto auténtico. Queda estrictamente prohibido inventar casos de estudio, clientes, ubicaciones o equipamientos ficticios.

---

## 4. Reglas de Medios y Almacenamiento

1. **Ubicación de Fotos y Video:**
   - Todo proyecto de portafolio debe almacenar sus medios en:
     `public/portfolio/[slug-del-proyecto]/` (ej. `public/portfolio/salon-de-audio-vm/`).
2. **Archivos Recomendados por Proyecto:**
   - `hero.jpg`: Foto principal del espacio.
   - `[nombre-de-detalle].jpg`: Fotos de equipos (amplificador, tornamesa, altavoces, etc.).
   - `video-recorrido.mp4`: Video de recorrido en alta resolución para reproducción en el visor HTML5.
3. **Protección de Datos y Privacidad:**
   - No publicar nombres completos de clientes ni direcciones exactas de domicilios particulares (usar referencias como *"Residencial Privado, Guadalajara, Jal."*).
