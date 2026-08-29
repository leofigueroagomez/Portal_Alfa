export interface PortfolioEquipmentItem {
  brand: string;
  model: string;
  role: string;
  quantity?: number;
  highlight?: string;
}

export interface PortfolioEquipmentZone {
  zoneName: string;
  description: string;
  equipment: PortfolioEquipmentItem[];
}

export interface PortfolioMediaItem {
  type: "image" | "video";
  url: string;
  caption: string;
  isHero?: boolean;
}

export interface PortfolioProject {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  category_slug: "audio-hifi" | "iluminacion-control" | "home-cinema" | "residencial" | "corporativo";
  client_type: string;
  location: string;
  year: string;
  hero_image: string;
  summary: string;
  origin_story: string;
  origin_heading?: string;
  challenge: string;
  challenge_heading?: string;
  solution: string;
  solution_heading?: string;
  results: string[];
  equipment_zones: PortfolioEquipmentZone[];
  gallery: PortfolioMediaItem[];
  video_url?: string;
  tags: string[];
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
}

export const PORTFOLIO_CATEGORIES = [
  { id: "all", label: "Todos los Proyectos" },
  { id: "audio-hifi", label: "Audio Hi-Fi & Entretenimiento" },
  { id: "residencial", label: "Residencial Integral" },
];

