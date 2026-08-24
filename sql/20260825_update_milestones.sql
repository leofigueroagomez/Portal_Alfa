ALTER TABLE public.project_contracts
ALTER COLUMN payment_milestones SET DEFAULT '[
    {"percentage": 70, "concept": "Anticipo a la firma del contrato", "trigger": "contract_signature"},
    {"percentage": 20, "concept": "Entrega de equipos en sitio de obra", "trigger": "equipment_delivery"},
    {"percentage": 10, "concept": "Finiquito y entrega aceptada a entera satisfacción", "trigger": "final_handover"}
]'::jsonb;

-- Actualizar los contratos existentes que estén en borrador o pendientes
UPDATE public.project_contracts
SET payment_milestones = '[
    {"percentage": 70, "concept": "Anticipo a la firma del contrato", "trigger": "contract_signature"},
    {"percentage": 20, "concept": "Entrega de equipos en sitio de obra", "trigger": "equipment_delivery"},
    {"percentage": 10, "concept": "Finiquito y entrega aceptada a entera satisfacción", "trigger": "final_handover"}
]'::jsonb
WHERE status IN ('draft', 'pending_client_data', 'pending_signatures');
