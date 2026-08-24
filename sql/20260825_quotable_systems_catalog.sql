-- Migration: 20260825_quotable_systems_catalog.sql
-- Homologated Catalog of Quotable Systems / Technical Disciplines for ALFA OS

CREATE TABLE IF NOT EXISTS public.quotable_systems (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    description TEXT,
    default_prerequisites TEXT,
    default_exclusions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotable_systems_active_sort ON public.quotable_systems(is_active, sort_order, name);

-- RLS Policies
ALTER TABLE public.quotable_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read quotable_systems for authenticated and anon"
ON public.quotable_systems FOR SELECT
TO authenticated, anon, public
USING (true);

CREATE POLICY "Allow staff to manage quotable_systems"
ON public.quotable_systems FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Semilla de Sistemas Homologados ALFA IT
INSERT INTO public.quotable_systems (name, code, description, default_prerequisites, default_exclusions, sort_order)
VALUES
    (
        'Audio Distribuido y Alta Fidelidad',
        'audio',
        'Sistemas de sonorización multizona, amplificación, bocinas arquitectónicas y alta fidelidad.',
        'Canalización para cable de bocina calibre 14/16 AWG y acometida eléctrica para rack central.',
        'Resanes, pintura y obra civil para perforación de plafones.',
        10
    ),
    (
        'Videovigilancia y CCTV',
        'cctv',
        'Cámaras de seguridad IP, domos, NVRs, analítica de video y almacenamiento local/nube.',
        'Puntos de red Cat6 dedicados en cada ubicación de cámara y acometida eléctrica aterrizada para el NVR.',
        'Canalizaciones exteriores ocultas en muros de concreto no previstos.',
        20
    ),
    (
        'Redes, Cableado Estructurado y WiFi',
        'networks',
        'Infraestructura de red empresarial, switches PoE, routers de alta capacidad y Access Points WiFi 6/7.',
        'Módem de proveedor de Internet (ISP) entregado y activo con servicio de banda ancha.',
        'Gestión de contratos con proveedores de telecomunicaciones.',
        30
    ),
    (
        'Control de Iluminación Arquitectónica',
        'lighting',
        'Sistemas centralizados o inalámbricos de control y atenuación de circuitos de iluminación (Lutron / Caseta / HomeWorks / RA2).',
        'Neutro en todas las chalupas/cajas de registro y tableros eléctricos identificados por circuito.',
        'Suministro de luminarias y focos LED (a cargo del proveedor de iluminación).',
        40
    ),
    (
        'Persianas y Cortinas Motorizadas',
        'blinds',
        'Automatización y motorización de persianas enrollables, blackout, sheer elegance y cortineros.',
        'Alimentación eléctrica a 110V/24V en el extremo correspondiente de cada ventana conforme a plano.',
        'Cajillos o modificaciones a tablarroca para empotre de cortineros.',
        50
    ),
    (
        'Video, Cine en Casa y Entretenimiento',
        'video',
        'Pantallas 4K/8K, proyectores, pantallas de proyección retráctiles, receptores AV y distribución HDMI/AVoIP.',
        'Refuerzos en muro/plafón para soporte de pantallas pesadas o proyectores y canalización HDMI/red.',
        'Fabricación de muebles a medida o paneles acústicos decorativos.',
        60
    ),
    (
        'Control de Accesos e Intercomunicación',
        'access_control',
        'Chapas inteligentes, videoporteros IP, lectores biométricos, tarjetas de proximidad y teclados.',
        'Preparación para cerradura en carpintería/aluminio y cableado de bajo voltaje a la puerta.',
        'Modificaciones físicas de herrería o puertas blindadas.',
        70
    ),
    (
        'Automatización e Integración Centralizada',
        'automation',
        'Controladores maestros, pantallas táctiles de pared, interfaces de integración y escenas inteligentes.',
        'Infraestructura de red de alta estabilidad y comunicación entre todos los subsistemas.',
        'Programación de dispositivos de terceros no compatibles con protocolo oficial.',
        80
    ),
    (
        'Energía y Respaldo (UPS / Acondicionamiento)',
        'ups',
        'Sistemas de alimentación ininterrumpida (UPS), reguladores de voltaje y supresores de picos grado industrial.',
        'Tierra física real menor a 5 ohms y circuito eléctrico dedicado para el centro de carga.',
        'Instalación de generadores o plantas de luz de combustión.',
        90
    ),
    (
        'Acondicionamiento Acústico y Confort',
        'acoustics',
        'Paneles acústicos absorbentes, difusores, trampas de graves y aislamiento sonoro para salas y auditorios.',
        'Espacio libre de humedad y muros terminados para montaje de paneles.',
        'Obras de albañilería pesada para insonorización estructural.',
        100
    )
ON CONFLICT (name) DO NOTHING;
