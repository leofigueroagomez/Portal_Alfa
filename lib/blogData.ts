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
  technicalSpecs: { label: string; value: string }[];
  tableOfContents: { id: string; title: string }[];
  sections: BlogSection[];
  faq: BlogFaqItem[];
  relatedSolutionHref?: string;
  relatedSolutionLabel?: string;
  /** Nombre corto del equipo o sistema del artículo; se usa en la ficha rápida y en las tarjetas de cotización. Si se omite, se usa el título. */
  subjectLabel?: string;
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

export const STATIC_BLOG_POSTS: BlogPost[] = [
  {
    slug: "lockers-inteligentes-hikvision-ds-klm28-12-control-acceso-facial",
    subjectLabel: "Hikvision DS-KLM28-12",
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
  },
  {
    slug: "lutron-radiora-3-iluminacion-residencial-sin-obra",
    subjectLabel: "Lutron RadioRA 3",
    title: "Lutron RadioRA 3: iluminación que se adapta a la casa y no al revés",
    subtitle:
      "Escenas, horarios y persianas en una residencia existente, sin abrir muros ni depender del Wi-Fi.",
    metaDescription:
      "Cómo Lutron RadioRA 3 permite controlar luz y persianas con escenas y horarios en una casa ya construida, sin abrir muros. Datos técnicos de fuentes oficiales de Lutron.",
    excerpt:
      "Una casa bien iluminada se nota en la forma en que cambia a lo largo del día. RadioRA 3 lo logra con escenas, horarios y control inalámbrico sobre una instalación profesional.",
    category: "Iluminación & Automatización",
    categorySlug: "iluminacion",
    tags: ["Lutron", "RadioRA 3", "Iluminación", "Persianas", "Automatización residencial", "Sunnata"],
    publishedAt: "2026-11-27",
    publishedAtFormatted: "27 de Noviembre, 2026",
    readTime: "5 min de lectura",
    coverImage: "/blog/lutron-radiora-3/teclado-lutron-muro-nogal.jpg",
    coverImageAlt: "Dos teclados de control Lutron en acabado negro, empotrados en un muro de nogal",
    coverImageCaption: "Teclados Lutron instalados por ALFA en un muro de nogal.",
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
      "Hola ALFA, leí su artículo sobre Lutron RadioRA 3 y me interesa recibir asesoría para la iluminación de mi proyecto.",
    technicalSpecs: [
      { label: "Sistema", value: "Lutron RadioRA 3, control inalámbrico de iluminación y persianas" },
      { label: "Tecnología inalámbrica", value: "Clear Connect, independiente del Wi-Fi" },
      { label: "Clear Connect Type X", value: "2.4 a 2.48 GHz, red en malla (dispositivos Sunnata RF)" },
      { label: "Clear Connect Type A", value: "431 a 437 MHz, requiere repetidores para ampliar alcance" },
      { label: "Capacidad Type X", value: "Hasta 100 dispositivos por procesador y 200 por sistema" },
      { label: "Capacidad Type A", value: "Hasta 95 dispositivos por procesador y 190 por sistema" },
      { label: "Procesadores por sistema", value: "Hasta 4" },
      { label: "Alcance Type X", value: "Dispositivos a no más de 22.9 m (75 ft) del procesador" },
      { label: "Programación", value: "Software Lutron Designer en PC; ajustes de escenas y horarios desde la app de Lutron" },
      { label: "Acabados", value: "Dimmers, interruptores y teclados en más de 20 colores; placas en 25 colores y acabados" },
    ],
    tableOfContents: [
      { id: "una-casa-que-cambia", title: "1. Una casa que cambia durante el día" },
      { id: "escenas", title: "2. Escenas en lugar de interruptores" },
      { id: "sin-obra", title: "3. Instalación en una casa ya construida" },
      { id: "persianas", title: "4. Luz natural y persianas" },
      { id: "diseno", title: "5. Que el control desaparezca en el muro" },
      { id: "preguntas-frecuentes", title: "6. Preguntas frecuentes" },
    ],
    sections: [
      {
        id: "una-casa-que-cambia",
        title: "1. Una casa que cambia durante el día",
        content: [
          "La luz de una residencia bien resuelta no es una sola. Por la mañana pide claridad natural, al mediodía casi nada, por la noche una atmósfera más baja y cálida. Cuando cada luminaria depende de un apagador distinto, esa variación se resuelve a mano, y casi nunca se resuelve.",
          "RadioRA 3 es el sistema de Lutron pensado para esa necesidad. Según Lutron, es un sistema inalámbrico de control de iluminación, programable desde PC y conectado a la nube, que se instala de manera profesional y que integra controles, iluminación y persianas.",
          "Para el dueño de la casa, el resultado es simple: la iluminación responde a cómo se vive el espacio. Para el arquitecto, significa que el diseño de luz puede ajustarse después de la obra sin modificar la arquitectura.",
        ],
      },
      {
        id: "escenas",
        title: "2. Escenas en lugar de interruptores",
        content: [
          "La unidad básica de RadioRA 3 es la escena: una combinación de niveles de luz y de persianas que se activa con una sola acción, desde un teclado en el muro, desde la app o por voz.",
          "Lutron lo ilustra con un ejemplo: al activar una escena de cine, las luces de la sala bajan, las de la cocina contigua se apagan y las persianas descienden. Quien llega a casa no recuerda circuitos, elige un ambiente.",
          "El sistema también permite programar horarios y sincronizarlos con el amanecer y el atardecer, de modo que la iluminación se ajusta sola conforme cambian las estaciones.",
        ],
        callout: {
          type: "highlight",
          title: "El resultado",
          text: "Menos controles a la vista, menos decisiones al entrar a una habitación y una iluminación coherente en toda la casa.",
        },
      },
      {
        id: "sin-obra",
        title: "3. Instalación en una casa ya construida",
        content: [
          "RadioRA 3 se comunica mediante la tecnología de radiofrecuencia Clear Connect de Lutron, no por Wi-Fi. Esto importa por dos razones: la iluminación no depende de la red doméstica y no hay que tender cable de control entre los dispositivos.",
          "Lutron indica que el sistema permite iniciar la instalación en una habitación y ampliarlo con el tiempo, sin abrir muros ni jalar cable. Para una remodelación, eso reduce el polvo, los tiempos y la intervención sobre acabados terminados.",
        ],
        bullets: [
          "Clear Connect Type X trabaja entre 2.4 y 2.48 GHz y forma una red en malla; es la tecnología de los dispositivos Sunnata RF.",
          "Clear Connect Type A trabaja entre 431 y 437 MHz y usa repetidores para ampliar el alcance; permite incorporar la mayoría de los dispositivos RadioRA 2 existentes.",
          "Un sistema admite hasta 4 procesadores, con hasta 200 dispositivos Type X o 190 Type A.",
        ],
      },
      {
        id: "persianas",
        title: "4. Luz natural y persianas",
        content: [
          "La luz artificial es solo una parte de la ecuación. RadioRA 3 incorpora persianas de Lutron, entre ellas las líneas Triathlon y Sivoia QS Wireless, de modo que la luz natural entra al mismo sistema de escenas.",
          "Lutron propone como ejemplo despertar con la recámara llena de luz natural al subir las persianas, con algunas luces encendidas a nivel bajo. La escena resuelve en un solo gesto lo que antes eran varios.",
        ],
      },
      {
        id: "diseno",
        title: "5. Que el control desaparezca en el muro",
        content: [
          "Un buen sistema de iluminación no debería competir con la arquitectura. Lutron ofrece dimmers, interruptores y teclados en más de 20 colores con acabados brillante y satinado, y placas en 25 colores y acabados.",
          "Esto permite que el control se integre al muro y al material del espacio. En ALFA definimos con el arquitecto la ubicación, el acabado y la lógica de escenas antes de instalar, para que la tecnología se perciba por su efecto y no por su presencia.",
        ],
        image: {
          src: "/blog/lutron-radiora-3/apagador-lutron-muro-nogal.jpg",
          alt: "Apagador Lutron en acabado negro sobre un muro de nogal",
          caption: "Apagador Lutron en acabado negro instalado por ALFA sobre nogal.",
          fit: "cover",
          aspect: "4/3",
        },
        callout: {
          type: "quote",
          title: "¿Planeas iluminar o remodelar una residencia?",
          text: "Escríbenos por WhatsApp. Revisamos el proyecto contigo y con tu arquitecto, y te proponemos una distribución de escenas a la medida.",
        },
      },
      {
        id: "preguntas-frecuentes",
        title: "6. Preguntas frecuentes",
        content: [
          "Estas son las dudas más comunes antes de iniciar un proyecto de iluminación con RadioRA 3.",
        ],
      },
    ],
    faq: [
      {
        question: "¿RadioRA 3 funciona por Wi-Fi?",
        answer:
          "No. Según Lutron, el sistema se comunica mediante la tecnología de radiofrecuencia Clear Connect y sus componentes operan de forma independiente del Wi-Fi.",
      },
      {
        question: "¿Se necesita obra para instalarlo en una casa existente?",
        answer:
          "Lutron indica que el sistema puede ampliarse con el tiempo sin abrir muros ni tender cable. La viabilidad concreta depende de cada inmueble, por lo que se confirma en una visita técnica.",
      },
      {
        question: "¿Puedo empezar con una sola habitación?",
        answer:
          "Sí. Lutron describe el sistema como escalable: se puede iniciar en un espacio y agregar más áreas posteriormente.",
      },
      {
        question: "¿Qué tan grande puede ser el sistema?",
        answer:
          "Un sistema RadioRA 3 admite hasta 4 procesadores, con hasta 200 dispositivos Clear Connect Type X o 190 Type A. Los alcances y la ubicación de los dispositivos se definen en el diseño del proyecto.",
      },
    ],
    relatedSolutionHref: "/servicios/iluminacion",
    relatedSolutionLabel: "Iluminación & Automatización",
  },
];
