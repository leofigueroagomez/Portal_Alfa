-- Guarda de integridad: impide que un mismo quote_item genere dos partidas operativas
-- activas en el mismo proyecto (raiz de la duplicacion de cantidades en Compras).
--
-- Verificado antes de crear: no hay filas que violen este indice en produccion.
-- Ejecutar DESPUES de 20260830_fix_project48_duplicate_operational_items.sql.

create unique index if not exists project_operational_items_project_quote_item_key
  on public.project_operational_items (client_project_id, source_quote_item_id)
  where source_quote_item_id is not null and status <> 'deleted';
