export interface BlogAuthor {
  name: string;
  role: string;
  avatar?: string;
}

export interface BlogAiDisclosure {
  isAiAssisted: boolean;
  reviewedBy: string;
  role: string;
  summary: string;
  guidelinesNote: string;
}

export interface BlogFaqItem {
  question: string;
  answer: string;
}

export interface BlogSectionImage {
  src: string;
  alt: string;
  caption?: string;
  /** "contain" para renders/planos sobre fondo claro; "cover" para fotografía a sangre */
  fit?: "contain" | "cover";
  /** Relación de aspecto del marco: "4/3" | "16/10" | "3/2" | "1/1". Por defecto 4/3 (contain) o 16/10 (cover). */
  aspect?: "4/3" | "16/10" | "3/2" | "16/9" | "1/1";
}

export interface BlogSection {
  id: string;
  title: string;
  content: string[];
  image?: BlogSectionImage;
  bullets?: string[];
  subsections?: {
    subtitle: string;
    text: string;
    items?: string[];
  }[];
  callout?: {
    type: "info" | "tip" | "highlight" | "quote";
    title?: string;
    text: string;
  };
  table?: {
    caption?: string;
    headers: string[];
    rows: string[][];
  };
}

/** Bloque de llamada a la accion dentro de un articulo. */
export interface BlogCta {
  eyebrow: string;
  title: string;
  text: string;
  /** Texto del boton. */
  label: string;
  /** Liga interna. Si se omite, el boton abre WhatsApp con `whatsappQuoteMessage`. */
  href?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  metaDescription: string;
  excerpt: string;
  category: string;
  categorySlug: string;
  tags: string[];
  publishedAt: string;
  publishedAtFormatted: string;
  readTime: string;
  coverImage: string;
  coverImageAlt: string;
  /** Pie de foto de la portada. Si se omite, se usa coverImageAlt. */
  coverImageCaption?: string;
  author: BlogAuthor;
  aiEditorialDisclosure: BlogAiDisclosure;
  whatsappQuoteMessage: string;
  /** Producto o tema del articulo: va en el JSON-LD (`about`). */
  topicName: string;
  /** Recuadro sobre la portada en el articulo destacado de `/blog`. */
  spotlight: { title: string; text: string };
  /** Titulo del recuadro de datos al inicio del articulo. */
  quickSpecsTitle: string;
  /** Titulo de la tabla completa de datos. Si se omite, la tabla no se muestra. */
  fullSpecsTitle?: string;
  technicalSpecs: { label: string; value: string }[];
  tableOfContents: { id: string; title: string }[];
  sections: BlogSection[];
  faq: BlogFaqItem[];
  /** Llamada a media lectura, tarjeta lateral y cierre del articulo. */
  midCta: BlogCta;
  sidebarCta: BlogCta;
  closingCta: BlogCta;
  relatedSolutionHref?: string;
  relatedSolutionLabel?: string;
  /** Texto del boton de cierre hacia la solucion relacionada. */
  relatedSolutionCta?: string;
}

export interface BlogCategory {
  title: string;
  slug: string;
  description: string;
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  {
    title: "Todos",
    slug: "todos",
    description: "Todos los artículos técnicos y novedades de ALFA",
  },
  {
    title: "Control de Acceso & Seguridad",
    slug: "control-de-acceso",
    description: "Soluciones de videovigilancia, biometría y resguardo inteligente",
  },
  {
    title: "Iluminación & Automatización",
    slug: "iluminacion",
    description: "Sistemas Lutron, Shelly y confort arquitectónico",
  },
  {
    title: "Audio & Video Hi-Fi",
    slug: "audio-video",
    description: "Acústica, cine en casa y audio de referencia",
  },
  {
    title: "Redes & Infraestructura",
    slug: "redes",
    description: "Cableado estructurado, centros de datos y WiFi empresarial",
  },
];

