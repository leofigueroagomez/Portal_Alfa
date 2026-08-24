-- Migration: 20260825_suppliers_catalog.sql
-- Homologated Catalog of Suppliers & Purchasing / Negotiation Analytics for ALFA OS

CREATE TABLE IF NOT EXISTS public.suppliers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    legal_business_name TEXT,
    rfc TEXT,
    account_number TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_position TEXT,
    website_url TEXT,
    credit_days INTEGER NOT NULL DEFAULT 0,
    credit_limit_mxn NUMERIC(14,2) DEFAULT 0.00,
    discount_terms_notes TEXT,
    address TEXT,
    brands_distributed TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_active_sort ON public.suppliers(is_active, sort_order, name);

-- RLS Policies
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read suppliers for all"
ON public.suppliers FOR SELECT
TO authenticated, anon, public
USING (true);

CREATE POLICY "Allow staff to manage suppliers"
ON public.suppliers FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Agregar supplier_id a la tabla products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products(supplier_id);

-- Semilla de Proveedores Homologados
INSERT INTO public.suppliers (name, legal_business_name, rfc, account_number, contact_name, contact_email, contact_phone, contact_position, website_url, credit_days, discount_terms_notes, brands_distributed, sort_order)
VALUES
    (
        'Syscom',
        'Sistemas y Servicios de Comunicación S.A. de C.V.',
        'SSC840502XXX',
        'ALFA-SYS-01',
        'Ejecutivo de Cuenta Mayorista',
        'ventas@syscom.mx',
        '+52 614 415 2525',
        'Asesor Comercial Mayorista',
        'https://www.syscom.mx',
        30,
        'Descuento distribuidor Oro por volumen acumulado. Envío gratis en pedidos consolidados.',
        ARRAY['Hikvision', 'Ubiquiti', 'Ruijie', 'Epcom', 'AccessPro', 'Mimosa', 'Mean Well'],
        10
    ),
    (
        'TVC en Línea',
        'TVC en Línea México S.A. de C.V.',
        'TVC990101XXX',
        'ALFA-TVC-02',
        'Asesor Mayorista CCTV',
        'ventas@tvc.mx',
        '+52 55 5000 5000',
        'Ejecutivo de Ventas Mayorista',
        'https://www.tvc.mx',
        15,
        'Línea de crédito comercial y entrega local en sucursal Guadalajara.',
        ARRAY['Dahua', 'Ezviz', 'Western Digital', 'Provision-ISR', 'ZKTeco', 'Saxxon'],
        20
    ),
    (
        'Tecso',
        'Tecnología y Soluciones de Audio S.A. de C.V.',
        'TEC050505XXX',
        'ALFA-TEC-03',
        'Gerente de Cuentas Residenciales',
        'info@tecso.com.mx',
        '+52 55 5095 4000',
        'Director Comercial Audio High-End',
        'https://www.tecso.com.mx',
        30,
        'Distribuidor oficial de audio de alta gama y cine en casa.',
        ARRAY['Bowers & Wilkins', 'McIntosh', 'Rotel', 'Marantz', 'Denon', 'AudioQuest'],
        30
    ),
    (
        'Adises',
        'Adises Distribución S.A. de C.V.',
        'ADI080808XXX',
        'ALFA-ADI-04',
        'Ejecutivo de Redes y Telecomunicaciones',
        'contacto@adises.com.mx',
        '+52 33 3810 5050',
        'Asesor Técnico Comercial GDL',
        'https://www.adises.com.mx',
        15,
        'Almacén y recolección inmediata en Guadalajara.',
        ARRAY['Ubiquiti', 'MikroTik', 'TP-Link Omada', 'Grandstream', 'Cambium Networks'],
        40
    ),
    (
        'Lutron México',
        'Lutron Electronics Co.',
        'LUT900101XXX',
        'ALFA-LUT-05',
        'Representante de Canal Residencial',
        'soporte@lutron.com',
        '+52 55 5350 4000',
        'Gerente de Proyectos de Iluminación',
        'https://www.lutron.com/la',
        0,
        'Descuentos directos en Caseta, RA2 Select, HomeWorks y Sivoia.',
        ARRAY['Lutron', 'Caseta', 'RadioRA 2', 'HomeWorks QSX', 'Palladiom', 'Sivoia QS'],
        50
    ),
    (
        'CVA Mayoreo',
        'Comercializadora de Valor Agregado S.A. de C.V.',
        'CVA990909XXX',
        'ALFA-CVA-06',
        'Ejecutivo TI y Servidores',
        'ventas@grupocva.com',
        '+52 33 3812 1413',
        'Asesor Corporativo GDL',
        'https://www.grupocva.com',
        30,
        'Mayoreo de equipo de cómputo, racks, servidores, switches y UPS.',
        ARRAY['APC', 'Tripp Lite', 'Cisco', 'Dell', 'HP Enterprise', 'CyberPower'],
        60
    ),
    (
        'Ecozza',
        'Ecozza Iluminación y Motores',
        'ECO121212XXX',
        'ALFA-ECO-07',
        'Asesor Comercial Persianas',
        'ventas@ecozza.com',
        '+52 33 1234 5678',
        'Ejecutivo de Motores y Automatización',
        'https://www.ecozza.com',
        0,
        'Suministro de motores tubulares, rieles motorizados y telas.',
        ARRAY['Somfy', 'Dooya', 'A-OK', 'Ecozza Motores'],
        70
    ),
    (
        'Construlita',
        'Construlita Lighting International S.A. de C.V.',
        'CON850505XXX',
        'ALFA-CON-08',
        'Asesor Técnico de Iluminación',
        'contacto@construlita.com',
        '+52 800 005 8500',
        'Especialista en Proyectos Arquitectónicos',
        'https://www.construlita.com',
        30,
        'Luminarias LED arquitectónicas y rieles magnéticos.',
        ARRAY['Construlita', 'Tecnolite Arquitectónico'],
        80
    ),
    (
        'Panduit México',
        'Panduit México S. de R.L. de C.V.',
        'PAN950101XXX',
        'ALFA-PAN-09',
        'Especialista de Conectividad',
        'info@panduit.com',
        '+52 33 3666 4000',
        'Ingeniero de Soluciones de Infraestructura',
        'https://www.panduit.com',
        30,
        'Cableado estructurado Cat6/6A, fibra óptica, jacks, patch panels y gabinetes.',
        ARRAY['Panduit', 'NetKey', 'Pan-Net'],
        90
    ),
    (
        'Amazon México',
        'Amazon México S. de R.L. de C.V.',
        'AME140414XXX',
        'ALFA-AMZ-10',
        'Amazon Business Directo',
        'business@amazon.com.mx',
        '+52 800 874 8725',
        'Compras Digitales Business',
        'https://www.amazon.com.mx',
        0,
        'Compras de entrega express al día siguiente con factura CFDI.',
        ARRAY['Herramientas', 'Accesorios de Audio', 'Cables Auxiliares', 'Adaptadores'],
        100
    )
