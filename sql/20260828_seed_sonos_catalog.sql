-- Migration: 20260828_seed_sonos_catalog.sql
-- Alta de la marca Sonos y su catálogo público (audio, teatro en casa, architectural) para /marcas/sonos
-- NO ejecutar en producción sin confirmar entorno y respaldo (ver AGENTS.md).
-- Requiere: 20260827_brands_and_catalog_seo.sql (tabla public.brands + vista public_catalog_products).

INSERT INTO public.brands (name, slug, tagline, description, logo_url, hero_image_url, website_url, origin_country, focus_areas, authorized_partner_tier, seo_title, seo_description, seo_keywords, is_active, sort_order)
VALUES (
  'Sonos',
  'sonos',
  'Audio inalámbrico multiroom y teatro en casa de alta fidelidad',
  'Referente mundial en audio inalámbrico para el hogar. Barras de sonido con Dolby Atmos (Arc Ultra, Arc, Beam, Ray), bocinas inalámbricas Era, subwoofers, bocinas portátiles Move y Roam, amplificación para bocinas arquitectónicas (Sonos Amp, Port) y la línea Sonos Architectural fabricada por Sonance.',
  '/logos/brands/sonos.png',
  '/projects/residencia-premium.jpeg',
  'https://www.sonos.com',
  'Estados Unidos',
  ARRAY['Teatro en Casa Dolby Atmos', 'Bocinas Inalámbricas Era', 'Audio Multiroom', 'Sonos Architectural', 'Amplificación Sonos Amp'],
  'Distribuidor e Integrador Certificado',
  'Sonos México | Arc, Era, Beam, Sub y Sonos Amp | Distribuidor ALFA',
  'Diseño, suministro e instalación oficial de sistemas Sonos en México: barras de sonido Arc y Beam, bocinas Era, subwoofers, Sonos Amp y bocinas arquitectónicas. Integración multiroom y garantía con ALFA.',
  ARRAY['Sonos Mexico', 'Sonos distribuidor', 'Sonos Arc', 'Sonos Era 300', 'Sonos Amp', 'Sonos Guadalajara', 'Sonos Zapopan'],
  true,
  2
)
ON CONFLICT (slug) DO UPDATE SET
  tagline = EXCLUDED.tagline, description = EXCLUDED.description, focus_areas = EXCLUDED.focus_areas,
  authorized_partner_tier = EXCLUDED.authorized_partner_tier, seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords, updated_at = NOW();

DO $$
DECLARE
  sonos_brand_id BIGINT;
  audio_cat_id BIGINT;
