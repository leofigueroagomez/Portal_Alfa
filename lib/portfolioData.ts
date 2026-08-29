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
  challenge: string;
  solution: string;
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
  { id: "home-cinema", label: "Home Cinema" },
  { id: "iluminacion-control", label: "Iluminación & Control Lutron" },
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
    id: "residencia-country-club",
    slug: "residencia-country-club",
    title: "Residencia Country Club",
    subtitle: "Iluminación Arquitectónica Lutron & Audio Multiroom Integral",
    category: "Residencial Integral",
    category_slug: "residencial",
    client_type: "Residencial Privado",
    location: "Guadalajara, Jalisco",
    year: "2025",
    hero_image: "/projects/residencia-premium.jpeg",
    summary:
      "Integración de iluminación Lutron RadioRA 3 con botoneras Sunnata personalizadas, persianas motorizadas ultra silenciosas y 12 zonas de audio distribuido Sonos y Bowers & Wilkins.",
    origin_story:
      "Colaboración con despacho de arquitectura de autor desde etapa de proyecto para concebir una vivienda donde toda la tecnología estuviera completamente oculta en muros y plafones.",
    challenge:
      "Coordinar más de 80 circuitos de iluminación LED cálida y tiras Lumaris con persianas de gran formato en doble altura.",
    solution:
      "Procesadores Lutron RadioRA 3 PoE centralizados en rack, botoneras Sunnata en acabados Midnight y Snow, y audio arquitectónico de plafón.",
    results: [
      "Ambientes lumínicos automáticos sincronizados con el ritmo circadiano.",
      "Control de persianas y escenas desde teclados grabados con láser y app ALFA OS.",
    ],
    equipment_zones: [
      {
        zoneName: "Control Lumínico",
        description: "Ecosistema Lutron RadioRA 3.",
        equipment: [
          { brand: "Lutron", model: "RadioRA 3", role: "Procesadores & Dimmers Sunnata" },
          { brand: "Lutron", model: "Lumaris", role: "Tiras LED Tunable White" },
        ],
      },
    ],
    gallery: [
      {
        type: "image",
        url: "/projects/residencia-premium.jpeg",
        caption: "Integración arquitectónica de iluminación y audio en estancia principal.",
        isHero: true,
      },
    ],
    tags: ["Lutron", "RadioRA 3", "Sunnata", "Sonos", "Bowers & Wilkins", "Residencial"],
    is_featured: false,
    seo_title: "Residencia Country Club | Iluminación Lutron y Audio Multiroom | ALFA",
    seo_description:
      "Proyecto de iluminación arquitectónica Lutron y audio multiroom integrado en Guadalajara por ALFA High End Services.",
    seo_keywords: ["Lutron Guadalajara", "RadioRA 3 residencia", "Automatizacion lujo"],
  },
  {
    id: "home-cinema-puerta-de-hierro",
    slug: "home-cinema-puerta-de-hierro",
    title: "Cine Residencial Dolby Atmos",
    subtitle: "Sala de Cine Privada 7.2.4 de Alta Referencia",
    category: "Home Cinema",
    category_slug: "home-cinema",
    client_type: "Residencial Privado",
    location: "Zapopan, Jalisco",
    year: "2025",
    hero_image: "/projects/cine-bw-yamaha.jpeg",
    summary:
      "Sala de cine dedicada con configuración inmersiva 7.2.4 Dolby Atmos, altavoces empotrados de alta potencia, doble subwoofer calibrado y control de iluminación para escenas de proyección.",
    origin_story:
      "El cliente deseaba una sala cinematográfica privada para disfrutar películas familiares y eventos deportivos con acústica de nivel sala comercial de estreno.",
    challenge:
      "Tratamiento acústico para eliminar reflexiones primarias y control de aislamiento para no transmitir frecuencias bajas a recámaras contiguas.",
    solution:
      "Panelizado acústico absorbente y difusor oculto bajo tela acústica tensada, altavoces Bowers & Wilkins y procesador multicanal con calibración Dirac Live.",
    results: [
      "Inmersión 3D Dolby Atmos con precisión posicional absoluta.",
      "Control de un solo toque: 'Ver Película' atenúa luces, baja pantalla y enciende proyectores.",
    ],
    equipment_zones: [
      {
        zoneName: "Audio Cinematográfico",
        description: "Configuración 7.2.4 canales.",
        equipment: [
          { brand: "Bowers & Wilkins", model: "Architectural Cinema", role: "Altavoces LCR y Surround" },
          { brand: "Panamax", model: "M5400-PM", role: "Acondicionador de energía" },
        ],
      },
    ],
    gallery: [
      {
        type: "image",
        url: "/projects/cine-bw-yamaha.jpeg",
        caption: "Sala de cine residencial con iluminación indirecta y butacas ergonómicas.",
        isHero: true,
      },
    ],
    tags: ["Home Cinema", "Dolby Atmos", "Bowers & Wilkins", "Panamax", "Zapopan"],
    is_featured: false,
    seo_title: "Cine Residencial Dolby Atmos | Sala de Cine Privada en Zapopan | ALFA",
    seo_description:
      "Diseño acústico e integración de sala de cine dedicada 7.2.4 Dolby Atmos en Zapopan por ALFA High End Services.",
    seo_keywords: ["Cine en casa Guadalajara", "Dolby Atmos residencial", "Home theater Zapopan"],
  },
];
