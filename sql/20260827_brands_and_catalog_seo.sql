-- Migration: 20260827_brands_and_catalog_seo.sql
-- Homologated Brands Catalog, Product SEO Enhancements & Lutron Seed Data for ALFA OS

-- 1. Tabla de Marcas Oficiales (Brands)
CREATE TABLE IF NOT EXISTS public.brands (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    tagline TEXT,
    description TEXT,
    logo_url TEXT,
    hero_image_url TEXT,
    website_url TEXT,
    origin_country TEXT,
    focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
    authorized_partner_tier TEXT,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_slug ON public.brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_active_sort ON public.brands(is_active, sort_order, name);

-- RLS para Brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read brands for all" ON public.brands;
CREATE POLICY "Allow read brands for all"
ON public.brands FOR SELECT
TO authenticated, anon, public
USING (is_active = true);

DROP POLICY IF EXISTS "Allow staff to manage brands" ON public.brands;
CREATE POLICY "Allow staff to manage brands"
ON public.brands FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Enriquecimiento de la tabla Products para Catálogo y SEO
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS brand_id BIGINT REFERENCES public.brands(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS warranty_years NUMERIC(4,1) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_public_catalog ON public.products(is_public, is_active);

-- 3. Vista Segura de Catálogo Público (Sanitizada: NO expone cost_price, labor_unit_cost ni márgenes)
CREATE OR REPLACE VIEW public.public_catalog_products AS
SELECT
    p.id,
    p.slug,
    p.brand_id,
    COALESCE(b.name, p.brand) AS brand_name,
    COALESCE(b.slug, LOWER(REGEXP_REPLACE(p.brand, '[^a-zA-Z0-9]+', '-', 'g'))) AS brand_slug,
    b.logo_url AS brand_logo_url,
    b.authorized_partner_tier AS brand_partner_tier,
    p.model,
    p.name,
    p.sku,
    p.short_description,
    p.description,
    p.category,
    p.category_id,
    p.image_url,
    p.specifications,
    p.highlights,
    p.warranty_years,
    p.is_favorite,
    p.is_public,
    p.is_active,
    p.seo_title,
    p.seo_description,
    p.seo_keywords,
    p.created_at,
    p.updated_at
FROM public.products p
LEFT JOIN public.brands b ON p.brand_id = b.id OR LOWER(p.brand) = LOWER(b.name)
WHERE p.is_active = true AND p.is_public = true;

-- Permisos de lectura en la vista
GRANT SELECT ON public.public_catalog_products TO anon, authenticated, public;

-- 4. Semilla de Marca: LUTRON
INSERT INTO public.brands (
    name,
    slug,
    tagline,
    description,
    logo_url,
    hero_image_url,
    website_url,
    origin_country,
    focus_areas,
    authorized_partner_tier,
    seo_title,
    seo_description,
    seo_keywords,
    is_active,
    sort_order
)
VALUES (
    'Lutron',
    'lutron',
    'Control de Iluminación Arquitectónica y Persianas Motorizadas de Lujo',
    'Líder mundial indiscutible en sistemas de control de iluminación residencial y comercial. Creadores del primer dimmer de estado sólido y referentes absolutos en botoneras de autor (Palladiom, Alisse), sombreado automatizado silencioso y ecosistemas de confort visual como Ketra.',
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
    'https://www.lutron.com',
    'Estados Unidos',
    ARRAY['Control de Iluminación', 'Persianas Motorizadas', 'Botoneras de Lujo', 'Iluminación Natural Ketra', 'Sistemas HomeWorks QSX'],
    'Distribuidor e Integrador Especialista Certificado',
    'Lutron México | Control de Iluminación y Persianas de Lujo | ALFA',
    'Diseño e integración oficial de sistemas Lutron en México. HomeWorks QSX, RadioRA 3, botoneras Palladiom y persianas motorizadas con garantía y soporte de ingeniería ALFA.',
    ARRAY['Lutron Mexico', 'Lutron distribuidor', 'Lutron Palladiom', 'Lutron HomeWorks', 'Lutron RadioRA 3', 'Persianas Lutron', 'Lutron Zapopan Guadalajara'],
    true,
    1
)
ON CONFLICT (slug) DO UPDATE SET
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    focus_areas = EXCLUDED.focus_areas,
    authorized_partner_tier = EXCLUDED.authorized_partner_tier,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

-- 5. Semilla de Productos Flagship de LUTRON
DO $$
DECLARE
    lutron_brand_id BIGINT;
    iluminacion_cat_id BIGINT;
BEGIN
    SELECT id INTO lutron_brand_id FROM public.brands WHERE slug = 'lutron' LIMIT 1;
    SELECT id INTO iluminacion_cat_id FROM public.product_categories WHERE name ILIKE '%iluminac%' OR name ILIKE '%control%' LIMIT 1;

    -- Producto 1: Lutron Palladiom Keypad
    INSERT INTO public.products (
        sku,
        brand,
        brand_id,
        model,
        name,
        slug,
        category,
        category_id,
        short_description,
        description,
        image_url,
        specifications,
        highlights,
        warranty_years,
        cost_price,
        cost_currency,
        pricing_method,
        target_margin,
        calculated_sale_price,
        sale_currency,
        labor_unit_cost,
        labor_sale_multiplier,
        labor_unit_sale_price,
        is_favorite,
        is_public,
        is_active,
        seo_title,
        seo_description,
        seo_keywords
    )
    VALUES (
        'LUT-HQ-PALLADIOM-4B',
        'Lutron',
        lutron_brand_id,
        'Palladiom Keypad',
        'Botonera Arquitectónica Lutron Palladiom (HomeWorks QSX)',
        'lutron-palladiom-keypad',
        'Control e Iluminación',
        iluminacion_cat_id,
        'Botonera de pared arquitectónica al ras de muro con botones retroiluminados y acabados metálicos macizos.',
        'Las botoneras Lutron Palladiom representan la cúspide del diseño estético en control residencial. Con una estética completamente al ras de la pared, botones de pulsación precisa y retroiluminación dinámica que se ajusta a la luz ambiental, Palladiom transforma la interacción diaria con la iluminación y las persianas en una experiencia de puro lujo.',
        'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=80',
        '{
            "protocolo": "Lutron QS Link / HomeWorks QSX",
            "alimentacion": "24-36 VDC (Bajo voltaje clase 2)",
            "acabados_disponibles": "Latón satinado, Níquel satinado, Negro anodizado, Blanco satinado, Cristal claro",
            "configuracion_botones": "2, 3 o 4 botones con grabado retroiluminado personalizado",
            "sensores_integrados": "Sensor de luz ambiental dinámico para ajuste de brillo de texto",
            "compatibilidad": "Lutron HomeWorks QSX"
        }'::jsonb,
        ARRAY[
            'Diseño minimalista ultra plano con instalación al ras de muro',
            'Grabado láser de alta precisión con retroiluminación inteligente',
            'Materiales genuinos: metales arquitectónicos maquinados y cristal templado',
            'Integración completa con escenas de iluminación, persianas y audio'
        ],
        5.0,
        320.00,
        'USD',
        'target_margin',
        35.0,
        492.30,
        'USD',
        600.00,
        2.0,
        1200.00,
        true,
        true,
        true,
        'Lutron Palladiom Keypad | Botoneras de Lujo México | ALFA',
        'Cotiza la botonera arquitectónica Lutron Palladiom para HomeWorks QSX. Acabados en latón, níquel y cristal con instalación e integración certificada en México por ALFA.',
        ARRAY['Lutron Palladiom', 'Lutron Palladiom precio Mexico', 'Botonera Lutron', 'Lutron Palladiom keypad', 'HomeWorks QSX Palladiom']
    )
    ON CONFLICT (sku) DO UPDATE SET
        slug = EXCLUDED.slug,
        brand_id = EXCLUDED.brand_id,
        name = EXCLUDED.name,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        specifications = EXCLUDED.specifications,
        highlights = EXCLUDED.highlights,
        warranty_years = EXCLUDED.warranty_years,
        is_public = EXCLUDED.is_public,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW();

    -- Producto 2: Lutron Palladiom Wire-Free Blinds
    INSERT INTO public.products (
        sku,
        brand,
        brand_id,
        model,
        name,
        slug,
        category,
        category_id,
        short_description,
        description,
        image_url,
        specifications,
        highlights,
        warranty_years,
        cost_price,
        cost_currency,
        pricing_method,
        target_margin,
        calculated_sale_price,
        sale_currency,
        labor_unit_cost,
        labor_sale_multiplier,
        labor_unit_sale_price,
        is_favorite,
        is_public,
        is_active,
        seo_title,
        seo_description,
        seo_keywords
    )
    VALUES (
        'LUT-PALLADIOM-SHADE',
        'Lutron',
        lutron_brand_id,
        'Palladiom Wire-Free Shades',
        'Persianas Motorizadas Lutron Palladiom Wire-Free',
        'lutron-palladiom-wire-free-shades',
        'Persianas y Sombreado',
        iluminacion_cat_id,
        'Persianas enrollables arquitectónicas motorizadas ultra silenciosas con soportes de metal expuesto sin cables.',
        'Las persianas Lutron Palladiom Wire-Free combinan una ingeniería mecánica magistral con una estética arquitectónica sin igual. Diseñadas para ser exhibidas sin galerías ni fascias, cuentan con soportes maquinados en aluminio macizo y un motor ultra silencioso que opera con baterías estándar de hasta 3 a 5 años de vida útil.',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
        '{
            "mecanismo": "Motor ultra silencioso con emisión menor a 35 dBA",
            "alimentacion": "Baterías D alcalinas (3-5 años de autonomía) o cableado centralizado 24-36V",
            "acabados_soportes": "Níquel satinado, Latón satinado, Negro puro, Blanco puro, Aluminio claro",
            "alineacion": "Tecnología HEMIS para sincronización milimétrica entre múltiples persianas",
            "telas": "Colección Lutron Palladiom: Blackout, Screen solar (1%, 3%, 5%) y decorativas",
            "comunicacion": "RF Clear Connect Type A / Type X"
        }'::jsonb,
        ARRAY[
            'Soportes arquitectónicos maquinados para montaje directo y visible de alto impacto visual',
            'Operación casi inaudible que no interrumpe el descanso ni las conversaciones',
            'Alineación simétrica inteligente entre todas las ventanas de la habitación',
            'Telas exclusivas de diseñador con máxima protección contra rayos UV'
        ],
        8.0,
        750.00,
        'USD',
        'target_margin',
        35.0,
        1153.84,
        'USD',
        1000.00,
        2.0,
        2000.00,
        true,
        true,
        true,
        'Persianas Motorizadas Lutron Palladiom | Distribuidor México | ALFA',
        'Suministro, especificación e instalación de persianas Lutron Palladiom Wire-Free en México. Soportes de autor y telas de diseñador con motorización ultra silenciosa.',
        ARRAY['Persianas Lutron Palladiom', 'Lutron shades Mexico', 'Persianas motorizadas silenciosas', 'Lutron Palladiom Wire Free', 'Lutron persianas Zapopan']
    )
    ON CONFLICT (sku) DO UPDATE SET
        slug = EXCLUDED.slug,
        brand_id = EXCLUDED.brand_id,
        name = EXCLUDED.name,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        specifications = EXCLUDED.specifications,
        highlights = EXCLUDED.highlights,
        warranty_years = EXCLUDED.warranty_years,
        is_public = EXCLUDED.is_public,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW();

    -- Producto 3: Lutron HomeWorks QSX Processor
    INSERT INTO public.products (
        sku,
        brand,
        brand_id,
        model,
        name,
        slug,
        category,
        category_id,
        short_description,
        description,
        image_url,
        specifications,
        highlights,
        warranty_years,
        cost_price,
        cost_currency,
        pricing_method,
        target_margin,
        calculated_sale_price,
        sale_currency,
        labor_unit_cost,
        labor_sale_multiplier,
        labor_unit_sale_price,
        is_favorite,
        is_public,
        is_active,
        seo_title,
        seo_description,
        seo_keywords
    )
    VALUES (
        'LUT-HQP7-2-120',
        'Lutron',
        lutron_brand_id,
        'HQP7-2 / HomeWorks QSX',
        'Procesador Central Lutron HomeWorks QSX (2 Enlaces)',
        'lutron-homeworks-qsx-processor',
        'Control e Iluminación',
        iluminacion_cat_id,
        'El cerebro de automatización de iluminación, sombreado y confort para residencias de lujo.',
        'El procesador HomeWorks QSX es el sistema de control central insignia de Lutron para proyectos residenciales de gran escala. Integra procesamiento de alta velocidad, conectividad en la nube con cifrado bancario, control nativo de luminarias Ketra y compatibilidad total con enlaces cableados QS e inalámbricos Clear Connect.',
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=80',
        '{
            "capacidad": "Hasta 512 dispositivos / 2 enlaces configurables QS / QSX",
            "conectividad": "Ethernet gigabit, Clear Connect Type A y Clear Connect Type X nativo",
            "seguridad": "Cifrado TLS de punto a punto y arranque seguro",
            "compatibilidad_luminarias": "Control nativo de iluminación de espectro completo Ketra",
            "integracion_terceros": "Savant, Crestron, Control4, Apple HomeKit, Josh.ai, BACnet"
        }'::jsonb,
        ARRAY[
            'Control centralizado para residencias desde 300 m² hasta grandes fincas y desarrollos',
            'Soporte directo para la tecnología de iluminación natural Ketra',
            'Monitoreo remoto y diagnósticos proactivos a través de ALFA OS',
            'Integración perfecta con sistemas de audio, video y seguridad'
        ],
        5.0,
        1450.00,
        'USD',
        'target_margin',
        30.0,
        2071.42,
        'USD',
        2500.00,
        2.0,
        5000.00,
        true,
        true,
        true,
        'Lutron HomeWorks QSX Processor | Ingeniería y Programación México | ALFA',
        'Especialistas en ingeniería, cálculo de tableros y comisionamiento de procesadores Lutron HomeWorks QSX en México. Respaldo técnico de por vida.',
        ARRAY['Lutron HomeWorks QSX', 'Procesador HomeWorks Lutron', 'Lutron HQP7 2', 'HomeWorks Mexico', 'Integrador Lutron certificado']
    )
    ON CONFLICT (sku) DO UPDATE SET
        slug = EXCLUDED.slug,
        brand_id = EXCLUDED.brand_id,
        name = EXCLUDED.name,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        specifications = EXCLUDED.specifications,
        highlights = EXCLUDED.highlights,
        warranty_years = EXCLUDED.warranty_years,
        is_public = EXCLUDED.is_public,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW();

    -- Producto 4: Lutron RadioRA 3 Processor
    INSERT INTO public.products (
        sku,
        brand,
        brand_id,
        model,
        name,
        slug,
        category,
        category_id,
        short_description,
        description,
        image_url,
        specifications,
        highlights,
        warranty_years,
        cost_price,
        cost_currency,
        pricing_method,
        target_margin,
        calculated_sale_price,
        sale_currency,
        labor_unit_cost,
        labor_sale_multiplier,
        labor_unit_sale_price,
        is_favorite,
        is_public,
        is_active,
        seo_title,
        seo_description,
        seo_keywords
    )
    VALUES (
        'LUT-RR-PROC3-KIT',
        'Lutron',
        lutron_brand_id,
        'RadioRA 3 Processor',
        'Procesador Todo-en-Uno Lutron RadioRA 3 PoE',
        'lutron-radiora3-processor',
        'Control e Iluminación',
        iluminacion_cat_id,
        'Sistema inalámbrico de control de iluminación y persianas para proyectos residenciales y renovaciones.',
        'Lutron RadioRA 3 es la solución de control inalámbrico más avanzada del mercado para residencias y renovaciones de alto nivel. Al combinar la probada tecnología Clear Connect Type A con la nueva banda Clear Connect Type X, permite controlar hasta 200 dispositivos con una instalación limpia alimentada por PoE.',
        'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=80',
        '{
            "capacidad_dispositivos": "Hasta 200 dispositivos (100 Type A + 100 Type X)",
            "cobertura_rf": "Hasta 230 m² por procesador (expandible con procesadores adicionales)",
            "alimentacion": "PoE (Power over Ethernet 802.3af) o adaptador USB-C",
            "protocolo": "Clear Connect Type A (434 MHz) y Clear Connect Type X (2.4 GHz)",
            "compatibilidad_dispositivos": "Dimmers y botoneras Sunnata, persianas Triathlon/Palladiom, sensores Pico"
        }'::jsonb,
        ARRAY[
            'Ideal tanto para obras nuevas como para residencias terminadas sin cableado especial',
            'Alimentación centralizada por cable de red PoE',
            'Configuración rápida y control remoto desde la aplicación Lutron Connect',
            'Compatibilidad con asistentes de voz y sistemas domóticos mayores'
        ],
        5.0,
        480.00,
        'USD',
        'target_margin',
        30.0,
        685.71,
        'USD',
        1200.00,
        2.0,
        2400.00,
        true,
        true,
        true,
        'Lutron RadioRA 3 Procesador | Automatización Residencial México | ALFA',
        'Adquiere y cotiza el procesador Lutron RadioRA 3 en México. Automatiza tu casa con dimmers Sunnata y persianas sin necesidad de ranurar muros.',
        ARRAY['Lutron RadioRA 3', 'RadioRA 3 procesador', 'Lutron RadioRA 3 Mexico', 'Lutron Sunnata RadioRA 3']
    )
    ON CONFLICT (sku) DO UPDATE SET
        slug = EXCLUDED.slug,
        brand_id = EXCLUDED.brand_id,
        name = EXCLUDED.name,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        specifications = EXCLUDED.specifications,
        highlights = EXCLUDED.highlights,
        warranty_years = EXCLUDED.warranty_years,
        is_public = EXCLUDED.is_public,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW();

    -- Producto 5: Lutron Sunnata Smart Dimmer
    INSERT INTO public.products (
        sku,
        brand,
        brand_id,
        model,
        name,
        slug,
        category,
        category_id,
        short_description,
        description,
        image_url,
        specifications,
        highlights,
        warranty_years,
        cost_price,
        cost_currency,
        pricing_method,
        target_margin,
        calculated_sale_price,
        sale_currency,
        labor_unit_cost,
        labor_sale_multiplier,
        labor_unit_sale_price,
        is_favorite,
        is_public,
        is_active,
        seo_title,
        seo_description,
        seo_keywords
    )
    VALUES (
        'LUT-RRST-PRO-N',
        'Lutron',
        lutron_brand_id,
        'Sunnata RF Dimmer (PRO-N)',
        'Atenuador Inteligente Lutron Sunnata RF con Barra Táctil',
        'lutron-sunnata-rf-dimmer',
        'Control e Iluminación',
        iluminacion_cat_id,
        'Atenuador contemporáneo con barra táctil iluminada e ingeniería RTISS para control LED perfecto.',
        'La línea Lutron Sunnata reinventa el control táctil tradicional. Con su elegante barra de luz LED interactiva, permite deslizar suavemente el dedo o presionar en cualquier punto para ajustar el nivel lumínico con precisión quirúrgica y sin parpadeos.',
        'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=80',
        '{
            "carga_maxima": "250W LED regulable / 500W Incandescente/Halógeno / 400VA ELV",
            "conexion": "Requiere neutro para estabilidad total",
            "tecnologia_rf": "Clear Connect Type X (2.4 GHz)",
            "tecnologia_atenuacion": "RTISS (Real-Time Illumination Stability System)",
            "acabados": "Blanco, Negro, Marfil, Almendra claro, Nieve y acabados satinados de autor"
        }'::jsonb,
        ARRAY[
            'Barra de luz LED táctil interactiva que indica el nivel exacto de luz',
            'Control de atenuación suave y continuo sin ningún tipo de parpadeo o zumbido en LED',
            'Botón de favoritos para volver a tu escena lumínica preferida con un toque',
            'Diseño de vanguardia que sustituye apagadores estándar sin obra civil'
        ],
        3.0,
        145.00,
        'USD',
        'target_margin',
        30.0,
        207.14,
        'USD',
        300.00,
        2.0,
        600.00,
        true,
        true,
        true,
        'Lutron Sunnata RF Dimmer | Apagador Inteligente México | ALFA',
        'Cotiza dimmers táctiles Lutron Sunnata para RadioRA 3 y HomeWorks en México. La mejor experiencia táctil y estética para iluminación LED residencial.',
        ARRAY['Lutron Sunnata', 'Lutron Sunnata dimmer', 'Lutron Sunnata Mexico', 'Apagador touch Lutron', 'Atenuador LED Lutron']
    )
    ON CONFLICT (sku) DO UPDATE SET
        slug = EXCLUDED.slug,
        brand_id = EXCLUDED.brand_id,
        name = EXCLUDED.name,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        specifications = EXCLUDED.specifications,
        highlights = EXCLUDED.highlights,
        warranty_years = EXCLUDED.warranty_years,
        is_public = EXCLUDED.is_public,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW();

    -- Producto 6: Lutron Alisse Signature Wall Control
    INSERT INTO public.products (
        sku,
        brand,
        brand_id,
        model,
        name,
        slug,
        category,
        category_id,
        short_description,
        description,
        image_url,
        specifications,
        highlights,
        warranty_years,
        cost_price,
        cost_currency,
        pricing_method,
        target_margin,
        calculated_sale_price,
        sale_currency,
        labor_unit_cost,
        labor_sale_multiplier,
        labor_unit_sale_price,
        is_favorite,
        is_public,
        is_active,
        seo_title,
        seo_description,
        seo_keywords
    )
    VALUES (
        'LUT-HW-ALISSE',
        'Lutron',
        lutron_brand_id,
        'Alisse Wall Control',
        'Botonera de Autor Lutron Alisse en Latón Macizo (HomeWorks)',
        'lutron-alisse-wall-control',
        'Control e Iluminación',
        iluminacion_cat_id,
        'Botonera artesanal de lujo maquinada en latón macizo con acabados de alta costura arquitectónica.',
        'Lutron Alisse es la máxima joya en botoneras de iluminación para residencias exclusivas. Cada placa es maquinada a partir de latón sólido y terminada a mano con pátinas auténticas que envejecen con nobleza, ofreciendo composiciones de botones redondos con retroiluminación sutil de halo.',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
        '{
            "material": "Latón sólido maquinado y terminado a mano",
            "coleccion_acabados": "Aged Bronze, Aged Brass, Brushed Brass, Satin Nickel, Matte Black, Bright Chrome",
            "configuracion": "Columnas de 1, 2 o 3 módulos con combinaciones de 1 a 3 botones por columna",
            "iluminacion_botones": "Halo de luz LED perimetral suave de baja intensidad",
            "compatibilidad": "Exclusivo para sistemas Lutron HomeWorks QSX"
        }'::jsonb,
        ARRAY[
            'La botonera más exclusiva y sofisticada en el mundo de la iluminación arquitectónica',
            'Acabados en metales preciosos seleccionados por los despachos de diseño más prestigiosos',
            'Grabado de texto o iconos milimétrico con iluminación nocturna discreta',
            'Instalación impecable con placas de fijación magnética oculta'
        ],
        5.0,
        580.00,
        'USD',
        'target_margin',
        35.0,
        892.30,
        'USD',
        800.00,
        2.0,
        1600.00,
        true,
        true,
        true,
        'Lutron Alisse Wall Control | Botoneras de Autor México | ALFA',
        'Especificación oficial y suministro de botoneras de latón Lutron Alisse para residencias de lujo en México. Asesoría integral de ingeniería ALFA.',
        ARRAY['Lutron Alisse', 'Lutron Alisse Mexico', 'Botonera laton Lutron', 'Lutron Alisse keypad', 'HomeWorks Alisse']
    )
    ON CONFLICT (sku) DO UPDATE SET
        slug = EXCLUDED.slug,
        brand_id = EXCLUDED.brand_id,
        name = EXCLUDED.name,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        specifications = EXCLUDED.specifications,
        highlights = EXCLUDED.highlights,
        warranty_years = EXCLUDED.warranty_years,
        is_public = EXCLUDED.is_public,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW();

    -- Producto 7: Lutron Ketra D3 Architectural Downlight
    INSERT INTO public.products (
        sku,
        brand,
        brand_id,
        model,
        name,
        slug,
        category,
        category_id,
        short_description,
        description,
        image_url,
        specifications,
        highlights,
        warranty_years,
        cost_price,
        cost_currency,
        pricing_method,
        target_margin,
        calculated_sale_price,
        sale_currency,
        labor_unit_cost,
        labor_sale_multiplier,
        labor_unit_sale_price,
        is_favorite,
        is_public,
        is_active,
        seo_title,
        seo_description,
        seo_keywords
    )
    VALUES (
        'LUT-KETRA-D3',
        'Lutron',
        lutron_brand_id,
        'Ketra D3 Downlight',
        'Luminaria Arquitectónica Circadiana Lutron Ketra D3',
        'lutron-ketra-d3-downlight',
        'Control e Iluminación',
        iluminacion_cat_id,
        'Luminaria empotrada de alta gama con espectro de luz natural circadiana y tecnología de autocalibración TruColor.',
        'Lutron Ketra es la referencia mundial en iluminación arquitectónica con calidad de luz solar. Capaz de emitir un rango dinámico de 1,400K a 10,000K con un índice de reproducción cromática (CRI) de hasta 98, reproduce la luz solar natural a lo largo del día para mejorar el bienestar biológico y resaltar el arte y la arquitectura.',
        'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1000&q=80',
        '{
            "rango_temperatura_color": "1,400K (luz de vela) a 10,000K (cielo azul brillante) + Millones de colores saturados",
            "reproduccion_cromatica": "CRI hasta 98 / R9 hasta 96",
            "atenuacion": "Ultra suave continua de 100% hasta 0.1%",
            "tecnologia_calibracion": "TruColor con sensor óptico interno que recalibra el LED durante 50,000+ horas de uso",
            "opticas": "Ópticas intercambiables de 15°, 25°, 40°, 60° y Wall Wash",
            "control": "Inalámbrico nativo Clear Connect Type X integrado"
        }'::jsonb,
        ARRAY[
            'Sincronización circadiana que acompaña tu reloj biológico natural para mayor energía y mejor descanso',
            'Tecnología TruColor: los colores nunca se degradan ni varían entre diferentes luminarias con los años',
            'Atenuación hasta 0.1% sin saltos ni zumbidos',
            'Diseñada para destacar obras de arte, texturas de madera y acabados arquitectónicos premium'
        ],
        5.0,
        420.00,
        'USD',
        'target_margin',
        30.0,
        600.00,
        'USD',
        450.00,
        2.0,
        900.00,
        true,
        true,
        true,
        'Lutron Ketra D3 | Iluminación Circadiana México | ALFA',
        'Suministro e ingeniería de iluminación de espectro completo Lutron Ketra D3 en México. La luz natural más avanzada del mundo para tu residencia.',
        ARRAY['Lutron Ketra', 'Ketra D3 downlight', 'Lutron Ketra Mexico', 'Iluminacion circadiana Ketra', 'Lutron Ketra precio']
    )
    ON CONFLICT (sku) DO UPDATE SET
        slug = EXCLUDED.slug,
        brand_id = EXCLUDED.brand_id,
        name = EXCLUDED.name,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        specifications = EXCLUDED.specifications,
        highlights = EXCLUDED.highlights,
        warranty_years = EXCLUDED.warranty_years,
        is_public = EXCLUDED.is_public,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW();

    -- Producto 8: Lutron Triathlon Motorized Roller Shades
    INSERT INTO public.products (
        sku,
        brand,
        brand_id,
        model,
        name,
        slug,
        category,
        category_id,
        short_description,
        description,
        image_url,
        specifications,
        highlights,
        warranty_years,
        cost_price,
        cost_currency,
        pricing_method,
        target_margin,
        calculated_sale_price,
        sale_currency,
        labor_unit_cost,
        labor_sale_multiplier,
        labor_unit_sale_price,
        is_favorite,
        is_public,
        is_active,
        seo_title,
        seo_description,
        seo_keywords
    )
    VALUES (
        'LUT-TRIATHLON-ROLLER',
        'Lutron',
        lutron_brand_id,
        'Sivoia QS Triathlon',
        'Persianas Motorizadas a Batería Lutron Sivoia QS Triathlon',
        'lutron-triathlon-motorized-roller-shades',
        'Persianas y Sombreado',
        iluminacion_cat_id,
        'Persianas enrollables motorizadas a batería ultra confiables con autonomía de hasta 5 años.',
        'Lutron Sivoia QS Triathlon es la persiana motorizada a baterías más confiable y avanzada del mundo. Ideal para residencias terminadas, su motor inteligente patentado mantiene una alineación simétrica en todas las ventanas y opera con baterías D estándar con una vida útil de 3 a 5 años.',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
        '{
            "alimentacion": "Baterías alcalinas tipo D (autonomía líder de 3 a 5 años)",
            "nivel_acustico": "Operación ultra silenciosa por debajo de 38 dBA",
            "protocolo": "Clear Connect RF (compatible con Caséta, RadioRA 3 y HomeWorks)",
            "alineacion": "Tecnología HEMIS para sincronización milimétrica entre persianas",
            "opciones_fascia": "Fascia de aluminio anodizado, fascia forrada en tela o soporte expuesto",
            "telas": "Más de 100 telas certificadas Greenguard y libres de PVC"
        }'::jsonb,
        ARRAY[
            'Instalación 100% limpia sin necesidad de romper muros para cablear',
            'Duración de baterías insuperable (hasta 5 años con uso diario)',
            'Control desde botoneras de pared, app móvil, horarios automáticos y voz',
            'Protección solar para tapicería, madera y arte sin perder la vista al exterior'
        ],
        8.0,
        520.00,
        'USD',
        'target_margin',
        30.0,
        742.85,
        'USD',
        800.00,
        2.0,
        1600.00,
        true,
        true,
        true,
        'Persianas Motorizadas Lutron Triathlon | Distribuidor México | ALFA',
        'Cotiza persianas motorizadas Lutron Triathlon a batería en México. Instalación sin cableado, máxima duración y garantía oficial con ALFA.',
        ARRAY['Lutron Triathlon', 'Persianas Lutron Triathlon', 'Persianas a bateria Lutron', 'Lutron shades Mexico', 'Persianas motorizadas Zapopan']
    )
    ON CONFLICT (sku) DO UPDATE SET
        slug = EXCLUDED.slug,
        brand_id = EXCLUDED.brand_id,
        name = EXCLUDED.name,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        specifications = EXCLUDED.specifications,
        highlights = EXCLUDED.highlights,
        warranty_years = EXCLUDED.warranty_years,
        is_public = EXCLUDED.is_public,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW();

END $$;