// El primer articulo de la lista es el destacado de `/blog`.
export const STATIC_BLOG_POSTS: BlogPost[] = [
  {
    slug: "simulador-de-audio-cuantas-bocinas-necesita-tu-espacio",
    title: "Nuevo: Simulador de Audio de ALFA. Diseña el sonido de tu espacio antes de comprar una sola bocina",
    subtitle:
      "Cuéntanos qué quieres escuchar y en dónde. El simulador te propone los equipos, te dice cuántas bocinas son, dónde van y qué tan fuerte se va a oír, sobre tus medidas o sobre tu plano.",
    metaDescription:
      "Simulador de audio en línea de ALFA: responde unas preguntas, sube tu plano o pon tus medidas y descubre cuántas bocinas necesita tu espacio, dónde van y qué tan fuerte se escucha. Con KEF, Bowers & Wilkins, Bose y Sonos.",
    excerpt:
      "¿Cuántas bocinas necesito? ¿De plafón o inalámbricas? ¿Y la televisión? El nuevo Simulador de Audio de ALFA responde esas preguntas en minutos, con los mismos equipos que instalamos.",
    category: "Audio & Video Hi-Fi",
    categorySlug: "audio-video",
    tags: [
      "Simulador de Audio",
      "Bocinas de plafón",
      "Cine en casa",
      "Sonos",
      "KEF",
      "Bowers & Wilkins",
      "Audio residencial",
    ],
    publishedAt: "2026-11-23",
    publishedAtFormatted: "23 de Noviembre, 2026",
    readTime: "5 min de lectura",
    coverImage: "/simulador/capturas/simulador-plano.jpg",
    coverImageAlt:
      "Simulador de Audio de ALFA mostrando una cocina de 5 por 4 metros con cuatro bocinas de plafón y su huella de cobertura",
    coverImageCaption:
      "El Simulador de Audio de ALFA: cuatro bocinas de plafón y la cobertura de cada una sobre el espacio.",
    author: {
      name: "Ing. Leonardo Figueroa",
      role: "Director de Ingeniería e Integración | ALFA High End Services",
    },
    aiEditorialDisclosure: {
      isAiAssisted: true,
      reviewedBy: "Equipo de Ingeniería de Audio y Video de ALFA",
      role: "Validación del funcionamiento del simulador y de los equipos que propone",
      summary:
        "Este artículo fue redactado con asistencia de Inteligencia Artificial y revisado por el equipo de ALFA High End Services antes de publicarse.",
      guidelinesNote:
        "Cumpliendo con los estándares de calidad E-E-A-T de Google Search Central, transparentamos el uso de herramientas de IA en la redacción, con respaldo y revisión profesional.",
    },
    whatsappQuoteMessage:
      "Hola ALFA, leí su artículo sobre el Simulador de Audio y me interesa una asesoría para sonorizar mi espacio.",
    topicName: "Simulador de Audio de ALFA",
    spotlight: {
      title: "Simulador de Audio",
      text: "Preguntas guiadas · Tus medidas o tu plano · Cobertura y volumen",
    },
    quickSpecsTitle: "En resumen · Simulador de Audio",
    midCta: {
      eyebrow: "Pruébalo ahora",
      title: "Arma el sonido de tu espacio en unos minutos",
      text: "Contesta unas preguntas y recibe una solución inicial. Después afínala con tus medidas o con tu plano.",
      label: "Abrir el simulador",
      href: "/simulador-audio",
    },
    sidebarCta: {
      eyebrow: "Nuevo",
      title: "Simulador de Audio",
      text: "Contesta unas preguntas y recibe una solución inicial con los equipos que instalamos.",
      label: "Abrir el simulador",
      href: "/simulador-audio",
    },
    closingCta: {
      eyebrow: "Audio y video ALFA",
      title: "Del simulador a tu casa",
      text: "Cuando tengas tu diseño, un asesor de ALFA lo revisa contigo, lo ajusta en sitio y se encarga del suministro, la instalación y la calibración del sistema.",
      label: "Abrir el simulador",
      href: "/simulador-audio",
    },
    technicalSpecs: [
      { label: "Costo", value: "Sin costo" },
      { label: "Acceso", value: "Registro con nombre, correo y teléfono; se verifica el correo" },
      { label: "Qué necesitas", value: "Las medidas del espacio o tu plano en PDF, JPG o PNG" },
      { label: "Qué obtienes", value: "Cuántas bocinas son, dónde van, qué tan fuerte se escucha y la lista de equipos" },
      { label: "Marcas", value: "KEF, Bowers & Wilkins, Bose y Sonos" },
      { label: "Siguiente paso", value: "Pedir tu propuesta a un asesor de ALFA desde el mismo simulador" },
    ],
    tableOfContents: [
      { id: "por-que", title: "Por qué hicimos un simulador" },
      { id: "como-funciona", title: "Cómo funciona, en tres pasos" },
      { id: "television", title: "Si hay televisión: barra de sonido y cine en casa" },
      { id: "plano", title: "Sobre tus medidas o sobre tu plano" },
      { id: "volumen", title: "¿Qué tan fuerte se va a escuchar?" },
      { id: "equipos", title: "Con los equipos que sí instalamos" },
      { id: "alcance", title: "Lo que el simulador no hace" },
      { id: "empezar", title: "Cómo empezar" },
    ],
    sections: [
      {
        id: "por-que",
        title: "Por qué hicimos un simulador",
        content: [
          "Casi todos los proyectos de audio empiezan con las mismas preguntas: ¿cuántas bocinas necesito?, ¿van en el techo o en la pared?, ¿se va a escuchar parejo en toda la sala?, ¿y qué hago con la televisión?",
          "Hasta ahora, para contestarlas había que agendar una visita. Con el Simulador de Audio de ALFA puedes tener una primera respuesta en minutos, desde tu computadora o tu celular, y llegar a la plática con un asesor sabiendo ya qué quieres.",
          "No es un catálogo ni un cotizador automático. Es la misma lógica con la que diseñamos un sistema, puesta en una herramienta que cualquier persona puede usar.",
        ],
        callout: {
          type: "highlight",
          title: "La idea",
          text: "Que veas tu sistema antes de comprarlo: los equipos, dónde va cada bocina y cómo se va a escuchar.",
        },
      },
      {
        id: "como-funciona",
        title: "Cómo funciona, en tres pasos",
        content: [
          "El simulador empieza por lo que tú quieres, no por los equipos. Primero pregunta, después propone y al final te deja afinar.",
        ],
        subsections: [
          {
            subtitle: "1. Cuéntanos qué quieres",
            text: "Elige el espacio (sala, recámara, cocina, terraza, oficina o negocio), dinos si hay televisión, para qué lo vas a usar y si el espacio está en obra o ya está terminado. Son unas cuantas preguntas, con un clic cada una.",
          },
          {
            subtitle: "2. Recibe una solución inicial",
            text: "Con tus respuestas, el simulador arma una propuesta por espacio: qué equipos van, cuántas piezas y por qué. Puedes agregar todos los espacios de tu casa, uno por uno.",
          },
          {
            subtitle: "3. Afínala en el simulador",
            text: "Abre el simulador con las bocinas ya elegidas. Pon las medidas o sube tu plano y verás cuántas bocinas son, dónde van, cuánta área cubren y qué tan fuerte se escucha. Puedes moverlas, cambiar de modelo y comparar.",
          },
        ],
        image: {
          src: "/simulador/capturas/asistente-solucion.jpg",
          alt: "Solución inicial del Simulador de Audio de ALFA: cine en casa con Sonos Arc Ultra, Sub 4 y dos Era 300 para la sala, y bocinas KEF de plafón para la cocina",
          caption:
            "La solución inicial: una tarjeta por espacio, con los equipos y la razón de cada decisión.",
          fit: "contain",
          aspect: "4/3",
        },
      },
      {
        id: "television",
        title: "Si hay televisión: barra de sonido y cine en casa",
        content: [
          "Cuando en el espacio hay una televisión, el sonido de la tele y la música pueden ser el mismo sistema. El simulador te pregunta qué tanto quieres:",
        ],
        bullets: [
          "Que se oiga mejor: una barra de sonido bajo la televisión, con voces claras y sin complicaciones.",
          "Cine en casa: la barra, un subwoofer para los graves y dos bocinas atrás que te envuelven en las películas.",
          "Tú eliges dónde van las bocinas de atrás: empotradas en el techo, sobrepuestas en el muro o inalámbricas sobre un mueble.",
          "Si el espacio ya está terminado y prefieres no abrir techos ni muros, la propuesta se va por equipos inalámbricos.",
        ],
      },
      {
        id: "plano",
        title: "Sobre tus medidas o sobre tu plano",
        content: [
          "Hay dos formas de trabajar. La rápida es poner el ancho, el largo y la altura del plafón de cada espacio. La completa es subir tu plano en PDF, JPG o PNG, marcar una medida conocida para darle escala y dibujar el contorno de cada área.",
          "En los dos casos el simulador reparte las bocinas, dibuja la zona que cubre cada una y calcula qué porcentaje del espacio queda cubierto. Si mueves una bocina, el cálculo se actualiza al momento.",
          "Tu plano no se sube a ningún servidor: se queda en tu navegador mientras lo usas.",
        ],
        image: {
          src: "/simulador/capturas/simulador-plano.jpg",
          alt: "Vista de planta del simulador con cuatro bocinas KEF de plafón y sus círculos de cobertura sobre un espacio de 5 por 4 metros",
          caption:
            "Cada círculo es la zona que cubre una bocina. Donde se enciman, el sonido es más parejo.",
          fit: "cover",
          aspect: "3/2",
        },
        callout: {
          type: "tip",
          title: "Las bocinas van en pares",
          text: "En una casa la música es estéreo: canal izquierdo y canal derecho. Por eso el simulador siempre propone las bocinas en pares.",
        },
      },
      {
        id: "volumen",
        title: "¿Qué tan fuerte se va a escuchar?",
        content: [
          "Nadie piensa en decibeles cuando imagina su sala. Por eso el simulador no te pide un número: te pide un ambiente.",
        ],
        table: {
          caption: "Los tres ambientes del simulador",
          headers: ["Ambiente", "Cómo se siente"],
          rows: [
            ["Ambiental", "Música de fondo. Se platica sin alzar la voz."],
            ["Convivencia", "La música está presente. Para platicar hay que acercarse."],
            ["Fiesta", "La música manda. Hay que alzar la voz para platicar."],
          ],
        },
        image: {
          src: "/simulador/capturas/simulador-volumen.jpg",
          alt: "Mapa de volumen del simulador y medidor que indica que el sistema alcanza el ambiente de convivencia con margen",
          caption:
            "El mapa de volumen muestra dónde se escucha más fuerte, y el medidor te dice si tu sistema alcanza el ambiente que elegiste.",
          fit: "contain",
          aspect: "1/1",
        },
      },
      {
        id: "equipos",
        title: "Con los equipos que sí instalamos",
        content: [
          "El simulador no propone marcas al azar. Trabaja con los equipos que ALFA instala todos los días, y muestra la foto de cada uno para que sepas cómo se va a ver en tu casa:",
        ],
        bullets: [
          "Bocinas de plafón KEF y Bose: quedan empotradas en el techo y casi no se ven.",
          "Bocinas de muro Bowers & Wilkins: sobrepuestas, para terrazas y exteriores.",
          "Bocinas inalámbricas Sonos Era: sin obra, solo necesitan un contacto.",
          "Barras de sonido y subwoofers Sonos para la televisión.",
          "El amplificador que mueve el sistema, con Sonos Amp como opción de línea y otras alternativas para comparar.",
        ],
      },
      {
        id: "alcance",
        title: "Lo que el simulador no hace",
        content: [
          "Preferimos decirlo claro. El simulador hace una estimación de cobertura y de volumen a partir de los datos de cada bocina, las medidas del espacio y la altura del plafón. No considera muebles, materiales ni la acústica del lugar.",
          "Tampoco muestra precios: la propuesta económica, con instalación incluida, te la prepara un asesor. Y si tu proyecto es un negocio grande, lo indicado es audio comercial, que diseñamos aparte.",
        ],
        callout: {
          type: "info",
          title: "El diseño final se hace en sitio",
          text: "El simulador es el punto de partida. El diseño definitivo lo ajusta un ingeniero de ALFA en tu espacio.",
        },
      },
      {
        id: "empezar",
        title: "Cómo empezar",
        content: [
          "Entra al simulador, deja tu nombre, tu correo y tu teléfono, y confirma tu correo con el código que te enviamos. Eso es todo: en un par de minutos estarás armando tu sistema.",
          "Cuando te guste lo que ves, pide tu propuesta desde el mismo simulador. Tu diseño le llega a un asesor de ALFA, que te contacta para afinarlo y cotizarlo.",
        ],
        callout: {
          type: "quote",
          title: "¿Listo para escucharlo?",
          text: "Diseña el sonido de tu espacio hoy y platícalo con nosotros cuando quieras.",
        },
      },
    ],
    faq: [
      {
        question: "¿Usar el simulador tiene costo?",
        answer:
          "No. Solo te pedimos registrarte con tu nombre, correo y teléfono, y confirmar tu correo con un código.",
      },
      {
        question: "¿Necesito el plano de mi casa para usarlo?",
        answer:
          "No. Con el ancho, el largo y la altura del plafón de cada espacio es suficiente. Si tienes tu plano en PDF, JPG o PNG puedes subirlo y trabajar encima; el archivo se queda en tu navegador y no se sube a nuestros servidores.",
      },
      {
        question: "¿El simulador me da precios?",
        answer:
          "No. Te da la lista de equipos de tu sistema. La propuesta con precios e instalación la prepara un asesor de ALFA cuando la solicitas desde el simulador.",
      },
      {
        question: "¿Qué tan exacto es el resultado?",
        answer:
          "Es una estimación geométrica de cobertura y de volumen, calculada con los datos de cada bocina, las medidas del espacio y la altura del plafón. No considera muebles, materiales ni la acústica del lugar, así que el diseño final lo ajusta un ingeniero de ALFA en sitio.",
      },
      {
        question: "¿Por qué siempre propone las bocinas en pares?",
        answer:
          "Porque la música en una casa es estéreo: tiene canal izquierdo y canal derecho. Con un número impar de bocinas, uno de los dos canales quedaría incompleto.",
      },
      {
        question: "¿Sirve para un restaurante, una tienda o una oficina?",
        answer:
          "Sí, para espacios chicos y medianos. En un negocio grande lo indicado es audio comercial, con otro tipo de bocinas y amplificadores; ese diseño lo hacemos aparte con un asesor.",
      },
    ],
    relatedSolutionHref: "/servicios/audio-video",
    relatedSolutionLabel: "Audio y Video Profesional",
    relatedSolutionCta: "Ver Audio y Video",
  },
  {
    slug: "lockers-inteligentes-hikvision-ds-klm28-12-control-acceso-facial",
    title: "Lockers Inteligentes Hikvision DS-KLM28-12: Automatización, Reconocimiento Facial y Control de Acceso",
    subtitle:
      "Análisis técnico exhaustivo del sistema de casilleros maestro con 12 compartimentos, terminal biométrica táctil de 8 pulgadas, expansión RS-485 y compatibilidad con plataformas corporativas.",
    metaDescription:
      "Descubre el Locker Inteligente Hikvision DS-KLM28-12: 12 compartimentos, reconocimiento facial para 20,000 rostros, pantalla táctil de 8 pulgadas, modos de uso para empleados/visitas y cotización oficial en México con ALFA.",
    excerpt:
      "El Hikvision DS-KLM28-12 redefine la gestión de pertenencias en corporativos, data centers y plantas industriales: elimina llaves físicas mediante biometría facial deep learning, audita el 100% de los accesos y permite expandir hasta 16 módulos adicionales.",
    category: "Control de Acceso & Seguridad",
    categorySlug: "control-de-acceso",
    tags: [
      "Hikvision",
      "DS-KLM28-12",
      "Lockers Inteligentes",
      "Control de Acceso",
      "Reconocimiento Facial",
      "Seguridad Electrónica",
      "ALFA OS",
    ],
    publishedAt: "2026-09-01",
    publishedAtFormatted: "1 de Septiembre, 2026",
    readTime: "8 min de lectura",
    coverImage: "/blog/hikvision-ds-klm28-12/escena-gimnasio-ia.jpg",
    coverImageAlt:
      "Dos usuarios operando un locker inteligente Hikvision DS-KLM28-12 en el área de vestidores de un gimnasio premium: uno se autentica en la pantalla táctil mientras otro retira su mochila y tablet de un compartimento abierto",
    coverImageCaption:
      "Imagen conceptual generada con inteligencia artificial, únicamente con fines demostrativos. No corresponde a una instalación real de ALFA.",
    author: {
      name: "Ing. Leonardo Figueroa",
      role: "Director de Ingeniería e Integración | ALFA High End Services",
    },
    aiEditorialDisclosure: {
      isAiAssisted: true,
      reviewedBy: "Equipo de Ingeniería y Sistemas de Seguridad de ALFA",
      role: "Validación de especificaciones de hardware, protocolos de red y directrices de instalación en México",
      summary:
        "Este artículo fue investigado y redactado con asistencia de Inteligencia Artificial especializada y revisado exhaustivamente por los ingenieros de ALFA High End Services.",
      guidelinesNote:
        "Cumpliendo con los estándares de calidad E-E-A-T de Google Search Central, transparentamos el uso de herramientas de IA en la síntesis de documentación técnica, garantizando exactitud operativa y respaldo profesional.",
    },
    whatsappQuoteMessage:
      "Hola ALFA, leí su artículo sobre los Lockers Inteligentes Hikvision DS-KLM28-12 y me interesa solicitar una cotización y asesoría técnica para un proyecto.",
    topicName: "Hikvision DS-KLM28-12",
    spotlight: {
      title: "Modelo DS-KLM28-12",
      text: "12 puertas · Pantalla táctil 8\" · Reconocimiento facial 20K rostros",
    },
    quickSpecsTitle: "Ficha Técnica Rápida · Hikvision DS-KLM28-12",
    fullSpecsTitle: "Especificaciones Técnicas Detalladas",
    midCta: {
      eyebrow: "Atención Técnica Inmediata",
      title: "¿Deseas implementar el sistema Hikvision DS-KLM28-12 en tu proyecto?",
      text: "Cotiza directamente con nuestros ingenieros certificados de ALFA. Evaluamos las dimensiones de tu inmueble, cálculo de usuarios y requerimientos de red sin costo.",
      label: "Cotizar por WhatsApp Ahora",
    },
    sidebarCta: {
      eyebrow: "Cotización Inmediata",
      title: "Hikvision DS-KLM28-12",
      text: "Solicita presupuesto personalizado con módulos adicionales o programación a la medida.",
      label: "Contactar por WhatsApp",
    },
    closingCta: {
      eyebrow: "Integración Oficial en México",
      title: "Solución Llave en Mano para Corporativos y Residencias",
      text: "En ALFA cubrimos desde la ingeniería de diseño, suministro directo con garantía de fábrica, hasta la instalación física, canalización, configuración en red y soporte en nuestra plataforma ALFA OS.",
      label: "Pedir Cotización por WhatsApp",
    },
    technicalSpecs: [
      { label: "Modelo Principal", value: "Hikvision DS-KLM28-12 (Locker Maestro)" },
      { label: "Número de Compartimentos", value: "12 gabinetes independientes" },
      { label: "Dimensiones Totales", value: "188 cm (Alto) x 97 cm (Ancho) x 47 cm (Profundidad)" },
      { label: "Dimensiones por Gabinete", value: "27.7 cm (Alto) x 37.2 cm (Ancho) x 45 cm (Profundidad)" },
      { label: "Pantalla Integrada", value: "Táctil LCD de 8 pulgadas de alta resolución" },
      { label: "Reconocimiento Facial", value: "Cámara dual con IA Deep Learning (hasta 20,000 rostros)" },
      { label: "Lector de Tarjetas RFID", value: "Soporta Mifare / Desfire / EM (hasta 200,000 tarjetas)" },
      { label: "Registro de Eventos", value: "Hasta 100,000 eventos auditables en memoria" },
      { label: "Capacidad de Expansión", value: "Hasta 16 módulos esclavos (DS-KLB212) vía RS-485" },
      { label: "Conectividad de Red", value: "TCP/IP 10/100/1000 Mbps, RS-485, USB" },
      { label: "Alimentación Eléctrica", value: "110 VCA / 60 Hz estándar" },
      { label: "Sistema Operativo / API", value: "Android industrial / API abierta ISAPI & HikCentral" },
      { label: "Material de Fabricación", value: "Acero laminado en frío con pintura electrostática anticorrosiva" },
      { label: "Entorno de Operación", value: "Interiores (-10 °C a 50 °C)" },
    ],
    tableOfContents: [
      { id: "introduccion", title: "1. El fin de las llaves físicas en instalaciones de alto nivel" },
      { id: "que-es-ds-klm28-12", title: "2. ¿Qué es el Locker Inteligente Hikvision DS-KLM28-12?" },
      { id: "arquitectura-hardware", title: "3. Arquitectura y Métodos de Autenticación Múltiple" },
      { id: "modos-de-operacion", title: "4. Modos de Uso: Empleados Fijos vs Visitantes Temporales" },
      { id: "escalabilidad", title: "5. Escalabilidad: Hasta 16 Módulos Esclavos (DS-KLB212)" },
      { id: "integracion-software", title: "6. Integración con Redes Corporativas y ALFA OS" },
      { id: "casos-de-uso", title: "7. Aplicaciones en México: Corporativos, Hospitales e Industria" },
      { id: "tabla-comparativa", title: "8. Comparativa: Locker Mecánico vs DS-KLM28-12" },
      { id: "preguntas-frecuentes", title: "9. Preguntas Frecuentes Técnicas" },
      { id: "cotizacion-alfa", title: "10. Suministro, Instalación y Puesta a Punto con ALFA" },
    ],
    sections: [
      {
        id: "introduccion",
        title: "1. El fin de las llaves físicas en instalaciones de alto nivel",
        content: [
          "Durante décadas, la custodia de pertenencias personales en entornos empresariales, plantas industriales, hospitales y centros deportivos de lujo dependió de métodos mecánicos vulnerables: llaves que se extravían, candados vulnerables a ganzúas y combinaciones compartidas que impiden saber quién accedió a un casillero.",
          "Con la creciente exigencia de normativas de seguridad patrimonial, privacidad de datos y control de activos sensibles (como laptops de empresa, teléfonos móviles en áreas limpias o herramientas especializadas), los lockers tradicionales se han convertido en un cuello de botella operativo y un foco de riesgo constante.",
          "El lanzamiento del casillero inteligente Hikvision DS-KLM28-12 marca un antes y un después en el mercado mexicano, ofreciendo una solución integral 'todo en uno' donde el casillero se convierte en un nodo biométrico inteligente, auditable y centralizado.",
        ],
        image: {
          src: "/blog/hikvision-ds-klm28-12/escena-gimnasio-ia.jpg",
          alt: "Recreación de un club deportivo premium donde dos socios usan un locker inteligente Hikvision DS-KLM28-12 para resguardar mochila, tablet y pertenencias mediante la pantalla táctil",
          caption:
            "Escenario conceptual: club deportivo con el DS-KLM28-12 como consigna inteligente de autoservicio. Imagen generada con inteligencia artificial, sólo demostrativa; no es una instalación real de ALFA.",
          fit: "cover",
          aspect: "3/2",
        },
        callout: {
          type: "highlight",
          title: "Beneficio Clave de Seguridad",
          text: "El DS-KLM28-12 elimina al 100% el gasto recurrente en reposición de llaves, cerrajería y auditorías manuales, proporcionando un registro digital con foto, fecha y hora de cada apertura.",
        },
      },
      {
        id: "que-es-ds-klm28-12",
        title: "2. ¿Qué es el Locker Inteligente Hikvision DS-KLM28-12?",
        content: [
          "El modelo Hikvision DS-KLM28-12 es un casillero inteligente maestro compuesto por 12 puertas individuales y una consola central táctil de 8 pulgadas que integra una terminal biométrica facial de alta precisión.",
          "A diferencia de los gabinetes convencionales que requieren cablear controladoras externas, fuentes de poder dispersas y electroimanes por separado, el DS-KLM28-12 viene integrado de fábrica con un sistema operativo embebido basado en Android, sensores de estado de puerta, cerraduras electromecánicas reforzadas e interfaz de red nativa TCP/IP.",
        ],
        image: {
          src: "/blog/hikvision-ds-klm28-12/dimensiones.png",
          alt: "Plano de dimensiones del locker Hikvision DS-KLM28-12: 188 cm de alto, 97 cm de ancho y 47 cm de fondo, con gabinetes de 27.7 x 37.2 x 45 cm",
          caption:
            "Dimensiones del gabinete maestro (mm). Cada compartimento libre mide 27.7 × 37.2 × 45 cm.",
          fit: "contain",
        },
        bullets: [
          "12 gabinetes espaciosos (27.7 x 37.2 x 45 cm c/u), ideales para mochilas, laptops de hasta 16 pulgadas, bolsos, cascos de seguridad o equipo técnico.",
          "Estructura construida en acero laminado en frío de alta durabilidad con acabado anticorrosivo y bisagras de uso rudo.",
          "Pantalla táctil interactiva a color de 8 pulgadas con interfaz gráfica en español intuitiva y rápida para el usuario final.",
          "Indicadores LED de estado de alta visibilidad para identificar puertas disponibles y ocupadas de un solo vistazo.",
        ],
      },
      {
        id: "arquitectura-hardware",
        title: "3. Arquitectura y Métodos de Autenticación Múltiple",
        content: [
          "La terminal facial integrada en el DS-KLM28-12 incorpora el algoritmo de aprendizaje profundo (Deep Learning) de Hikvision, capaz de autenticar a un usuario en menos de 0.2 segundos incluso en condiciones de baja iluminación o con el uso de cubrebocas.",
          "Para adaptarse a las políticas internas de cada organización, el sistema ofrece autenticación híbrida y multimodal:",
        ],
        subsections: [
          {
            subtitle: "Reconocimiento Facial Biométrico de Alta Precisión",
            text: "Cámara dual con lente gran angular y tecnología anti-suplantación (liveness detection) que rechaza fotografías impresas o pantallas de celular. Capacidad de almacenar hasta 20,000 rostros.",
          },
          {
            subtitle: "Tarjetas de Proximidad RFID (Mifare / Desfire / EM)",
            text: "Permite usar las mismas credenciales de acceso que los colaboradores ya utilizan para entrar al edificio o torniquetes, con una base de datos de hasta 200,000 tarjetas.",
          },
          {
            subtitle: "Contraseña / Código PIN Dinámico",
            text: "Teclado numérico táctil en pantalla para usuarios temporales, visitas esporádicas o como método de respaldo de emergencia.",
          },
        ],
      },
      {
        id: "modos-de-operacion",
        title: "4. Modos de Uso: Empleados Fijos vs Visitantes Temporales",
        content: [
          "Una de las mayores ventajas del Hikvision DS-KLM28-12 es su flexibilidad para configurar diferentes lógicas de negocio según el perfil de la instalación:",
        ],
        subsections: [
          {
            subtitle: "Modo Empleados / Casillero Asignado (Fijo)",
            text: "Cada casillero se vincula permanentemente al perfil de un colaborador específico. Solo su rostro o tarjeta autorizada podrá desbloquear su casillero asignado.",
          },
          {
            subtitle: "Modo Visitas / Auto-Asignación Dinámica (Temporal)",
            text: "El casillero opera como una consigna inteligente. El visitante se acerca a la pantalla, selecciona 'Depositar', registra su rostro o tarjeta y el sistema le abre automáticamente un compartimento libre. Al volver y autenticarse, la puerta se abre para recoger sus pertenencias y el casillero queda libre de inmediato para el siguiente usuario.",
          },
          {
            subtitle: "Modo Mixto / Departamental",
            text: "Permite particionar el sistema: por ejemplo, destinar 6 compartimentos a personal directivo fijo y los otros 6 a contratistas, proveedores o visitantes rotativos.",
          },
        ],
      },
      {
        id: "escalabilidad",
        title: "5. Escalabilidad: Hasta 16 Módulos Esclavos (DS-KLB212)",
        content: [
          "Si tu proyecto requiere más de 12 compartimentos, no es necesario comprar múltiples consolas maestras con pantalla. El DS-KLM28-12 actúa como la 'unidad cerebro' y se conecta mediante un bus industrial RS-485 a módulos de extensión (modelo DS-KLB212).",
          "Esta arquitectura modular permite expandir el sistema hasta 16 módulos esclavos (hasta 204 compartimentos en total) controlados desde una sola pantalla táctil central, reduciendo drásticamente el costo por casillero y simplificando la operación.",
        ],
        table: {
          caption: "Capacidad de Expansión del Sistema Hikvision Smart Locker",
          headers: ["Configuración", "Módulos Físicos", "Total Compartimentos", "Interfaz de Control"],
          rows: [
            ["Básica (1 Módulo)", "1x DS-KLM28-12 (Maestro)", "12 compartimentos", "Consola táctil de 8 pulgadas integrada"],
            ["Mediana (4 Módulos)", "1x Maestro + 3x Esclavos (DS-KLB212)", "48 compartimentos", "1 Consola maestra central"],
            ["Corporativa (8 Módulos)", "1x Maestro + 7x Esclavos (DS-KLB212)", "96 compartimentos", "1 Consola maestra central"],
            ["Capacidad Máxima (17 Módulos)", "1x Maestro + 16x Esclavos (DS-KLB212)", "204 compartimentos", "1 Consola maestra central"],
          ],
        },
      },
      {
        id: "integracion-software",
        title: "6. Integración con Redes Corporativas y ALFA OS",
        content: [
          "El DS-KLM28-12 no es un casillero aislado: se integra a la infraestructura tecnológica de la empresa mediante su puerto de red Gigabit TCP/IP.",
          "A través del protocolo ISAPI de Hikvision y la suite HikCentral Enterprise, los administradores de TI y seguridad pueden sincronizar usuarios automáticamente desde Active Directory, configurar horarios permitidos de apertura y recibir alertas instantáneas si una puerta permanece abierta por más tiempo del autorizado.",
          "En ALFA High End Services respaldamos la puesta a punto con nuestra plataforma ALFA OS, garantizando planos digitales de ubicación, bitácora de entrega de obra, inventario de IPs y soporte postventa especializado.",
        ],
        image: {
          src: "/blog/hikvision-ds-klm28-12/software-smart-cabinet.png",
          alt: "Consola web Smart Cabinet de Hikvision mostrando la administración del gabinete maestro y un módulo esclavo con estado de cada compartimento",
          caption:
            "Consola web Smart Cabinet: alta de usuarios, asignación de compartimentos y apertura remota del maestro y sus módulos esclavos.",
          fit: "cover",
        },
        callout: {
          type: "info",
          title: "Seguridad y Trazabilidad Integral",
          text: "Cada apertura genera un registro digital inalterable con fecha, hora, número de compartimento, método de acceso y fotografía del rostro capturado en el instante de la transacción.",
        },
      },
      {
        id: "casos-de-uso",
        title: "7. Aplicaciones en México: Corporativos, Hospitales e Industria",
        content: [
          "La versatilidad del DS-KLM28-12 permite resolver necesidades críticas de resguardo en múltiples sectores:",
        ],
        bullets: [
          "Corporativos AAA y Oficinas Flexibles (Hot-Desking): Resguardo seguro para colaboradores híbridos sin necesidad de escritorios fijos.",
          "Data Centers y Centros de Cómputo: Custodia obligatoria de celulares y medios extraíbles antes de entrar a cuartos de servidores.",
          "Plantas Industriales y Farmacéuticas: Cumplimiento estricto de normas de inocuidad en esclusas de acceso a cuartos limpios (Cleanrooms).",
          "Hospitales y Clínicas: Resguardo higiénico y sin contacto físico para pertenencias de médicos y pacientes en áreas críticas.",
          "Clubes Deportivos y Gimnasios Premium: Experiencia de hospitalidad VIP donde el socio ingresa con solo mirar la pantalla, sin pulseras ni llaves.",
        ],
      },
      {
        id: "tabla-comparativa",
        title: "8. Comparativa: Locker Mecánico vs DS-KLM28-12",
        content: [
          "Al comparar el costo total de propiedad (TCO) y la experiencia de usuario a mediano plazo, la inversión en casilleros inteligentes supera ampliamente a las alternativas mecánicas:",
        ],
        table: {
          headers: ["Característica", "Locker Tradicional (Llave/Candado)", "Hikvision DS-KLM28-12"],
          rows: [
            ["Método de Apertura", "Llave física / Candado", "Rostro con IA, Tarjeta RFID o PIN"],
            ["Riesgo de Extravío", "Alto (requiere cambio de chapa)", "Nulo (se reasigna digitalmente)"],
            ["Auditoría y Bitácora", "Inexistente o manual en papel", "100% digital con fotos y marcas de tiempo"],
            ["Tiempo de Gestión RH/Seguridad", "Horas semanales en entrega de llaves", "Automatizado y auto-servicio"],
            ["Apertura de Emergencia", "Rotura forzada de candado", "Desbloqueo remoto por software o llave maestra"],
            ["Imagen Corporativa", "Básica / Tradicional", "Alta Gama, Tecnológica y Vanguardista"],
          ],
        },
      },
      {
        id: "preguntas-frecuentes",
        title: "9. Preguntas Frecuentes Técnicas",
        content: [
          "A continuación respondemos a las dudas más comunes que surgen al planificar la instalación del sistema Hikvision DS-KLM28-12:",
        ],
      },
      {
        id: "cotizacion-alfa",
        title: "10. Suministro, Instalación y Puesta a Punto con ALFA",
        content: [
          "En ALFA High End Services somos integradores autorizados y distribuidores de Hikvision en México. Ofrecemos el proyecto llave en mano completo:",
        ],
        bullets: [
          "Levantamiento y dimensionamiento de capacidad según flujo de usuarios.",
          "Canalización, cableado estructurado Cat6A certificado y alimentación eléctrica respaldada.",
          "Configuración de red, VLAN de seguridad, enrolamiento inicial de usuarios y perfiles de acceso.",
          "Capacitación al equipo de Recursos Humanos, Seguridad Patrimonial y Mantenimiento.",
          "Póliza de soporte, garantías de fábrica y gestión documental en ALFA OS.",
        ],
        callout: {
          type: "quote",
          title: "¿Listo para modernizar las instalaciones de tu empresa?",
          text: "Contáctanos vía WhatsApp para coordinar una sesión de asesoría técnica o enviarnos el plano de tu proyecto para cotizar el modelo DS-KLM28-12 con módulos de expansión a la medida.",
        },
      },
    ],
    faq: [
      {
        question: "¿Qué ocurre si se va la energía eléctrica en el inmueble?",
        answer:
          "El sistema mantiene el estado de bloqueo de todas las puertas para preservar la seguridad de las pertenencias. En ALFA integramos siempre un sistema de respaldo de energía UPS (No-Break) que permite mantener la terminal y los lockers operando continuamente durante apagones.",
      },
      {
        question: "¿Cómo se abre un compartimento en caso de emergencia si un usuario ya no se encuentra?",
        answer:
          "El administrador autorizado cuenta con tres métodos de apertura forzada: desbloqueo individual o masivo desde la plataforma web HikCentral/ISAPI, ingreso con código PIN maestro de superusuario en la pantalla táctil, o mediante la llave física de seguridad oculta que incluye el gabinete.",
      },
      {
        question: "¿Es seguro el reconocimiento facial frente a fraudes o fotografías?",
        answer:
          "Totalmente seguro. El DS-KLM28-12 cuenta con cámara dual y algoritmo biométrico con detección de vida (anti-spoofing). Reconoce profundidad tridimensional y calor, impidiendo que el casillero se abra con fotos digitales, pantallas de celular o impresiones en papel.",
      },
      {
        question: "¿Se puede instalar en exteriores o áreas de alberca?",
        answer:
          "El modelo DS-KLM28-12 está diseñado para uso exclusivo en interiores climatizados o techados con temperaturas entre -10 °C y 50 °C. Para áreas semiexteriores, en ALFA diseñamos adecuaciones arquitectónicas y gabinetes protectores especiales.",
      },
      {
        question: "¿Cuánto tiempo toma el suministro e instalación en Guadalajara, Zapopan y el resto de México?",
        answer:
          "El tiempo de entrega depende del volumen de módulos. La instalación física, cableado y comisionamiento de un sistema maestro con hasta 4 esclavos toma habitualmente de 2 a 3 días hábiles por parte de nuestro equipo de ingeniería certificado.",
      },
    ],
    relatedSolutionHref: "/servicios/control-de-acceso",
    relatedSolutionLabel: "Control de Acceso & Automatización",
    relatedSolutionCta: "Ver Control de Acceso",
  },
];