export const STATIC_PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: "salon-de-audio-vm",
    slug: "salon-de-audio-vm",
    title: "Salón de Audio VM",
    subtitle: "Espacio de Escucha Crítica Hi-Fi & Zona Recreativa de Billar",
    category: "Audio Hi-Fi & Entretenimiento",
    category_slug: "audio-hifi",
    client_type: "Residencial Privado",
    location: "Guadalajara, Jalisco",
    year: "2026",
    hero_image: "/portfolio/salon-de-audio-vm/hero.jpg",
    summary:
      "Diseño e integración de un espacio dual de alto desempeño: sistema de escucha audiófila analógica con amplificación híbrida McIntosh y tornamesa Denon de referencia, enlazado armónicamente con una zona social de billar potenciada por Sonos Amp y altavoces Bowers & Wilkins.",
    origin_story:
      "El cliente acudió a ALFA por recomendación directa de un amigo a quien le habíamos instalado previamente un sistema con amplificación McIntosh. Fascinado por la calidez y precisión acústica de ese proyecto, buscaba replicar ese mismo estándar de referencia en su propia residencia, con el requerimiento especial de habilitar en la misma estancia un área social y mesa de billar.",
    challenge:
      "El principal desafío técnico fue armonizar dos experiencias sonoras con naturalezas distintas en un mismo espacio arquitectónico: por un lado, una zona de escucha crítica con posicionamiento sweet-spot y detalle microdinámico para vinilos; y por el otro, un área de juego de billar que demandaba cobertura acústica envolvente y uniforme sin invadir ni distorsionar el entorno audiófilo.",
    solution:
      "Se proyectó una arquitectura de audio dividida en dos zonas calibradas e integradas:\n\n1. Zona de Escucha Crítica Hi-Fi: Se instaló un amplificador integrado híbrido McIntosh MA352 (preamplificación a bulbos 12AX7a/12AT7 y 200W por canal a estado sólido con los icónicos vúmetros azules), alimentado por una tornamesa de referencia Denon DP-3000NE de tracción directa con brazo en S, acoplado a un par estéreo de altavoces Bowers & Wilkins Serie 600 con conos Continuum. Todo el sistema está protegido y filtrado con acondicionamiento de corriente Panamax de grado audiófilo.\n\n2. Zona de Billar & Entretenimiento: Se integró un amplificador Sonos Amp para streaming de alta resolución y enlace multiroom, alimentando 4 altavoces arquitectónicos Bowers & Wilkins AM-1 estratégicamente distribuidos en el perímetro para una dispersión homogénea y control de volumen independiente desde smartphone o iPad.",
    results: [
      "Transición acústica impecable entre la calidez del audio analógico y la versatilidad multiroom.",
      "Control centralizado e intuitivo desde dispositivos móviles para música en streaming y fuentes dedicadas.",
      "Acondicionamiento y protección eléctrica total contra transitorios y variaciones de voltaje con tecnología Panamax.",
      "Satisfacción absoluta del cliente y de sus invitados con un espacio que se disfruta tanto en sesiones de escucha íntima como en reuniones sociales.",
    ],
    equipment_zones: [
      {
        zoneName: "Zona de Escucha Crítica Hi-Fi",
        description: "Cadena analógica de referencia con preamplificación a bulbos y tornamesa direct drive.",
        equipment: [
          {
            brand: "McIntosh",
            model: "MA352",
            role: "Amplificador Integrado Híbrido (200W/ch, Preamplificador a Bulbos con Vúmetros Azules)",
            quantity: 1,
            highlight: "Calidez valvular con potencia dinámica y control de tono de 5 bandas",
          },
          {
            brand: "Denon",
            model: "DP-3000NE",
            role: "Tornamesa Flagship Direct Drive de Referencia",
            quantity: 1,
            highlight: "Motor de tracción directa de ultra baja vibración y brazo en S balanceado",
          },
          {
            brand: "Bowers & Wilkins",
            model: "Serie 600",
            role: "Par de Altavoces Estéreo de Alta Fidelidad",
            quantity: 2,
            highlight: "Conos Continuum™ y tweeters de doble cúpula desacoplados",
          },
          {
            brand: "Panamax",
            model: "Protección y Filtrado de Línea",
            role: "Acondicionador y Protector de Corriente de Grado Audiófilo",
            quantity: 1,
            highlight: "Eliminación de ruido EMI/RFI y protección contra sobretensiones catastróficas",
          },
        ],
      },
      {
        zoneName: "Zona de Billar & Convivencia Social",
        description: "Distribución acústica uniforme para zona de juego con control inalámbrico multiroom.",
        equipment: [
          {
            brand: "Sonos",
            model: "Sonos Amp",
            role: "Amplificador Inalámbrico Multiroom (125W/ch)",
            quantity: 1,
            highlight: "Streaming en alta resolución, AirPlay 2 y control por app / ALFA OS",
          },
          {
            brand: "Bowers & Wilkins",
            model: "AM-1",
            role: "Altavoces Arquitectónicos de Alta Dispersión",
            quantity: 4,
            highlight: "Radiador de graves pasivo trasero con dispersión nítida y estética minimalista",
          },
        ],
      },
    ],
    gallery: [
      {
        type: "image",
        url: "/portfolio/salon-de-audio-vm/hero.jpg",
        caption: "Vista general del Salón de Audio VM con la zona de escucha y mesa de billar.",
        isHero: true,
      },
      {
        type: "image",
        url: "/portfolio/salon-de-audio-vm/mcintosh-denon.jpg",
        caption: "Amplificador híbrido McIntosh MA352 y tornamesa Denon DP-3000NE en operación.",
      },
      {
        type: "image",
        url: "/projects/estudio-hifi.jpeg",
        caption: "Detalle de los altavoces Bowers & Wilkins y aislamiento acústico.",
      },
      {
        type: "video",
        url: "/portfolio/salon-de-audio-vm/video-recorrido.mp4",
        caption: "Recorrido en video de la experiencia acústica en el Salón de Audio VM.",
      },
    ],
    video_url: "/portfolio/salon-de-audio-vm/video-recorrido.mp4",
    tags: [
      "McIntosh",
      "Denon",
      "Bowers & Wilkins",
      "Sonos",
      "Panamax",
      "Audio Hi-Fi",
      "Tornamesa",
      "Billar",
      "Residencial",
      "Guadalajara",
    ],
    is_featured: true,
    seo_title: "Salón de Audio VM | Proyecto Hi-Fi McIntosh y Bowers & Wilkins | ALFA",
    seo_description:
      "Conoce el proyecto Salón de Audio VM diseñado por ALFA en Guadalajara: amplificador McIntosh MA352, tornamesa Denon DP-3000NE, altavoces Bowers & Wilkins y zona de billar con Sonos Amp.",
    seo_keywords: [
      "Salón de audio Guadalajara",
      "McIntosh MA352 México",
      "Denon DP-3000NE",
      "Bowers and Wilkins Guadalajara",
      "Sonos Amp billar",
      "Audio audiófilo residencial",
      "ALFA proyectos",
    ],
  },
  {
    id: "casa-er",
    slug: "casa-er",
    title: "Casa ER",
    subtitle:
      "Integración Residencial Integral: Seguridad, Iluminación, Audio y Red desde la Cimentación",
    category: "Residencial Integral",
    category_slug: "residencial",
    client_type: "Residencial Privado",
    location: "Guadalajara, Jalisco",
    year: "2025",
    hero_image: "/portfolio/casa-er/fachada-camara.avif",
    summary:
      "Acompañamiento técnico completo —desde la cimentación hasta la entrega— de una residencia de autor proyectada por el arquitecto Jorge Luis Hernández Silva. ALFA integró videovigilancia y control de acceso Hikvision, control de iluminación con Shelly, Akubela y Alexa, audio distribuido VSSL y Tru Audio, y una red alámbrica e inalámbrica Ruijie, siempre bajo una misma premisa: que la arquitectura destaque y la tecnología se adapte.",
    origin_heading: "Un Proyecto Concebido en Obra Gris",
    origin_story:
      "ALFA se sumó a Casa ER cuando la construcción apenas estaba en cimentación, trabajando de la mano del arquitecto Jorge Luis Hernández Silva —reconocido despacho de Guadalajara— y de la constructora. Esta incorporación temprana permitió planear canalizaciones, registros y previsiones eléctricas y de datos antes de colar y aplanar, evitando adecuaciones posteriores y garantizando que cada cámara, panel, bocina y punto de red quedara exactamente donde el diseño lo pedía. Durante todo el proceso se asesoró al cliente para encontrar una solución acorde al presupuesto asignado, sin sacrificar sus expectativas de confort y control.",
    challenge_heading: "Cuatro Sistemas, una Sola Arquitectura",
    challenge:
      "Coordinar cuatro ecosistemas —seguridad, iluminación, audio y red— sobre una obra en proceso, respetando un lenguaje arquitectónico exigente de concreto aparente, madera y aplanados finos, y ajustándose al presupuesto que el cliente tenía definido sin renunciar a nada de lo que esperaba del proyecto.",
    solution_heading: "Ingeniería Coordinada de Principio a Fin",
    solution:
      "Se desarrolló un proyecto ejecutivo por sistema, integrado al calendario de obra:\n\n1. Videovigilancia y Control de Acceso (Hikvision): cámaras bullet ColorVu de perfil bajo ubicadas en aleros y en las juntas entre materiales para pasar desapercibidas, videoportero IP de villa con lector de tarjetas empotrado a ras del muro de madera y grabación centralizada en NVR.\n\n2. Control de Iluminación y Escenas (Shelly + Akubela + Alexa): la inteligencia se resolvió con módulos Shelly ocultos en registros y detrás de los apagadores de diseño, gobernados desde paneles de pared Akubela HyPanel montados a ras sobre el concreto aparente y por voz con Amazon Alexa. Escenas de iluminación completas sin llenar los muros de teclados.\n\n3. Audio Distribuido (VSSL + Tru Audio): amplificación multi-zona con streaming VSSL en rack, alimentando bocinas arquitectónicas Tru Audio empotradas en plafón, muro y exterior, calibradas para una cobertura uniforme y discreta en las áreas sociales y la terraza.\n\n4. Infraestructura de Red (Ruijie): backbone alámbrico e inalámbrico Ruijie Reyee con switches PoE administrables y puntos de acceso Wi-Fi de alta densidad, dando soporte estable a todos los sistemas y a la vida digital de la familia.",
    results: [
      "Incorporación desde la cimentación: previsiones y canalizaciones resueltas antes de acabados, sin obra correctiva.",
      "Dispositivos de perfil bajo integrados a la paleta de concreto, madera y aplanados: la tecnología no compite con la arquitectura.",
      "Control de iluminación por escenas, aplicación y voz con Alexa, con la inteligencia Shelly oculta a la vista.",
      "Audio distribuido VSSL y Tru Audio en interior y exterior, y cobertura Wi-Fi Ruijie estable en toda la casa.",
      "Solución dimensionada al presupuesto asignado por el cliente, con asesoría continua y satisfacción completa a la entrega.",
    ],
    equipment_zones: [
      {
        zoneName: "Videovigilancia y Control de Acceso",
        description:
          "Perímetro y accesos monitoreados con equipo Hikvision de perfil bajo.",
        equipment: [
          {
            brand: "Hikvision",
            model: "Cámaras Bullet ColorVu",
            role: "Videovigilancia perimetral a color las 24 horas",
            highlight:
              "Formato compacto y acabado negro que se funde con aleros y juntas de material",
          },
          {
            brand: "Hikvision",
            model: "Videoportero IP de Villa",
            role: "Estación de puerta con audio/video y lector de tarjetas RFID",
            highlight:
              "Empotrado a ras del muro de madera, sin cajas ni marcos expuestos",
          },
          {
            brand: "Hikvision",
            model: "NVR / Grabador de Red",
            role: "Grabación y almacenamiento centralizado con acceso remoto",
            highlight: "Consulta desde aplicación móvil y estaciones interiores",
          },
        ],
      },
      {
        zoneName: "Control de Iluminación y Escenas",
        description:
          "Inteligencia Shelly oculta, gobernada por paneles Akubela y voz Alexa.",
        equipment: [
          {
            brand: "Shelly",
            model: "Módulos Pro / Plus",
            role: "Relevación y atenuación de circuitos en registros y cajas",
            highlight: "La automatización vive dentro del muro, no sobre él",
          },
          {
            brand: "Akubela",
            model: "HyPanel",
            role: "Panel de pared inteligente para escenas, clima e intercom",
            highlight:
              "Montaje a ras sobre concreto aparente, una sola pieza por zona",
          },
          {
            brand: "Amazon",
            model: "Alexa",
            role: "Control por voz de escenas y zonas de iluminación",
            highlight: "Operación manos libres integrada al resto de la casa",
          },
        ],
      },
      {
        zoneName: "Audio Distribuido",
        description:
          "Amplificación multi-zona con streaming y bocinas arquitectónicas ocultas.",
        equipment: [
          {
            brand: "VSSL",
            model: "Amplificador Multi-Zona con Streaming",
            role: "Distribución de audio por zonas desde rack central",
            highlight: "AirPlay, streaming directo y control por aplicación",
          },
          {
            brand: "Tru Audio",
            model: "Bocinas Arquitectónicas",
            role: "Altavoces empotrados de plafón, muro y exterior",
            highlight: "Rejillas al ras y sin marco para desaparecer en el acabado",
          },
        ],
      },
      {
        zoneName: "Infraestructura de Red",
        description:
          "Backbone alámbrico e inalámbrico que soporta todos los sistemas.",
        equipment: [
          {
            brand: "Ruijie",
            model: "Reyee — Gateway y Switches PoE",
            role: "Enrutamiento y conmutación administrable con alimentación PoE",
            highlight:
              "Alimentación y datos para cámaras, paneles y APs por un solo cable",
          },
          {
            brand: "Ruijie",
            model: "Access Points Wi-Fi",
            role: "Cobertura inalámbrica de alta densidad en toda la residencia",
            highlight: "Roaming continuo entre planta baja, planta alta y exterior",
          },
        ],
      },
    ],
    gallery: [
      {
        type: "image",
        url: "/portfolio/casa-er/fachada-camara.avif",
        caption:
          "Fachada de concreto, madera y aplanado fino: la cámara bullet Hikvision se integra bajo el alero sin romper la composición.",
        isHero: true,
      },
      {
        type: "video",
        url: "/portfolio/casa-er/video-audio-techo-exterior.mp4",
        caption:
          "Recorrido del audio distribuido Tru Audio empotrado en techo y áreas exteriores.",
      },
      {
        type: "image",
        url: "/portfolio/casa-er/panel-escenas-concreto.avif",
        caption:
          "Panel de pared Akubela HyPanel montado a ras sobre concreto aparente para controlar escenas de iluminación y clima.",
      },
      {
        type: "image",
        url: "/portfolio/casa-er/videoportero-muro-madera.avif",
        caption:
          "Videoportero IP Hikvision empotrado en el muro de madera del acceso principal.",
      },
      {
        type: "image",
        url: "/portfolio/casa-er/videoportero-detalle.avif",
        caption:
          "Detalle del videoportero de villa con cámara gran angular y lector de tarjetas para control de acceso.",
      },
      {
        type: "video",
        url: "/portfolio/casa-er/video-panel-control.mp4",
        caption: "Operación del panel de control de iluminación empotrado en muro.",
      },
      {
        type: "image",
        url: "/portfolio/casa-er/camara-bala-detalle.avif",
        caption:
          "Cámara bullet Hikvision ColorVu en acabado negro sobre aplanado texturizado.",
      },
      {
        type: "image",
        url: "/portfolio/casa-er/camara-madera-stucco.avif",
        caption:
          "Cámara ubicada en la junta entre el aplanado y la madera para minimizar su presencia visual.",
      },
      {
        type: "video",
        url: "/portfolio/casa-er/video-audio-bocinas-muro.mp4",
        caption: "Bocinas Tru Audio empotradas en muro, integradas al acabado.",
      },
      {
        type: "video",
        url: "/portfolio/casa-er/video-audio-bocinas-plafon.mp4",
        caption: "Bocinas de plafón Tru Audio con rejilla al ras en el área social.",
      },
      {
        type: "image",
        url: "/portfolio/casa-er/apagador-negro-madera.avif",
        caption:
          "Apagador de diseño en negro, al ras del muro de madera, con la inteligencia Shelly detrás del muro.",
      },
      {
        type: "image",
        url: "/portfolio/casa-er/apagador-blanco-muro.avif",
        caption:
          "Donde la iluminación no requería automatización, apagadores sin tornillos que desaparecen en el muro.",
      },
    ],
    video_url: "/portfolio/casa-er/video-audio-techo-exterior.mp4",
    tags: [
      "Hikvision",
      "Shelly",
      "Akubela",
      "Alexa",
      "VSSL",
      "Tru Audio",
      "Ruijie",
      "CCTV",
      "Control de Acceso",
      "Residencial",
      "Guadalajara",
    ],
    is_featured: true,
    seo_title:
      "Casa ER | Integración Residencial: Hikvision, Shelly, VSSL y Ruijie | ALFA",
    seo_description:
      "Caso de estudio Casa ER en Guadalajara: acompañamiento desde cimentación junto al arquitecto Jorge Luis Hernández Silva. Videovigilancia y control de acceso Hikvision, iluminación Shelly + Akubela + Alexa, audio VSSL y Tru Audio, y red Ruijie.",
    seo_keywords: [
      "Integración residencial Guadalajara",
      "Hikvision control de acceso Guadalajara",
      "Shelly Akubela Alexa",
      "VSSL Tru Audio México",
      "Ruijie Reyee residencial",
      "Domótica Guadalajara",
      "ALFA casos de éxito",
    ],
  },
];