BEGIN
  SELECT id INTO sonos_brand_id FROM public.brands WHERE slug = 'sonos' LIMIT 1;
  SELECT id INTO audio_cat_id FROM public.product_categories WHERE name ILIKE '%audio%' OR name ILIKE '%video%' LIMIT 1;

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'ARCG2US1', 'Sonos', sonos_brand_id, 'Sonos Arc Ultra', 'Sonos Arc Ultra', 'sonos-arc-ultra', 'Teatro en Casa', audio_cat_id,
    'Barra de sonido premium con tecnología Sound Motion y Dolby Atmos para el sistema de teatro en casa más inmersivo de Sonos.',
    'Sonos Arc Ultra le da vida al entretenimiento como ninguna otra barra de sonido. Con la revolucionaria tecnología Sound Motion ofrece diálogos más nítidos, graves más profundos y sonido espacial 9.1.4 con Dolby Atmos que rodea al espectador con precisión desde todas direcciones, en un diseño delgado y elegante. La función avanzada de Mejora de la Voz da control total sobre la claridad de los diálogos. Se instala con un solo cable HDMI y se controla con el control remoto de la TV, la app Sonos o el control por voz. Combina con Sonos Sub y bocinas traseras Era 300 para la experiencia surround Dolby Atmos completa.',
    '/catalog/sonos/arc-ultra.avif',
    '{"Marca": "Sonos", "SKU Oficial": "ARCG2US1", "Categoría": "Teatro en Casa", "Acabados": "Negro, Blanco", "Conectividad": "HDMI eARC, WiFi, Bluetooth, AirPlay 2", "Control": "Control remoto de la TV, app Sonos, controles táctiles, Amazon Alexa", "Canales": "Audio espacial 9.1.4 con Dolby Atmos", "Tecnología": "Sound Motion", "Amplificación": "15 amplificadores clase D", "Woofers": "Doble woofer Sound Motion", "Ideal para": "Salas y home theater de alto nivel", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Arc Ultra | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Arc Ultra con ALFA, integrador oficial Sonos en México. Barra de sonido premium con tecnología Sound Motion y Dolby Atmos para el sistema de teatro en casa más inmersivo de Sonos. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Arc Ultra', 'Sonos Arc Ultra México', 'Sonos Arc Ultra precio', 'Sonos Arc Ultra cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'ARCG1US1', 'Sonos', sonos_brand_id, 'Sonos Arc', 'Sonos Arc', 'sonos-arc', 'Teatro en Casa', audio_cat_id,
    'Barra de sonido inteligente premium con Dolby Atmos para TV, cine, música y videojuegos.',
    'Sonos Arc es la barra de sonido premium de Sonos para quienes quieren cine en casa de referencia. Once amplificadores digitales clase D calibrados a la arquitectura acústica de Arc reproducen un sonido realista y envolvente con Dolby Atmos. La Mejora de la Voz enfatiza las frecuencias de la voz humana para diálogos claros y el Sonido Nocturno modera los efectos fuertes. Funciona con AirPlay 2 y control por voz integrado. Se amplía con Sonos Sub y bocinas traseras para un sistema surround inalámbrico completo.',
    '/catalog/sonos/arc.avif',
    '{"Marca": "Sonos", "SKU Oficial": "ARCG1US1", "Categoría": "Teatro en Casa", "Acabados": "Negro, Blanco", "Conectividad": "HDMI eARC, WiFi, Bluetooth (según región), AirPlay 2", "Control": "Control remoto de la TV, app Sonos, Amazon Alexa, Google Assistant", "Canales": "5.0.2 con Dolby Atmos", "Amplificación": "11 amplificadores clase D", "Drivers": "8 woofers elípticos, 3 tweeters de seda", "Mejora de la voz": "Sí", "Ideal para": "Salas medianas y grandes", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Arc | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Arc con ALFA, integrador oficial Sonos en México. Barra de sonido inteligente premium con Dolby Atmos para TV, cine, música y videojuegos. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Arc', 'Sonos Arc México', 'Sonos Arc precio', 'Sonos Arc cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'BEAM2US1', 'Sonos', sonos_brand_id, 'Sonos Beam (Gen 2)', 'Sonos Beam (Gen 2)', 'sonos-beam-gen-2', 'Teatro en Casa', audio_cat_id,
    'Barra de sonido compacta con Dolby Atmos, ideal para salas medianas y recámaras.',
    'Sonos Beam (Gen 2) mejora todo el entretenimiento con sonido en alta definición y Dolby Atmos en un formato compacto. Ofrece un espacio sonoro amplio y diálogos nítidos para series, películas y juegos, y reproduce música de todos los servicios de streaming. Se controla con la app Sonos, la voz y Apple AirPlay 2, y se amplía con bocinas traseras y Sub para crear un sistema surround inalámbrico.',
    '/catalog/sonos/beam-gen-2.avif',
    '{"Marca": "Sonos", "SKU Oficial": "BEAM2US1", "Categoría": "Teatro en Casa", "Acabados": "Negro, Blanco", "Conectividad": "HDMI eARC, WiFi, AirPlay 2", "Control": "Control remoto de la TV, app Sonos, control por voz", "Canales": "Dolby Atmos virtualizado", "Procesador": "CPU más rápida que la generación anterior", "Drivers": "1 tweeter, 4 woofers, 3 radiadores pasivos", "Tamaño": "Compacta (65.1 cm)", "Ideal para": "Salas de tamaño medio, recámaras", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Beam (Gen 2) | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Beam (Gen 2) con ALFA, integrador oficial Sonos en México. Barra de sonido compacta con Dolby Atmos, ideal para salas medianas y recámaras. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Beam (Gen 2)', 'Sonos Beam (Gen 2) México', 'Sonos Beam (Gen 2) precio', 'Sonos Beam (Gen 2) cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'RAYG1US1', 'Sonos', sonos_brand_id, 'Sonos Ray', 'Sonos Ray', 'sonos-ray', 'Teatro en Casa', audio_cat_id,
    'Barra de sonido compacta de entrada al ecosistema Sonos, con conexión óptica y control sencillo.',
    'Sonos Ray entrega un sonido más nítido y potente de lo esperado en una barra de sonido pequeña. Su acústica dirigida hacia el frente genera un espacio sonoro amplio sin reflejos no deseados, la configuración se hace con solo dos cables y la app Sonos, y reproduce todo el audio de los servicios de streaming por WiFi. Perfecta para recámaras y salas secundarias y para iniciar un sistema multiroom Sonos.',
    '/catalog/sonos/ray.avif',
    '{"Marca": "Sonos", "SKU Oficial": "RAYG1US1", "Categoría": "Teatro en Casa", "Acabados": "Negro, Blanco", "Conectividad": "Entrada óptica digital, WiFi, AirPlay 2", "Control": "App Sonos, control remoto de la TV (programable), Spotify Connect", "Conexión a TV": "Óptica digital (Toslink)", "Drivers": "2 tweeters con guías de onda divididas, 2 woofers", "Diseño": "Frontal, sin micrófonos", "Ideal para": "Recámaras, estudios, salas pequeñas", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Sonos Ray | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Ray con ALFA, integrador oficial Sonos en México. Barra de sonido compacta de entrada al ecosistema Sonos, con conexión óptica y control sencillo. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Ray', 'Sonos Ray México', 'Sonos Ray precio', 'Sonos Ray cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'E30G1US1', 'Sonos', sonos_brand_id, 'Sonos Era 300', 'Sonos Era 300', 'sonos-era-300', 'Bocinas Inalámbricas', audio_cat_id,
    'Bocina inalámbrica con audio espacial Dolby Atmos que coloca al oyente dentro de la música.',
    'Sonos Era 300 tiene un diseño acústico completamente nuevo con seis drivers dispuestos en ángulo, incluido uno hacia arriba, para reproducir audio espacial con Dolby Atmos. Reproduce de todos los dispositivos y servicios por WiFi y Bluetooth, admite entrada de línea con el adaptador Sonos y ofrece un sonido claro y amplio. Dos Era 300 con Arc o Arc Ultra forman un surround Dolby Atmos excepcionalmente realista. La instalación y el control son sencillos con la app Sonos, los controles táctiles y la voz.',
    '/catalog/sonos/era-300.avif',
    '{"Marca": "Sonos", "SKU Oficial": "E30G1US1", "Categoría": "Bocinas Inalámbricas", "Acabados": "Negro, Blanco", "Conectividad": "WiFi, Bluetooth, entrada de línea (adaptador Sonos), AirPlay 2", "Control": "App Sonos, controles táctiles, control por voz", "Audio": "Espacial con Dolby Atmos", "Drivers": "6 (cuatro tweeters, dos woofers), disposición en ángulo", "Entrada de línea": "Sí, con adaptador combo o de línea Sonos", "Uso surround": "Par trasero con Arc / Arc Ultra", "Ideal para": "Salas de música y surround Atmos", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Era 300 | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Era 300 con ALFA, integrador oficial Sonos en México. Bocina inalámbrica con audio espacial Dolby Atmos que coloca al oyente dentro de la música. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Era 300', 'Sonos Era 300 México', 'Sonos Era 300 precio', 'Sonos Era 300 cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'E10G1US1', 'Sonos', sonos_brand_id, 'Sonos Era 100', 'Sonos Era 100', 'sonos-era-100', 'Bocinas Inalámbricas', audio_cat_id,
    'Bocina inalámbrica compacta con sonido estéreo real y graves intensos para cualquier habitación.',
    'Sonos Era 100 reinventa la bocina Sonos más popular con acústica de última generación y sonido estéreo real gracias a dos woofers y un tweeter. Reproduce todo el audio por WiFi y Bluetooth, admite tornamesa u otra fuente con el adaptador de entrada de línea Sonos y se controla con la voz. Se combina en par estéreo o como surround trasero, y se amplía por toda la casa con más bocinas Sonos.',
    '/catalog/sonos/era-100.avif',
    '{"Marca": "Sonos", "SKU Oficial": "E10G1US1", "Categoría": "Bocinas Inalámbricas", "Acabados": "Negro, Blanco", "Conectividad": "WiFi, Bluetooth, entrada de línea (adaptador Sonos), AirPlay 2", "Control": "App Sonos, controles táctiles, control por voz", "Drivers": "1 tweeter, 2 woofers (estéreo real)", "Entrada de línea": "Sí, con adaptador Sonos", "Uso surround": "Par trasero con Beam / Ray / Arc", "Ideal para": "Recámaras, cocinas, estudios", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Era 100 | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Era 100 con ALFA, integrador oficial Sonos en México. Bocina inalámbrica compacta con sonido estéreo real y graves intensos para cualquier habitación. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Era 100', 'Sonos Era 100 México', 'Sonos Era 100 precio', 'Sonos Era 100 cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'FIVE1US1', 'Sonos', sonos_brand_id, 'Sonos Five', 'Sonos Five', 'sonos-five', 'Bocinas Inalámbricas', audio_cat_id,
    'Bocina de alta fidelidad para la mejor calidad de sonido en música en streaming, vinilo y más.',
    'Sonos Five es la bocina de mayor potencia y fidelidad del catálogo para quienes buscan sonido superior. Con seis drivers y más memoria y procesamiento, entrega un sonido nítido y envolvente para música en streaming y vinilo mediante su entrada de línea analógica. Funciona con AirPlay 2 y se combina en par estéreo para una experiencia de escucha de referencia.',
    '/catalog/sonos/five.avif',
    '{"Marca": "Sonos", "SKU Oficial": "FIVE1US1", "Categoría": "Bocinas Inalámbricas", "Acabados": "Negro, Blanco", "Conectividad": "WiFi, entrada de línea analógica 3.5 mm, AirPlay 2", "Control": "App Sonos, Spotify Connect, AirPlay 2", "Drivers": "6 (tres tweeters, tres mid-woofers)", "Entrada de línea": "Analógica 3.5 mm integrada", "Uso": "Par estéreo para música crítica", "Ideal para": "Salas de escucha, vinilo, estudios", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Sonos Five | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Five con ALFA, integrador oficial Sonos en México. Bocina de alta fidelidad para la mejor calidad de sonido en música en streaming, vinilo y más. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Five', 'Sonos Five México', 'Sonos Five precio', 'Sonos Five cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'MOVE2US1', 'Sonos', sonos_brand_id, 'Sonos Move 2', 'Sonos Move 2', 'sonos-move-2', 'Bocinas Portátiles', audio_cat_id,
    'Bocina inteligente con batería para interior y exterior, con sonido estéreo y hasta 24 horas de autonomía.',
    'Sonos Move 2 es la bocina portátil de mayor tamaño de Sonos, renovada por dentro y por fuera. Su nueva arquitectura acústica reemplaza el tweeter único por dos, creando un espacio sonoro estéreo de gran fidelidad con voces nítidas. El ajuste Trueplay automático optimiza el sonido según el entorno, la batería dura hasta 24 horas y el diseño IP56 resiste polvo, lluvia y sol. En casa transmite por WiFi y fuera por Bluetooth.',
    '/catalog/sonos/move-2.avif',
    '{"Marca": "Sonos", "SKU Oficial": "MOVE2US1", "Categoría": "Bocinas Portátiles", "Acabados": "Negro, Blanco, Verde olivo", "Conectividad": "WiFi, Bluetooth, entrada de línea USB-C (adaptador), AirPlay 2", "Control": "App Sonos, controles táctiles, control por voz (WiFi)", "Batería": "Hasta 24 horas de reproducción", "Acústica": "Estéreo (dos tweeters y un woofer)", "Resistencia": "IP56 (polvo y agua)", "Trueplay": "Automático y continuo", "Carga": "Base de carga incluida o USB-C", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Move 2 | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Move 2 con ALFA, integrador oficial Sonos en México. Bocina inteligente con batería para interior y exterior, con sonido estéreo y hasta 24 horas de autonomía. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Move 2', 'Sonos Move 2 México', 'Sonos Move 2 precio', 'Sonos Move 2 cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'ROAM2US1', 'Sonos', sonos_brand_id, 'Sonos Roam 2', 'Sonos Roam 2', 'sonos-roam-2', 'Bocinas Portátiles', audio_cat_id,
    'Bocina portátil ultracompacta y resistente al agua IP67 que suena excelente en casa y en cualquier lugar.',
    'Sonos Roam 2 es la bocina inteligente portátil más compacta de Sonos. Transmite por WiFi en casa con control desde la app Sonos y AirPlay 2, y por Bluetooth cuando se lleva de viaje, con clasificación IP67 resistente al agua y al polvo. El ajuste automático Trueplay equilibra el sonido, ofrece hasta 10 horas de reproducción y se carga por USB-C o cualquier cargador Qi. Se integra al sistema multiroom Sonos del hogar.',
    '/catalog/sonos/roam-2.avif',
    '{"Marca": "Sonos", "SKU Oficial": "ROAM2US1", "Categoría": "Bocinas Portátiles", "Acabados": "Negro, Blanco, Verde, Azul, Rojo", "Conectividad": "WiFi, Bluetooth, AirPlay 2", "Control": "App Sonos, controles táctiles dedicados, control por voz (WiFi)", "Batería": "Hasta 10 horas de reproducción", "Resistencia": "IP67 (sumergible y a prueba de polvo)", "Trueplay": "Automático", "Carga": "USB-C o cualquier cargador inalámbrico Qi", "Peso": "Ultraligera (~430 g)", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Sonos Roam 2 | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Roam 2 con ALFA, integrador oficial Sonos en México. Bocina portátil ultracompacta y resistente al agua IP67 que suena excelente en casa y en cualquier lugar. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Roam 2', 'Sonos Roam 2 México', 'Sonos Roam 2 precio', 'Sonos Roam 2 cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'SUBG4US1', 'Sonos', sonos_brand_id, 'Sonos Sub (Gen 4)', 'Sonos Sub (Gen 4)', 'sonos-sub-gen-4', 'Subwoofers', audio_cat_id,
    'Subwoofer inalámbrico que libera graves profundos y sin distorsión para cine y música.',
    'Sonos Sub (Gen 4) añade graves dinámicos y profundos a cualquier barra de sonido o bocina Sonos compatible. Los diafragmas duales con arquitectura de cancelación de fuerza eliminan prácticamente toda distorsión, zumbido y vibración, y el gabinete ventilado mejora la salida de bajas frecuencias. Se conecta por WiFi para colocarse donde se prefiera, la configuración es instantánea con un solo cable de alimentación y se pueden combinar dos con Arc o Arc Ultra para máxima inmersión.',
    '/catalog/sonos/sub-gen-4.avif',
    '{"Marca": "Sonos", "SKU Oficial": "SUBG4US1", "Categoría": "Subwoofers", "Acabados": "Negro mate, Blanco mate", "Conectividad": "WiFi", "Control": "App Sonos (ajuste de nivel de graves), configuración con un cable", "Arquitectura": "Doble diafragma con cancelación de fuerza", "Gabinete": "Ventilado para mayor respuesta de graves", "Colocación": "Vertical o de lado (bajo el sofá)", "Emparejamiento": "Con barras y bocinas Sonos, hasta dos Sub", "Trueplay": "Sí", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Sub (Gen 4) | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Sub (Gen 4) con ALFA, integrador oficial Sonos en México. Subwoofer inalámbrico que libera graves profundos y sin distorsión para cine y música. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Sub (Gen 4)', 'Sonos Sub (Gen 4) México', 'Sonos Sub (Gen 4) precio', 'Sonos Sub (Gen 4) cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'SUBM1US1', 'Sonos', sonos_brand_id, 'Sonos Sub Mini', 'Sonos Sub Mini', 'sonos-sub-mini', 'Subwoofers', audio_cat_id,
    'Subwoofer cilíndrico compacto que aporta graves profundos a las barras y bocinas Sonos medianas.',
    'Sonos Sub Mini genera graves profundos y dinámicos con dos woofers personalizados enfrentados dentro de un gabinete sellado, creando un efecto de cancelación de fuerza que neutraliza la distorsión. Se conecta de forma inalámbrica a la barra de sonido o bocina compatible desde la app Sonos y ajusta el volumen automáticamente con el producto emparejado. Su diseño cilíndrico se integra con discreción junto a la pared o bajo los muebles.',
    '/catalog/sonos/sub-mini.avif',
    '{"Marca": "Sonos", "SKU Oficial": "SUBM1US1", "Categoría": "Subwoofers", "Acabados": "Negro, Blanco", "Conectividad": "WiFi", "Control": "App Sonos (ajuste de nivel de graves)", "Drivers": "Doble woofer de 6 pulgadas enfrentados", "Gabinete": "Cilíndrico sellado acústicamente", "Efecto": "Cancelación de fuerza para neutralizar distorsión", "Compatibilidad": "Beam, Ray, Era 100, One, Five, Sonos Amp", "Trueplay": "Sí (requiere dispositivo iOS)", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Sub Mini | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Sub Mini con ALFA, integrador oficial Sonos en México. Subwoofer cilíndrico compacto que aporta graves profundos a las barras y bocinas Sonos medianas. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Sub Mini', 'Sonos Sub Mini México', 'Sonos Sub Mini precio', 'Sonos Sub Mini cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'AMPG1US1', 'Sonos', sonos_brand_id, 'Sonos Amp', 'Sonos Amp', 'sonos-amp', 'Amplificación y Streaming', audio_cat_id,
    'Amplificador de streaming de alta fidelidad para dar vida a bocinas pasivas, tornamesa y TV.',
    'Sonos Amp es el amplificador versátil para potenciar todo el entretenimiento con 125 W por canal de rendimiento en alta fidelidad. Alimenta bocinas de librería, de pie, de muro o de plafón, reproduce todo el contenido con la app Sonos y Apple AirPlay, y se conecta a la TV por HDMI ARC para crear un sistema de entretenimiento completo. Es la base para llevar audio Sonos a bocinas arquitectónicas y zonas cableadas.',
    '/catalog/sonos/amp.avif',
    '{"Marca": "Sonos", "SKU Oficial": "AMPG1US1", "Categoría": "Amplificación y Streaming", "Acabados": "Negro", "Conectividad": "HDMI ARC, entrada de línea RCA, salida de subwoofer, WiFi, AirPlay 2", "Control": "App Sonos, AirPlay 2, control remoto de la TV (HDMI)", "Potencia": "125 W por canal a 8 ohm", "Salidas": "Un par de bocinas pasivas (hasta dos pares en algunas configuraciones)", "Entradas": "HDMI ARC, RCA analógica", "Sub": "Salida RCA para subwoofer con cable", "Uso": "Bocinas arquitectónicas, de librería, exteriores, TV", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Amp | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Amp con ALFA, integrador oficial Sonos en México. Amplificador de streaming de alta fidelidad para dar vida a bocinas pasivas, tornamesa y TV. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Amp', 'Sonos Amp México', 'Sonos Amp precio', 'Sonos Amp cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'PORT1US1', 'Sonos', sonos_brand_id, 'Sonos Port', 'Sonos Port', 'sonos-port', 'Amplificación y Streaming', audio_cat_id,
    'Componente de streaming para conectar tu equipo estéreo o receiver tradicional al ecosistema Sonos.',
    'Sonos Port añade streaming y control Sonos a un sistema estéreo o receiver existente. Permite disfrutar música, podcasts, audiolibros y radio por Internet en el equipo amplificado y transmitir vinilo, CD y archivos de audio a otras bocinas Sonos de la casa. Incluye entrada y salida de línea, salida digital coaxial y conector de automatización de 12 V, y se controla con la app Sonos y AirPlay 2.',
    '/catalog/sonos/port.avif',
    '{"Marca": "Sonos", "SKU Oficial": "PORT1US1", "Categoría": "Amplificación y Streaming", "Acabados": "Negro", "Conectividad": "Salida de línea RCA, entrada de línea RCA, salida digital coaxial, WiFi, AirPlay 2", "Control": "App Sonos, AirPlay 2, Siri (Apple Music)", "Uso": "Añade streaming a un amplificador o receiver existente", "Salidas": "RCA analógica y digital coaxial", "Entrada": "RCA analógica (tornamesa con phono externo, CD)", "Automatización": "Conector de 12 V trigger", "Ideal para": "Integrar equipo estéreo tradicional a Sonos", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Sonos Port | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Port con ALFA, integrador oficial Sonos en México. Componente de streaming para conectar tu equipo estéreo o receiver tradicional al ecosistema Sonos. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Port', 'Sonos Port México', 'Sonos Port precio', 'Sonos Port cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'INCLGWW1', 'Sonos', sonos_brand_id, 'Sonos In-Ceiling Speakers (6.5")', 'Sonos In-Ceiling Speakers (6.5")', 'sonos-in-ceiling-6', 'Sonos Architectural', audio_cat_id,
    'Bocinas arquitectónicas de plafón para sonido ambiental discreto en toda la casa.',
    'Las Sonos In-Ceiling Speakers ofrecen sonido brillante de pared a pared a cualquier volumen con una instalación prácticamente invisible. Diseñadas y ajustadas por Sonos y fabricadas a medida por Sonance, se potencian con Sonos Amp, que puede alimentar hasta tres pares. La rejilla sin marco se puede pintar para integrarse por completo al techo. Se venden por par.',
    '/catalog/sonos/in-ceiling-6.avif',
    '{"Marca": "Sonos", "SKU Oficial": "INCLGWW1", "Categoría": "Sonos Architectural", "Acabados": "Blanco (rejilla pintable)", "Conectividad": "Cableadas (requieren Sonos Amp)", "Control": "App Sonos a través de Sonos Amp", "Formato": "Bocinas de plafón, se venden por par", "Driver": "Woofer de 6.5 pulgadas con tweeter pivotante", "Diseño y ajuste": "Por Sonos, fabricadas por Sonance", "Rejilla": "Sin marco, pintable", "Requiere": "Sonos Amp (potencia hasta tres pares)", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos In-Ceiling Speakers (6.5") | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos In-Ceiling Speakers (6.5") con ALFA, integrador oficial Sonos en México. Bocinas arquitectónicas de plafón para sonido ambiental discreto en toda la casa. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos In-Ceiling Speakers (6.5")', 'Sonos In-Ceiling Speakers (6.5") México', 'Sonos In-Ceiling Speakers (6.5") precio', 'Sonos In-Ceiling Speakers (6.5") cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'INCL8WW1', 'Sonos', sonos_brand_id, 'Sonos In-Ceiling Speakers (8")', 'Sonos In-Ceiling Speakers (8")', 'sonos-in-ceiling-8', 'Sonos Architectural', audio_cat_id,
    'Bocinas de plafón de 8 pulgadas para cobertura amplia y graves con mayor cuerpo en espacios grandes.',
    'Las Sonos In-Ceiling Speakers de 8 pulgadas llevan sonido premium de alta fidelidad a cada parte del hogar con apariencia discreta. Su woofer de mayor tamaño aporta un sonido natural y con más cuerpo, ideal para salas amplias, terrazas cubiertas y áreas de doble altura. Diseñadas por Sonos y fabricadas por Sonance, se potencian con Sonos Amp. Se venden por par.',
    '/catalog/sonos/in-ceiling-8.avif',
    '{"Marca": "Sonos", "SKU Oficial": "INCL8WW1", "Categoría": "Sonos Architectural", "Acabados": "Blanco (rejilla pintable)", "Conectividad": "Cableadas (requieren Sonos Amp)", "Control": "App Sonos a través de Sonos Amp", "Formato": "Bocinas de plafón de 8 pulgadas, se venden por par", "Driver": "Woofer de 8 pulgadas para mayor cuerpo y graves", "Diseño y ajuste": "Por Sonos, fabricadas por Sonance", "Rejilla": "Sin marco, pintable", "Requiere": "Sonos Amp", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos In-Ceiling Speakers (8") | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos In-Ceiling Speakers (8") con ALFA, integrador oficial Sonos en México. Bocinas de plafón de 8 pulgadas para cobertura amplia y graves con mayor cuerpo en espacios grandes. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos In-Ceiling Speakers (8")', 'Sonos In-Ceiling Speakers (8") México', 'Sonos In-Ceiling Speakers (8") precio', 'Sonos In-Ceiling Speakers (8") cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'INWLLWW1', 'Sonos', sonos_brand_id, 'Sonos In-Wall Speakers', 'Sonos In-Wall Speakers', 'sonos-in-wall', 'Sonos Architectural', audio_cat_id,
    'Bocinas arquitectónicas de muro para sonido estéreo frontal discreto para TV y música.',
    'Las Sonos In-Wall Speakers entregan un sonido estéreo de primera fila para la TV y la música con una instalación limpia dentro del muro. Diseñadas y ajustadas por Sonos y fabricadas a medida por Sonance, se potencian con Sonos Amp, que alimenta hasta tres pares. La rejilla sin marco es pintable para integrarse al acabado del muro. Se venden por par.',
    '/catalog/sonos/in-wall.avif',
    '{"Marca": "Sonos", "SKU Oficial": "INWLLWW1", "Categoría": "Sonos Architectural", "Acabados": "Blanco (rejilla pintable)", "Conectividad": "Cableadas (requieren Sonos Amp)", "Control": "App Sonos a través de Sonos Amp", "Formato": "Bocinas de muro, se venden por par", "Driver": "Woofer con tweeter pivotante", "Uso": "Estéreo frontal para TV, música en muros", "Diseño y ajuste": "Por Sonos, fabricadas por Sonance", "Requiere": "Sonos Amp", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Sonos In-Wall Speakers | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos In-Wall Speakers con ALFA, integrador oficial Sonos en México. Bocinas arquitectónicas de muro para sonido estéreo frontal discreto para TV y música. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos In-Wall Speakers', 'Sonos In-Wall Speakers México', 'Sonos In-Wall Speakers precio', 'Sonos In-Wall Speakers cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'OUTDRWW1', 'Sonos', sonos_brand_id, 'Sonos Outdoor Speakers', 'Sonos Outdoor Speakers', 'sonos-outdoor', 'Sonos Architectural', audio_cat_id,
    'Bocinas arquitectónicas resistentes a la intemperie para llevar el sonido Sonos al patio y el jardín.',
    'Las Sonos Outdoor Speakers, diseñadas por Sonos y fabricadas por Sonance, están construidas para resistir humedad, calor, rayos UV, niebla salina y frío extremo. Ofrecen un sonido brillante y equilibrado para patios, jardines y albercas, se potencian con Sonos Amp y se integran al sistema multiroom para escuchar música dentro y fuera de la casa. Se venden por par.',
    '/catalog/sonos/outdoor.avif',
    '{"Marca": "Sonos", "SKU Oficial": "OUTDRWW1", "Categoría": "Sonos Architectural", "Acabados": "Blanco, Negro", "Conectividad": "Cableadas (requieren Sonos Amp)", "Control": "App Sonos a través de Sonos Amp", "Formato": "Bocinas de exterior, se venden por par", "Resistencia": "Humedad, calor, UV, sal y frío", "Diseño y ajuste": "Por Sonos, fabricadas por Sonance", "Uso": "Patio, jardín, alberca, terraza", "Requiere": "Sonos Amp", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Outdoor Speakers | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Outdoor Speakers con ALFA, integrador oficial Sonos en México. Bocinas arquitectónicas resistentes a la intemperie para llevar el sonido Sonos al patio y el jardín. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Outdoor Speakers', 'Sonos Outdoor Speakers México', 'Sonos Outdoor Speakers precio', 'Sonos Outdoor Speakers cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'E1PMPWW1', 'Sonos', sonos_brand_id, 'Sonos Era 100 Pro', 'Sonos Era 100 Pro', 'sonos-era-100-pro', 'Sonos Architectural', audio_cat_id,
    'Versión para instalación profesional de la Era 100, con alimentación PoE+ y capacidad de zonas.',
    'Sonos Era 100 Pro reimagina la icónica bocina Sonos para la instalación profesional, con alimentación PoE+ por un solo cable y capacidad de zonas para una solución de audio más eficiente y económica en espacios comerciales y residenciales. Se vende por pares y está disponible exclusivamente a través de instaladores Sonos como ALFA. Los soportes de montaje en superficie, con elemento de disuasión de robo y manejo de cable, se cotizan por separado.',
    '/catalog/sonos/era-100-pro.avif',
    '{"Marca": "Sonos", "SKU Oficial": "E1PMPWW1", "Categoría": "Sonos Architectural", "Acabados": "Blanco, Negro", "Conectividad": "PoE+ (alimentación y datos por un cable), WiFi, entrada de línea", "Control": "App Sonos, capacidad de zonas para integración profesional", "Disponibilidad": "Exclusiva para instaladores Sonos (integración)", "Alimentación": "PoE+ (Power over Ethernet)", "Formato": "Se vende por par", "Montaje": "Soportes de superficie con seguro antirrobo (se venden por separado)", "Uso": "Espacios comerciales y residenciales de instalación fija", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Era 100 Pro | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Era 100 Pro con ALFA, integrador oficial Sonos en México. Versión para instalación profesional de la Era 100, con alimentación PoE+ y capacidad de zonas. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Era 100 Pro', 'Sonos Era 100 Pro México', 'Sonos Era 100 Pro precio', 'Sonos Era 100 Pro cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'ACEG1US1', 'Sonos', sonos_brand_id, 'Sonos Ace', 'Sonos Ace', 'sonos-ace', 'Audífonos', audio_cat_id,
    'Audífonos over-ear de alta fidelidad con cancelación activa de ruido y audio espacial con seguimiento de cabeza.',
    'Sonos Ace son audífonos over-ear diseñados y calibrados con productores e ingenieros para una experiencia de audio de alta fidelidad. Ofrecen audio espacial con seguimiento dinámico de cabeza, reproducción lossless por Bluetooth y USB-C, cancelación activa de ruido y modo Ambiente, hasta 30 horas de batería y carga rápida. Los controles táctiles ajustan volumen, llamadas y modos, y la función TV Audio Swap traslada el sonido de una barra Sonos compatible a los audífonos.',
    '/catalog/sonos/ace.avif',
    '{"Marca": "Sonos", "SKU Oficial": "ACEG1US1", "Categoría": "Audífonos", "Acabados": "Blanco (Soft White), Negro (Black)", "Conectividad": "Bluetooth, USB-C (audio lossless), integración con barras Sonos (TV Audio Swap)", "Control": "Controles táctiles, botón de contenido, app Sonos", "Tipo": "Over-ear cerrados", "Cancelación de ruido": "Activa (ANC) y modo Ambiente", "Audio espacial": "Con seguimiento dinámico de cabeza", "Batería": "Hasta 30 horas con ANC; carga rápida de 3 min = 3 horas", "Extra": "Almohadillas de espuma viscoelástica reemplazables", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, true, true, true,
    'Sonos Ace | Distribuidor e Instalación en México | ALFA',
    'Cotiza Sonos Ace con ALFA, integrador oficial Sonos en México. Audífonos over-ear de alta fidelidad con cancelación activa de ruido y audio espacial con seguimiento de cabeza. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Sonos Ace', 'Sonos Ace México', 'Sonos Ace precio', 'Sonos Ace cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'E10FSWW1', 'Sonos', sonos_brand_id, 'Pedestal de piso para Sonos Era 100', 'Pedestal de piso para Sonos Era 100', 'sonos-stand-era-100', 'Accesorios y Montaje', audio_cat_id,
    'Pedestal de piso a medida para colocar la Era 100 a la altura del oído y ocultar el cableado.',
    'El pedestal de piso para Sonos Era 100 abre nuevas posibilidades de ubicación y libera espacio en los muebles. Sostiene la bocina a la altura del oído sentado, reduce reflejos y vibraciones, y su poste incluye un riel para ocultar el cable de alimentación. El color y acabado combinan con la bocina y la base con peso mejora la estabilidad. Disponible por pieza o por par.',
    '/catalog/sonos/stand-era-100.avif',
    '{"Marca": "Sonos", "SKU Oficial": "E10FSWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro, Blanco", "Conectividad": "Accesorio mecánico (compatible con Era 100)", "Control": "N/A", "Compatibilidad": "Sonos Era 100", "Formato": "Se vende por pieza o por par", "Altura": "Fija, a la altura del oído sentado", "Cableado": "Riel interno para ocultar el cable de alimentación", "Base": "Con peso para mayor estabilidad", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Pedestal de piso para Sonos Era 100 | Distribuidor e Instalación en México | ALFA',
    'Cotiza Pedestal de piso para Sonos Era 100 con ALFA, integrador oficial Sonos en México. Pedestal de piso a medida para colocar la Era 100 a la altura del oído y ocultar el cableado. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Pedestal de piso para Sonos Era 100', 'Pedestal de piso para Sonos Era 100 México', 'Pedestal de piso para Sonos Era 100 precio', 'Pedestal de piso para Sonos Era 100 cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'E10MTWW1', 'Sonos', sonos_brand_id, 'Soporte de pared para Sonos Era 100', 'Soporte de pared para Sonos Era 100', 'sonos-wall-mount-era-100', 'Accesorios y Montaje', audio_cat_id,
    'Soporte de pared a medida y de bajo perfil para la Era 100, con inclinación ajustable.',
    'El soporte de pared para Sonos Era 100 ahorra espacio y habilita nuevas ubicaciones para la bocina. Su articulación esférica gira 15 grados hacia arriba, abajo o los lados para orientar el sonido, mantiene el acceso a todos los puertos y controles y deja 51 mm de separación para el adaptador de entrada de línea o combo. El color y acabado combinan con la bocina. Disponible por pieza o por par.',
    '/catalog/sonos/wall-mount-era-100.avif',
    '{"Marca": "Sonos", "SKU Oficial": "E10MTWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro, Blanco", "Conectividad": "Accesorio mecánico (compatible con Era 100)", "Control": "N/A", "Compatibilidad": "Sonos Era 100", "Formato": "Se vende por pieza o por par", "Articulación": "Rótula que inclina 15 grados en cualquier dirección", "Acceso": "Diseño de bajo perfil con acceso a puertos y controles", "Espacio": "51 mm de separación para adaptadores Sonos", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Soporte de pared para Sonos Era 100 | Distribuidor e Instalación en México | ALFA',
    'Cotiza Soporte de pared para Sonos Era 100 con ALFA, integrador oficial Sonos en México. Soporte de pared a medida y de bajo perfil para la Era 100, con inclinación ajustable. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Soporte de pared para Sonos Era 100', 'Soporte de pared para Sonos Era 100 México', 'Soporte de pared para Sonos Era 100 precio', 'Soporte de pared para Sonos Era 100 cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'E30FSWW1', 'Sonos', sonos_brand_id, 'Pedestal de piso para Sonos Era 300', 'Pedestal de piso para Sonos Era 300', 'sonos-stand-era-300', 'Accesorios y Montaje', audio_cat_id,
    'Pedestal de piso a medida para la Era 300, ideal para optimizar el sonido surround o el par estéreo.',
    'El pedestal de piso para Sonos Era 300 permite colocar la bocina a la altura del oído para aprovechar el audio espacial, ya sea como surround de cine en casa o en par estéreo. Reduce reflejos y vibraciones, oculta el cable de alimentación en el poste y combina en color y acabado con la bocina. Disponible por pieza o por par.',
    '/catalog/sonos/stand-era-300.avif',
    '{"Marca": "Sonos", "SKU Oficial": "E30FSWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro, Blanco", "Conectividad": "Accesorio mecánico (compatible con Era 300)", "Control": "N/A", "Compatibilidad": "Sonos Era 300", "Formato": "Se vende por pieza o por par", "Uso": "Optimiza el surround o el par estéreo", "Cableado": "Riel interno para ocultar el cable", "Base": "Con peso para mayor estabilidad", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Pedestal de piso para Sonos Era 300 | Distribuidor e Instalación en México | ALFA',
    'Cotiza Pedestal de piso para Sonos Era 300 con ALFA, integrador oficial Sonos en México. Pedestal de piso a medida para la Era 300, ideal para optimizar el sonido surround o el par estéreo. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Pedestal de piso para Sonos Era 300', 'Pedestal de piso para Sonos Era 300 México', 'Pedestal de piso para Sonos Era 300 precio', 'Pedestal de piso para Sonos Era 300 cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'E30MTWW1', 'Sonos', sonos_brand_id, 'Soporte de pared para Sonos Era 300', 'Soporte de pared para Sonos Era 300', 'sonos-wall-mount-era-300', 'Accesorios y Montaje', audio_cat_id,
    'Soporte de pared a medida para la Era 300, con articulación esférica para orientar el audio espacial.',
    'El soporte de pared para Sonos Era 300 habilita nuevas ubicaciones y aprovecha mejor el audio espacial. La articulación esférica gira 15 grados en cualquier dirección, el diseño de bajo perfil mantiene el acceso a puertos y controles y deja 63 mm de separación para los adaptadores Sonos. Combina en color y acabado con la bocina. Disponible por pieza o por par.',
    '/catalog/sonos/wall-mount-era-300.avif',
    '{"Marca": "Sonos", "SKU Oficial": "E30MTWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro, Blanco", "Conectividad": "Accesorio mecánico (compatible con Era 300)", "Control": "N/A", "Compatibilidad": "Sonos Era 300", "Formato": "Se vende por pieza o por par", "Articulación": "Rótula que inclina 15 grados en cualquier dirección", "Espacio": "63 mm de separación para adaptadores Sonos", "Acceso": "Acceso completo a puertos y controles", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Soporte de pared para Sonos Era 300 | Distribuidor e Instalación en México | ALFA',
    'Cotiza Soporte de pared para Sonos Era 300 con ALFA, integrador oficial Sonos en México. Soporte de pared a medida para la Era 300, con articulación esférica para orientar el audio espacial. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Soporte de pared para Sonos Era 300', 'Soporte de pared para Sonos Era 300 México', 'Soporte de pared para Sonos Era 300 precio', 'Soporte de pared para Sonos Era 300 cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'AR2WMWW1', 'Sonos', sonos_brand_id, 'Soporte de pared para Sonos Arc Ultra', 'Soporte de pared para Sonos Arc Ultra', 'sonos-wall-mount-arc-ultra', 'Accesorios y Montaje', audio_cat_id,
    'Soporte de pared casi invisible para la Arc Ultra, con ajuste automático de ecualización.',
    'El soporte de pared para Sonos Arc Ultra integra la barra de sonido al hogar de forma discreta. Arc Ultra detecta cuando está montada en el soporte y ajusta automáticamente la ecualización para moderar la resonancia de los graves sobre el muro. Mantiene la barra lo más cerca posible de la pared para un aspecto integrado e incluye las piezas necesarias para su instalación.',
    '/catalog/sonos/wall-mount-arc-ultra.avif',
    '{"Marca": "Sonos", "SKU Oficial": "AR2WMWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro", "Conectividad": "Accesorio mecánico (compatible con Arc Ultra)", "Control": "N/A", "Compatibilidad": "Sonos Arc Ultra", "EQ automático": "Arc Ultra detecta el soporte y ajusta la ecualización", "Perfil": "Casi invisible, mantiene la barra cerca del muro", "Incluye": "Piezas de instalación", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Soporte de pared para Sonos Arc Ultra | Distribuidor e Instalación en México | ALFA',
    'Cotiza Soporte de pared para Sonos Arc Ultra con ALFA, integrador oficial Sonos en México. Soporte de pared casi invisible para la Arc Ultra, con ajuste automático de ecualización. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Soporte de pared para Sonos Arc Ultra', 'Soporte de pared para Sonos Arc Ultra México', 'Soporte de pared para Sonos Arc Ultra precio', 'Soporte de pared para Sonos Arc Ultra cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'BM1WMWW1', 'Sonos', sonos_brand_id, 'Soporte de pared para Sonos Beam', 'Soporte de pared para Sonos Beam', 'sonos-wall-mount-beam', 'Accesorios y Montaje', audio_cat_id,
    'Soporte de pared de diseño a medida para montar la Beam de forma fácil y segura.',
    'El soporte de pared para Sonos Beam permite colgar la barra de sonido de forma fácil y segura, con un diseño a medida disponible en blanco o negro para combinar con la barra. La cubierta inferior de Beam incluye dos puntos de montaje que aseguran el producto al soporte. Compatible con Beam Gen 1 y Gen 2.',
    '/catalog/sonos/wall-mount-beam.avif',
    '{"Marca": "Sonos", "SKU Oficial": "BM1WMWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Blanco, Negro", "Conectividad": "Accesorio mecánico (compatible con Beam Gen 1 y Gen 2)", "Control": "N/A", "Compatibilidad": "Sonos Beam (Gen 1 y Gen 2)", "Montaje": "Dos puntos de anclaje en la cubierta inferior de Beam", "Colores": "Blanco o Negro para combinar con la barra", "Incluye": "Piezas de instalación", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Soporte de pared para Sonos Beam | Distribuidor e Instalación en México | ALFA',
    'Cotiza Soporte de pared para Sonos Beam con ALFA, integrador oficial Sonos en México. Soporte de pared de diseño a medida para montar la Beam de forma fácil y segura. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Soporte de pared para Sonos Beam', 'Soporte de pared para Sonos Beam México', 'Soporte de pared para Sonos Beam precio', 'Soporte de pared para Sonos Beam cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'RAYWMWW1', 'Sonos', sonos_brand_id, 'Soporte de pared para Sonos Ray', 'Soporte de pared para Sonos Ray', 'sonos-wall-mount-ray', 'Accesorios y Montaje', audio_cat_id,
    'Soporte de pared de diseño exclusivo para instalar la Sonos Ray y liberar superficie.',
    'El soporte de pared para Sonos Ray ahorra espacio de superficie al instalar la barra de sonido. Su diseño exclusivo elimina vibraciones para ofrecer la mejor experiencia de sonido y la instalación es sencilla con las piezas incluidas.',
    '/catalog/sonos/wall-mount-ray.avif',
    '{"Marca": "Sonos", "SKU Oficial": "RAYWMWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro", "Conectividad": "Accesorio mecánico (compatible con Ray)", "Control": "N/A", "Compatibilidad": "Sonos Ray", "Diseño": "Exclusivo, elimina vibraciones", "Instalación": "Sencilla con las piezas incluidas", "Peso": "0.27 kg", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Soporte de pared para Sonos Ray | Distribuidor e Instalación en México | ALFA',
    'Cotiza Soporte de pared para Sonos Ray con ALFA, integrador oficial Sonos en México. Soporte de pared de diseño exclusivo para instalar la Sonos Ray y liberar superficie. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Soporte de pared para Sonos Ray', 'Soporte de pared para Sonos Ray México', 'Soporte de pared para Sonos Ray precio', 'Soporte de pared para Sonos Ray cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'CDNGLWW1', 'Sonos', sonos_brand_id, 'Adaptador combo Sonos (entrada de línea + Ethernet)', 'Adaptador combo Sonos (entrada de línea + Ethernet)', 'sonos-combo-adapter', 'Accesorios y Montaje', audio_cat_id,
    'Adaptador de extremo dividido para conectar la Era 100 o Era 300 a red cableada y a una fuente de audio 3.5 mm.',
    'El adaptador combo Sonos de extremo dividido permite conectar por cable una Era 100 o Era 300 al enrutador y, al mismo tiempo, conectar una fuente de audio de 3.5 mm como una tornamesa. No incluye cable auxiliar ni cable Ethernet.',
    '/catalog/sonos/combo-adapter.avif',
    '{"Marca": "Sonos", "SKU Oficial": "CDNGLWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro, Blanco", "Conectividad": "Adaptador de extremo dividido: RJ45 Ethernet + 3.5 mm", "Control": "N/A", "Compatibilidad": "Sonos Era 100 y Era 300", "Función": "Conexión a red cableada + fuente de audio 3.5 mm simultáneas", "No incluye": "Cable auxiliar ni cable Ethernet", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Adaptador combo Sonos (entrada de línea + Ethernet) | Distribuidor e Instalación en México | ALFA',
    'Cotiza Adaptador combo Sonos (entrada de línea + Ethernet) con ALFA, integrador oficial Sonos en México. Adaptador de extremo dividido para conectar la Era 100 o Era 300 a red cableada y a una fuente de audio 3.5 mm. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Adaptador combo Sonos (entrada de línea + Ethernet)', 'Adaptador combo Sonos (entrada de línea + Ethernet) México', 'Adaptador combo Sonos (entrada de línea + Ethernet) precio', 'Adaptador combo Sonos (entrada de línea + Ethernet) cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'LDNGLWW1', 'Sonos', sonos_brand_id, 'Adaptador de entrada de línea Sonos (3.5 mm a USB-C)', 'Adaptador de entrada de línea Sonos (3.5 mm a USB-C)', 'sonos-line-in-adapter', 'Accesorios y Montaje', audio_cat_id,
    'Adaptador de 3.5 mm a USB-C para conectar una tornamesa u otra fuente analógica a la Era 100 o Era 300.',
    'El adaptador de entrada de línea Sonos conecta una fuente de audio analógica, como una tornamesa con previo de phono, a una Era 100 o Era 300 mediante un conector de 3.5 mm a USB-C. No incluye cable auxiliar.',
    '/catalog/sonos/line-in-adapter.avif',
    '{"Marca": "Sonos", "SKU Oficial": "LDNGLWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro, Blanco", "Conectividad": "Adaptador 3.5 mm a USB-C", "Control": "N/A", "Compatibilidad": "Sonos Era 100 y Era 300", "Función": "Conecta una tornamesa u otra fuente analógica", "No incluye": "Cable auxiliar", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Adaptador de entrada de línea Sonos (3.5 mm a USB-C) | Distribuidor e Instalación en México | ALFA',
    'Cotiza Adaptador de entrada de línea Sonos (3.5 mm a USB-C) con ALFA, integrador oficial Sonos en México. Adaptador de 3.5 mm a USB-C para conectar una tornamesa u otra fuente analógica a la Era 100 o Era 300. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Adaptador de entrada de línea Sonos (3.5 mm a USB-C)', 'Adaptador de entrada de línea Sonos (3.5 mm a USB-C) México', 'Adaptador de entrada de línea Sonos (3.5 mm a USB-C) precio', 'Adaptador de entrada de línea Sonos (3.5 mm a USB-C) cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'OPADPWW1', 'Sonos', sonos_brand_id, 'Adaptador óptico a HDMI para Sonos Beam', 'Adaptador óptico a HDMI para Sonos Beam', 'sonos-optical-hdmi-adapter', 'Accesorios y Montaje', audio_cat_id,
    'Adaptador que conecta la salida de audio óptico del televisor a la entrada HDMI de la Beam o Arc.',
    'El adaptador óptico a HDMI para Sonos Beam conecta la barra de sonido a la salida de audio óptico del televisor, útil cuando el TV no tiene puerto HDMI ARC o cuando todos los HDMI están ocupados por otras fuentes.',
    '/catalog/sonos/optical-hdmi-adapter.avif',
    '{"Marca": "Sonos", "SKU Oficial": "OPADPWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro", "Conectividad": "Adaptador de salida de audio óptico (Toslink) a HDMI", "Control": "N/A", "Compatibilidad": "Sonos Beam (Gen 1 y Gen 2), Arc", "Uso": "TVs sin puerto HDMI ARC o con todos los HDMI ocupados", "Función": "Lleva el audio óptico del TV a la entrada HDMI de la barra", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Adaptador óptico a HDMI para Sonos Beam | Distribuidor e Instalación en México | ALFA',
    'Cotiza Adaptador óptico a HDMI para Sonos Beam con ALFA, integrador oficial Sonos en México. Adaptador que conecta la salida de audio óptico del televisor a la entrada HDMI de la Beam o Arc. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Adaptador óptico a HDMI para Sonos Beam', 'Adaptador óptico a HDMI para Sonos Beam México', 'Adaptador óptico a HDMI para Sonos Beam precio', 'Adaptador óptico a HDMI para Sonos Beam cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'RMWCHUS1', 'Sonos', sonos_brand_id, 'Cargador inalámbrico para Sonos Roam', 'Cargador inalámbrico para Sonos Roam', 'sonos-roam-wireless-charger', 'Accesorios y Montaje', audio_cat_id,
    'Cargador inalámbrico magnético a medida para la Sonos Roam, resistente al polvo y salpicaduras.',
    'El cargador inalámbrico para Sonos Roam sujeta la bocina magnéticamente para cargarla sin cables. Tiene clasificación IP54 contra polvo y salpicaduras y carga la bocina de 0 % a 50 % en aproximadamente dos horas. Compatible con Roam y Roam 2.',
    '/catalog/sonos/roam-wireless-charger.avif',
    '{"Marca": "Sonos", "SKU Oficial": "RMWCHUS1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro, Blanco", "Conectividad": "Cargador inalámbrico magnético (Roam y Roam 2)", "Control": "N/A", "Compatibilidad": "Sonos Roam y Roam 2", "Resistencia": "IP54 (polvo y salpicaduras)", "Carga": "0 % a 50 % en aproximadamente 2 horas", "Sujeción": "Magnética", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Cargador inalámbrico para Sonos Roam | Distribuidor e Instalación en México | ALFA',
    'Cotiza Cargador inalámbrico para Sonos Roam con ALFA, integrador oficial Sonos en México. Cargador inalámbrico magnético a medida para la Sonos Roam, resistente al polvo y salpicaduras. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Cargador inalámbrico para Sonos Roam', 'Cargador inalámbrico para Sonos Roam México', 'Cargador inalámbrico para Sonos Roam precio', 'Cargador inalámbrico para Sonos Roam cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'MVWHKWW1', 'Sonos', sonos_brand_id, 'Gancho de pared para Sonos Move', 'Gancho de pared para Sonos Move', 'sonos-move-hook', 'Accesorios y Montaje', audio_cat_id,
    'Solución de montaje para colgar la Sonos Move dentro o fuera de casa.',
    'El gancho de pared para Sonos Move permite colgar la bocina portátil dentro o fuera de casa con una solución de montaje moderna y discreta. Compatible con Move y Move 2.',
    '/catalog/sonos/move-hook.avif',
    '{"Marca": "Sonos", "SKU Oficial": "MVWHKWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro", "Conectividad": "Accesorio de montaje (Move y Move 2)", "Control": "N/A", "Compatibilidad": "Sonos Move y Move 2", "Uso": "Colgar la bocina dentro o fuera de casa", "Diseño": "Solución de montaje discreta", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Gancho de pared para Sonos Move | Distribuidor e Instalación en México | ALFA',
    'Cotiza Gancho de pared para Sonos Move con ALFA, integrador oficial Sonos en México. Solución de montaje para colgar la Sonos Move dentro o fuera de casa. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Gancho de pared para Sonos Move', 'Gancho de pared para Sonos Move México', 'Gancho de pared para Sonos Move precio', 'Gancho de pared para Sonos Move cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

  INSERT INTO public.products (sku, brand, brand_id, model, name, slug, category, category_id, short_description, description, image_url, specifications, highlights, warranty_years, is_favorite, is_public, is_active, seo_title, seo_description, seo_keywords)
  VALUES (
    'MVBAGWW1', 'Sonos', sonos_brand_id, 'Estuche de viaje para Sonos Move', 'Estuche de viaje para Sonos Move', 'sonos-move-travel-case', 'Accesorios y Montaje', audio_cat_id,
    'Estuche de mano a medida para transportar y proteger la Sonos Move.',
    'El estuche de viaje para Sonos Move está diseñado a medida para llevar la bocina a cualquier lugar con protección y un asa cómoda. Compatible con Move 1 y Move 2.',
    '/catalog/sonos/move-travel-case.avif',
    '{"Marca": "Sonos", "SKU Oficial": "MVBAGWW1", "Categoría": "Accesorios y Montaje", "Acabados": "Negro", "Conectividad": "Accesorio de transporte (Move y Move 2)", "Control": "N/A", "Compatibilidad": "Sonos Move y Move 2", "Uso": "Transportar y proteger la bocina", "Diseño": "A medida, con asa", "Garantía Oficial": "1 año (garantía oficial Sonos México)", "Integración": "ALFA OS / Sistema multiroom Sonos"}'::jsonb,
    ARRAY['Producto oficial Sonos con garantía y factura en México', 'Suministro e instalación por ALFA, integrador certificado de audio y video', 'Configuración, ajuste Trueplay y puesta en marcha incluidas', 'Integración multiroom con el resto de tu sistema Sonos y ALFA OS'],
    1, false, true, true,
    'Estuche de viaje para Sonos Move | Distribuidor e Instalación en México | ALFA',
    'Cotiza Estuche de viaje para Sonos Move con ALFA, integrador oficial Sonos en México. Estuche de mano a medida para transportar y proteger la Sonos Move. Suministro, instalación, calibración y garantía oficial.',
    ARRAY['Sonos', 'Estuche de viaje para Sonos Move', 'Estuche de viaje para Sonos Move México', 'Estuche de viaje para Sonos Move precio', 'Estuche de viaje para Sonos Move cotización', 'Sonos distribuidor México', 'Sonos Guadalajara']
  )
  ON CONFLICT (sku) DO UPDATE SET
    brand_id = EXCLUDED.brand_id, model = EXCLUDED.model, name = EXCLUDED.name, slug = EXCLUDED.slug,
    category = EXCLUDED.category, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, specifications = EXCLUDED.specifications, highlights = EXCLUDED.highlights,
    warranty_years = EXCLUDED.warranty_years, is_favorite = EXCLUDED.is_favorite, is_public = EXCLUDED.is_public,
    seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, seo_keywords = EXCLUDED.seo_keywords,
    updated_at = NOW();

END $$;
