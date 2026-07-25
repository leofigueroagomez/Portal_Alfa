# Rollback - Cotizaciones de Persianas Sprint 1

## Alcance

Este plan revierte exclusivamente:

- `quotes.quote_type`;
- el indice `quotes_quote_type_created_at_idx`;
- los triggers y funciones de integridad de tipo;
- `quote_blind_item_details`, sus policies RLS, indices y trigger de `updated_at`.

No modifica cotizaciones comerciales existentes, Facturama, CFDI, portal, proyectos, rentabilidad, buckets ni objetos de Storage.

Script preparado:

- `sql/20260724_quote_blinds_sprint1_rollback.sql`

## Condiciones Previas

1. Confirmar que el destino es sandbox o staging, no produccion.
2. Detener cualquier proceso que pudiera crear cotizaciones de Persianas.
3. Ejecutar:

```sql
select count(*) as blinds_quotes
from public.quotes
where quote_type = 'blinds';

select count(*) as blind_item_details
from public.quote_blind_item_details;
```

4. Ambos resultados deben ser cero para el rollback automatico.
5. Guardar un respaldo de schema y un dump de las tablas afectadas.

El script aborta deliberadamente si encuentra una cotizacion `blinds` o un detalle de persiana. No elimina ni convierte esos datos.

## Ejecucion

Aplicar contra el sandbox:

```bash
psql "$SANDBOX_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f sql/20260724_quote_blinds_sprint1_rollback.sql
```

No ejecutar contra produccion sin autorizacion explicita, respaldo verificado y ventana de rollback.

## Verificacion Posterior

```sql
select to_regclass('public.quote_blind_item_details');

select exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'quotes'
    and column_name = 'quote_type'
) as quote_type_exists;
```

Resultados esperados:

- `to_regclass` devuelve `null`;
- `quote_type_exists` devuelve `false`;
- las cotizaciones, secciones y partidas estandar siguen presentes;
- PostgREST reconoce el schema despues de `notify pgrst, 'reload schema'`.

## Si Ya Existen Datos De Persianas

El rollback automatico no es seguro. Antes de reintentarlo:

1. Exportar `quotes`, `quote_sections`, `quote_items` y `quote_blind_item_details` relacionados.
2. Definir si los registros se migraran a otro contrato o se conservara el schema.
3. Preparar un rollback especifico y revisable que no pierda datos.
4. Probarlo en una copia del sandbox.
5. Obtener autorizacion explicita antes de ejecutarlo.

## Storage

Sprint 1 no crea buckets ni objetos. Por tanto, el rollback no borra archivos.

Si Sprint 4B ya fue aplicado, primero debe ejecutarse su rollback controlado. Los
objetos del bucket privado `quote-blinds-private` y las filas con
`reference_image_path` deben inventariarse antes de retirar el schema de
Sprint 1. Nunca eliminar archivos mientras una fila los referencie.

Orden obligatorio para revertir el modulo completo:

1. detener altas y uploads de Persianas;
2. exportar o migrar cualquier dato real;
3. ejecutar `sql/20260724_quote_blinds_storage_sprint4b_rollback.sql`;
4. ejecutar `sql/20260724_quote_blinds_sprint1_rollback.sql`.

## Validacion Real En Sandbox

Validado el 2026-07-24 exclusivamente en `alfa-os-sandbox`
(`pkqwlvqosooewbejbktx`) con respaldo previo:

- `pkqwlvqosooewbejbktx_initialized_20260724_170413.zip`
- SHA-256:
  `BD74FFF9BA51160ADD2056F40E21C026581C852BF7F995EDF9B56E1D9E0912A2`

Resultados:

1. La migracion Sprint 1 se aplico con `ON_ERROR_STOP=1`.
2. Las pruebas de constraints, triggers, m2 generado, override, paths privados,
   relacion 1:1 y compatibilidad con la cotizacion estandar pasaron.
3. La matriz RLS paso para `admin`, `direccion`, `comercial`, `ingenieria`,
   `project_manager`, `instalador`, `compras`, `finanzas` y `client`.
4. El rollback aborto correctamente mientras existian una cotizacion `blinds`
   y un detalle de persiana.
5. Despues de eliminar exclusivamente los fixtures identificados, el rollback
   termino correctamente y preservo la cotizacion, grupo y partida estandar.
6. Sprint 1 se reaplico para dejar el sandbox listo, sin cotizaciones `blinds`
   ni detalles persistidos.

Las policies beta abiertas heredadas por otros modulos del baseline permanecen
fuera de alcance. Las tablas de cotizaciones y `quote_blind_item_details` no
tienen policies abiertas con `using (true)` o `with check (true)`.
