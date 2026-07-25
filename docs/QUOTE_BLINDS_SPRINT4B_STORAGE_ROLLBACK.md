# Rollback Sprint 4B · Storage privado de Persianas

## Alcance

Sprint 4B usa el bucket dedicado `quote-blinds-private`, siempre privado, y
guarda únicamente paths persistentes con esta forma:

`quote-blinds/{quoteId}/{quoteItemId}/{uuid}.{ext}`

Migración:

`sql/20260724_quote_blinds_storage_sprint4b.sql`

Rollback controlado:

`sql/20260724_quote_blinds_storage_sprint4b_rollback.sql`

## Preflight obligatorio

1. Confirmar el project ref del entorno autorizado.
2. Confirmar que ningún entorno distinto está enlazado.
3. Confirmar que las variables locales pertenecen al destino autorizado.
4. Inventariar filas con `reference_image_path is not null`.
5. Inventariar objetos del bucket `quote-blinds-private`.
6. Descargar o respaldar cualquier objeto que deba conservarse.
7. Detener temporalmente altas, reemplazos y eliminaciones de fotos.

## Comportamiento seguro

El rollback aborta si el bucket contiene objetos o si existe cualquier fila con
`reference_image_path`. No elimina imágenes automáticamente y no modifica
cotizaciones, partidas ni detalles de Persianas.

Antes de reintentar un rollback sin datos:

1. Limpiar solamente fixtures inequívocamente identificados.
2. Confirmar que no queda ninguna fila que referencie los paths eliminados.
3. Confirmar que el bucket está vacío.
4. Ejecutar el rollback con detención ante el primer error.

Si existen datos reales, no se deben limpiar para forzar el rollback. Primero
se exportan objetos y relaciones, se define su destino y se prueba un plan de
migración en una copia restaurable.

## Resultado esperado

- Se eliminan las cuatro policies `quote_blinds_images_*`.
- Se elimina el bucket vacío `quote-blinds-private`.
- Se conserva `quote_blind_item_details.reference_image_path`.
- Sprint 1, Sprint 2, Sprint 3 y Sprint 4A permanecen intactos.

## Orden para revertir todo el módulo

1. Detener uso del módulo y respaldar base de datos y Storage.
2. Exportar o migrar cualquier dato real.
3. Ejecutar `sql/20260724_quote_blinds_storage_sprint4b_rollback.sql`.
4. Ejecutar `sql/20260724_quote_blinds_sprint1_rollback.sql`.
5. Validar que las cotizaciones estándar permanecen intactas.

## Roll forward

La migración Sprint 4B es idempotente para bucket y policies. Después de
corregir la causa del rollback puede volver a aplicarse sólo con respaldo,
preflight y autorización explícita.
