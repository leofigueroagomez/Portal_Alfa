-- Migration: 20260825_project_contracts.sql
-- Digital Project Contracts, Client Legal Onboarding, and Double Signature with NOM-151 / LFPDPPP legal traceability

CREATE TABLE IF NOT EXISTS public.project_contracts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contract_number TEXT NOT NULL UNIQUE,
    quote_id BIGINT REFERENCES public.quotes(id) ON DELETE SET NULL,
    client_project_id BIGINT REFERENCES public.client_projects(id) ON DELETE CASCADE,
    client_id BIGINT REFERENCES public.clients(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_client_data', 'pending_signatures', 'signed', 'cancelled')),
    client_type TEXT NOT NULL DEFAULT 'b2b' CHECK (client_type IN ('b2b', 'b2c')),
    
    -- Fechas y Calendario de Obra
    contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_from DATE,
    valid_to DATE,
    estimated_weeks INTEGER NOT NULL DEFAULT 4,
    work_schedule TEXT NOT NULL DEFAULT 'Lunes a Viernes de 9:00 a 18:00 hrs y Sábados de 9:00 a 14:00 hrs',
    
    -- Aspectos Económicos
    currency TEXT NOT NULL DEFAULT 'MXN',
    exchange_rate NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
    subtotal_mxn NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    iva_mxn NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_amount_mxn NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    
    -- Hitos de Pago (JSONB array de porcentaje, concepto y detonador)
    payment_milestones JSONB NOT NULL DEFAULT '[
        {"percentage": 70, "concept": "Anticipo a la firma del contrato", "trigger": "contract_signature"},
        {"percentage": 20, "concept": "Entrega de equipos en sitio de obra", "trigger": "equipment_delivery"},
        {"percentage": 10, "concept": "Finiquito y entrega aceptada a entera satisfacción", "trigger": "final_handover"}
    ]'::jsonb,

    -- Alcance y Disciplinas Técnicas
    disciplines TEXT[] NOT NULL DEFAULT ARRAY['Sistemas e Integración Tecnológica']::TEXT[],
    scope_summary TEXT,
    technical_prerequisites TEXT DEFAULT 'El cliente deberá proveer acometida eléctrica a 110V/220V aterrizada, acceso irrestricto en horarios autorizados, servicio activo de Internet con módem entregado por el ISP, y ductería/canalizaciones conforme a los planos de ingeniería de ALFA IT.',
    technical_exclusions TEXT DEFAULT 'Trabajos de albañilería, resanes mayores, pintura, canalización oculta no incluida en planos iniciales, permisos de construcción o trámites ante el CFE, condominios o dependencias gubernamentales.',
    warranty_labor_months INTEGER NOT NULL DEFAULT 12,
    warranty_equipment_notes TEXT DEFAULT 'Garantía directa de fabricante en todos los equipos suministrados, gestionada por ALFA IT conforme a pólizas oficiales.',

    -- Datos Legales del Cliente (Persona Moral / Física)
    legal_business_name TEXT,
    legal_rfc TEXT,
    legal_tax_regime TEXT,
    legal_tax_zip_code TEXT,
    legal_fiscal_address TEXT,
    
    -- Datos Notariales (Persona Moral)
    notary_deed_number TEXT,
    notary_deed_date DATE,
    notary_number TEXT,
    notary_city_state TEXT,
    notary_name TEXT,
    public_registry_folio TEXT,
    
    -- Representante Legal
    representative_name TEXT,
    representative_title TEXT,
    representative_powers_deed TEXT,
    representative_email TEXT,
    representative_phone TEXT,
    representative_curp TEXT,
    
    -- Contacto Operativo en Sitio
    site_manager_name TEXT,
    site_manager_phone TEXT,
    site_manager_email TEXT,
    
    -- Documentación Legal Adjunta
    client_tax_constancy_url TEXT,
    client_articles_of_incorporation_url TEXT,
    client_signer_ine_front_url TEXT,
    client_signer_ine_back_url TEXT,

    -- Datos Corporativos de ALFA IT
    alfa_business_name TEXT NOT NULL DEFAULT 'ALFA IT SOLUCIONES S.A. DE C.V.',
    alfa_rfc TEXT NOT NULL DEFAULT 'AIS200818XYZ',
    alfa_address TEXT NOT NULL DEFAULT 'Franz Liszt 5160, Zapopan, Jalisco, C.P. 45030',
    alfa_notary_deed TEXT NOT NULL DEFAULT 'Escritura Pública No. 45,892 ante Notario 128 de Guadalajara, Jalisco',
    alfa_representative_name TEXT NOT NULL DEFAULT 'Ing. Leonardo Figueroa Gómez',
    alfa_representative_title TEXT NOT NULL DEFAULT 'Director General y Representante Legal',

    -- Firmas Digitales y Trazabilidad Legal
    client_signature_image_url TEXT,
    client_signed_at TIMESTAMPTZ,
    client_signature_ip TEXT,
    client_signature_latitude NUMERIC(10,6),
    client_signature_longitude NUMERIC(10,6),
    client_signer_name TEXT,
    
    alfa_signature_image_url TEXT,
    alfa_signed_at TIMESTAMPTZ,
    alfa_signer_name TEXT,
    
    contract_pdf_url TEXT,
    onboarding_token TEXT UNIQUE,
    signing_token TEXT UNIQUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_project_contracts_quote_id ON public.project_contracts(quote_id);
CREATE INDEX IF NOT EXISTS idx_project_contracts_project_id ON public.project_contracts(client_project_id);
CREATE INDEX IF NOT EXISTS idx_project_contracts_client_id ON public.project_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_project_contracts_onboarding_token ON public.project_contracts(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_project_contracts_signing_token ON public.project_contracts(signing_token);
CREATE INDEX IF NOT EXISTS idx_project_contracts_status ON public.project_contracts(status);

-- Storage bucket para contratos y documentos legales
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-contracts', 'project-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para storage bucket project-contracts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated staff manage project contracts bucket' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Authenticated staff manage project contracts bucket"
        ON storage.objects FOR ALL
        TO authenticated
        USING (bucket_id = 'project-contracts')
        WITH CHECK (bucket_id = 'project-contracts');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public upload for contract onboarding and signatures' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Public upload for contract onboarding and signatures"
        ON storage.objects FOR INSERT
        TO anon, public
        WITH CHECK (bucket_id = 'project-contracts');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public view for contract onboarding and signatures' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Public view for contract onboarding and signatures"
        ON storage.objects FOR SELECT
        TO anon, public
        USING (bucket_id = 'project-contracts');
    END IF;
END $$;

-- Políticas RLS para tabla project_contracts
ALTER TABLE public.project_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view and manage all contracts"
ON public.project_contracts FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can view contract with token"
ON public.project_contracts FOR SELECT
TO anon, public
USING (onboarding_token IS NOT NULL OR signing_token IS NOT NULL);

CREATE POLICY "Public can update contract with token"
ON public.project_contracts FOR UPDATE
TO anon, public
USING (onboarding_token IS NOT NULL OR signing_token IS NOT NULL)
WITH CHECK (onboarding_token IS NOT NULL OR signing_token IS NOT NULL);