ON CONFLICT (name) DO NOTHING;

-- Migración automática: Asociar los productos existentes con su proveedor homologado
UPDATE public.products p
SET supplier_id = s.id,
    supplier = s.name
FROM public.suppliers s
WHERE (
    LOWER(TRIM(p.supplier)) = LOWER(s.name)
    OR (LOWER(p.supplier) LIKE '%syscom%' AND s.name = 'Syscom')
    OR (LOWER(p.supplier) LIKE '%tvc%' AND s.name = 'TVC en Línea')
    OR (LOWER(p.supplier) LIKE '%tecso%' AND s.name = 'Tecso')
    OR (LOWER(p.supplier) LIKE '%adises%' AND s.name = 'Adises')
    OR (LOWER(p.supplier) LIKE '%lutron%' AND s.name = 'Lutron México')
    OR (LOWER(p.supplier) LIKE '%cva%' AND s.name = 'CVA Mayoreo')
    OR (LOWER(p.supplier) LIKE '%ecozza%' AND s.name = 'Ecozza')
    OR (LOWER(p.supplier) LIKE '%construlita%' AND s.name = 'Construlita')
    OR (LOWER(p.supplier) LIKE '%panduit%' AND s.name = 'Panduit México')
    OR (LOWER(p.supplier) LIKE '%amazon%' AND s.name = 'Amazon México')
);
