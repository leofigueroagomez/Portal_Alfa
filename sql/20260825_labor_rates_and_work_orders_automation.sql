-- Migration: 20260825_labor_rates_and_work_orders_automation.sql
-- Tabulador oficial de Mano de Obra para Subcontratistas y Automatización de Órdenes de Trabajo por Especialidad

-- 1. Mejorar labor_activity_catalog
ALTER TABLE public.labor_activity_catalog
ADD COLUMN IF NOT EXISTS subcontractor_unit_cost_mxn NUMERIC(14,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Mejorar work_orders
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS work_order_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS execution_type TEXT DEFAULT 'subcontractor',
ADD COLUMN IF NOT EXISTS budgeted_labor_amount_mxn NUMERIC(14,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS contractor_amount_mxn NUMERIC(14,2) DEFAULT 0.00;

-- 3. Mejorar work_order_activities
ALTER TABLE public.work_order_activities
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pieza',
ADD COLUMN IF NOT EXISTS unit_cost_mxn NUMERIC(14,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_cost_mxn NUMERIC(14,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS unit_sale_price_mxn NUMERIC(14,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_sale_price_mxn NUMERIC(14,2) DEFAULT 0.00;

CREATE UNIQUE INDEX IF NOT EXISTS idx_labor_activity_catalog_name ON public.labor_activity_catalog(name);

-- 4. Sembrar Tabulador Oficial de Mano de Obra ALFA IT
INSERT INTO public.labor_activity_catalog (name, description, default_unit, default_internal_cost_mxn, subcontractor_unit_cost_mxn, default_sale_price_mxn, category, is_active, sort_order)
VALUES
    (
        'Cableado de punto A a punto B',
        'Tirada de cableado estructurado UTP Cat6, cable de audio o bus de control desde nodo central/rack hasta punto final.',
        'punto',
        300.00,
        300.00,
        600.00,
        'cableado',
        true,
        10
    ),
    (
        'Instalación de equipo con taquetes',
        'Fijación mecánica de equipo, cámara, soporte o gabinete sobre muro de concreto/tabique con taquetes y tornillería.',
        'equipo',
        150.00,
        150.00,
        300.00,
        'instalacion',
        true,
        20
    ),
    (
        'Instalación de equipos con cinta doble cara',
        'Montaje superficial limpio de sensores inalámbricos, interfaces ligeras o canaletas con adhesivo industrial 3M.',
        'equipo',
        50.00,
        50.00,
        100.00,
        'instalacion',
        true,
        30
    ),
    (
        'Instalación de dispositivo de control de iluminación Lutron',
        'Conexión eléctrica, chalupa y montaje de dimmer, switch, teclado Pico o módulo Lutron Caseta / RA2 / HomeWorks.',
        'dispositivo',
        100.00,
        100.00,
        250.00,
        'instalacion',
        true,
        40
    ),
    (
        'Configuración de conmutador y conmutación de red',
        'Configuración de switches administrables, VLANs, enlace de fibra, QoS y conmutador VoIP/PBX.',
        'servicio',
        700.00,
        700.00,
        1500.00,
        'configuracion',
        true,
        50
    ),
    (
        'Instalación de cámara IP / Domo exterior',
        'Montaje, fijación, ponchado de conector RJ45, sellado contra intemperie y direccionamiento físico de cámara.',
        'equipo',
        200.00,
        200.00,
        400.00,
        'instalacion',
        true,
        60
    ),
    (
        'Instalación de bocina de plafón / muro',
        'Corte en plafón con plantilla, tendido de cable de seguridad, conexión y ajuste de rejilla magnética.',
        'equipo',
        200.00,
        200.00,
        450.00,
        'instalacion',
        true,
        70
    ),
    (
        'Configuración de NVR y visualización remota',
        'Programación de grabador NVR, analíticas de cruce de línea, almacenamiento en disco y app móvil para cliente.',
        'servicio',
        500.00,
        500.00,
        1200.00,
        'configuracion',
        true,
        80
    ),
    (
        'Puesta en marcha y programación de escenas',
        'Integración maestro de controladores, calibración de escenas de iluminación, audio multiroom y pruebas con cliente.',
        'servicio',
        1000.00,
        1000.00,
        2500.00,
        'configuracion',
        true,
        90
    ),
    (
        'Montaje de pantalla en soporte articulado / fijo',
        'Fijación de soporte a muro con taquetes expansivos, anclaje de pantalla hasta 85", nivelación y gestión de cables.',
        'equipo',
        450.00,
        450.00,
        900.00,
        'instalacion',
        true,
        100
    ),
    (
        'Instalación de cerradura inteligente / control de acceso',
        'Montaje mecánico de chapa digital en puerta, conexión de bajo voltaje y enrolamiento de huellas/tarjetas.',
        'equipo',
        350.00,
        350.00,
        800.00,
        'instalacion',
        true,
        110
    )
ON CONFLICT (name) DO UPDATE
SET subcontractor_unit_cost_mxn = EXCLUDED.subcontractor_unit_cost_mxn,
    default_internal_cost_mxn = EXCLUDED.default_internal_cost_mxn,
    default_sale_price_mxn = EXCLUDED.default_sale_price_mxn,
    category = EXCLUDED.category,
    default_unit = EXCLUDED.default_unit,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;
