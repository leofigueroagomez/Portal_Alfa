# Release controlado · Cotizaciones de Persianas

Estado del paquete: preparado en sandbox; no autorizado para producción.

Fecha de preparación: 2026-07-24.

## Alcance

Este paquete incorpora una vertical interna y separada de cotizaciones
`quote_type = 'blinds'` con captura de partidas, cálculo comercial, PDF y fotos
privadas. No modifica portal cliente, CFDI, Facturama, complementos de pago ni
los flujos fiscales.

Orden de despliegue obligatorio:

1. migración de schema Sprint 1;
2. migración de Storage Sprint 4B;
3. despliegue de la aplicación;
4. validación interna y limpieza controlada del fixture.

## Inventario del release

### Archivos modificados

- `app/(admin)/quotes/page.tsx`
- `docs/SETUP_SANDBOX.md`
- `docs/modules/cotizaciones/MODULE_CONTEXT.md`
- `lib/permissions.ts`
- `package.json`

### Frontend nuevo

- `app/(admin)/quotes/blinds/BlindsAccessDenied.tsx`
- `app/(admin)/quotes/blinds/BlindsQuotesList.tsx`
- `app/(admin)/quotes/blinds/types.ts`
- `app/(admin)/quotes/blinds/page.tsx`
- `app/(admin)/quotes/blinds/new/page.tsx`
- `app/(admin)/quotes/blinds/new/NewBlindQuoteForm.tsx`
- `app/(admin)/quotes/blinds/[id]/page.tsx`
- `app/(admin)/quotes/blinds/[id]/BlindItemForm.tsx`
- `app/(admin)/quotes/blinds/[id]/BlindQuoteEditor.tsx`
- `app/(admin)/quotes/blinds/[id]/BlindReferenceImage.tsx`

### API nueva

- `app/api/quotes/blinds/route.ts`
- `app/api/quotes/blinds/[id]/route.ts`
- `app/api/quotes/blinds/[id]/items/route.ts`
- `app/api/quotes/blinds/[id]/items/[itemId]/route.ts`
- `app/api/quotes/blinds/[id]/items/[itemId]/reference-image/route.ts`
- `app/api/quotes/blinds/[id]/pdf/route.ts`

### Lógica de dominio nueva

- `lib/quoteBlindsBackend.ts`
- `lib/quoteBlindsContract.ts`
- `lib/quoteBlindsPdfHtml.ts`
- `lib/quoteBlindsPdfSnapshot.ts`
- `lib/quoteBlindsStorage.ts`

### Migraciones y rollbacks

- `sql/20260724_quote_blinds_sprint1.sql`
- `sql/20260724_quote_blinds_sprint1_rollback.sql`
- `sql/20260724_quote_blinds_storage_sprint4b.sql`
- `sql/20260724_quote_blinds_storage_sprint4b_rollback.sql`

### Pruebas, smoke y documentación

- `tests/quoteBlinds.test.mjs`
- `tests/quoteBlindsPdf.test.mjs`
- `tests/quoteBlindsStorage.test.mjs`
- `scripts/smoke-quote-blinds.mjs`
- `scripts/smoke-quote-blinds-storage.mjs`
- `docs/QUOTE_BLINDS_SPRINT1_ROLLBACK.md`
- `docs/QUOTE_BLINDS_SPRINT4B_STORAGE_ROLLBACK.md`
- `docs/QUOTE_BLINDS_RELEASE_SPRINT5.md`

No forman parte del release los archivos bajo `tmp/`, `.env.local`, respaldos,
capturas, PDFs de prueba ni credenciales.

## Estado frente al repositorio principal

Los worktrees principal y sandbox parten del commit
`87cc8e4c232007e338df3d83e2f245d4a94713f4`.

El repositorio principal contiene copias locales sin versionar de los SQL de
Sprint 1 y documentación parcial. Sprint 2, Sprint 3, Sprint 4A y Sprint 4B
existen únicamente en el worktree sandbox. La integración futura debe partir
del conjunto completo del sandbox; no se deben copiar archivos sueltos ni
sobrescribir el worktree principal sucio.

Comparación SHA-256 del inventario:

- 30 archivos no existen en el repositorio principal;
- 7 existen, pero su contenido difiere;
- sólo `sql/20260724_quote_blinds_sprint1_rollback.sql` es idéntico.

Cuando exista autorización para preparar commit/PR:

1. crear una rama desde el worktree sandbox;
2. excluir expresamente `.env.local`, `tmp/` y respaldos;
3. agregar únicamente el inventario anterior;
4. revisar `git diff --cached --name-only`;
5. ejecutar nuevamente las validaciones;
6. crear commit y PR sólo con autorización independiente.

## Contrato y seguridad

- Todas las rutas requieren usuario interno.
- Las mutaciones reutilizan `canManageBlindQuotes`.
- Ningún endpoint de aplicación usa service role.
- Los scripts smoke usan una llave administrativa sólo para crear y limpiar
  identidades y fixtures sintéticos en sandbox; están bloqueados al project ref
  de sandbox y no deben ejecutarse en producción.
- Usuarios cliente y sesiones anónimas no pueden acceder a API, PDF o fotos.
- El bucket `quote-blinds-private` permanece privado.
- Sólo se persisten paths
  `quote-blinds/{quoteId}/{quoteItemId}/{uuid}.{ext}`.
- Las vistas internas pueden recibir `internal_notes`, `override_reason` y el
  path persistente porque son herramientas operativas autenticadas.
- El PDF nunca incluye `internal_notes`, `override_reason`, signed URLs, nombre
  del bucket ni paths privados.
- Las fotos no se incrustan en el PDF; se muestra una referencia comercial
  textual.

## Preflight de producción

No continuar si algún punto falla.

- [ ] Existe autorización escrita para la ventana y responsables.
- [ ] Se confirmó el project ref esperado de producción:
      `jcdnfjitvyfizcsjvwww`.
- [ ] Un segundo operador confirmó URL, project ref y cuenta Supabase.
- [ ] El worktree de release no está enlazado a sandbox ni a otro proyecto.
- [ ] No se reutiliza `.env.local` del sandbox.
- [ ] Las variables fiscales conservan exactamente la configuración productiva
      previamente aprobada; este release no las modifica.
- [ ] No se ejecutará timbrado, CFDI ni complemento de pago durante el smoke.
- [ ] Se confirmó que `set_updated_at()` existe y que `profiles` conserva
      `id`, `is_active`, `is_internal` y `role`.
- [ ] Se auditó si `is_internal_user()` y `has_internal_role(text[])` existen.
      Sprint 1 los crea únicamente cuando faltan y no reemplaza definiciones
      existentes.
- [ ] Existen `quotes`, `quote_groups`, `quote_sections` y `quote_items`.
- [ ] `quotes.quote_type` y `quote_blind_item_details` todavía no existen, o su
      estado fue auditado como una aplicación idempotente compatible.
- [ ] Se inventariaron policies existentes relacionadas con cotizaciones y
      Storage.
- [ ] Se creó respaldo lógico de roles, schema y datos.
- [ ] El respaldo tiene fecha, tamaño, ubicación y SHA-256 registrados.
- [ ] Se confirmó snapshot o punto de restauración disponible en Supabase.
- [ ] Se registró el conteo de cotizaciones estándar antes del cambio.
- [ ] El artefacto de aplicación corresponde al commit aprobado en el PR.

Comandos de respaldo de referencia, usando una connection string entregada por
canal seguro y sin imprimirla:

```powershell
npx supabase db dump --db-url "$env:PRODUCTION_DATABASE_URL" --role-only --file "<backup-dir>\roles.sql"
npx supabase db dump --db-url "$env:PRODUCTION_DATABASE_URL" --file "<backup-dir>\schema.sql"
npx supabase db dump --db-url "$env:PRODUCTION_DATABASE_URL" --data-only --use-copy --file "<backup-dir>\data.sql"
```

Los tres archivos deben ser no vacíos, comprimirse y recibir SHA-256 antes de
la migración.

## Aplicación futura de migraciones

Estos comandos son plantillas. No están autorizados por este documento.

```powershell
psql "$env:PRODUCTION_DATABASE_URL" -v ON_ERROR_STOP=1 -f "sql/20260724_quote_blinds_sprint1.sql"
psql "$env:PRODUCTION_DATABASE_URL" -v ON_ERROR_STOP=1 -f "sql/20260724_quote_blinds_storage_sprint4b.sql"
```

No desplegar la aplicación si cualquiera de las migraciones falla.

Validaciones SQL mínimas después de las migraciones:

```sql
select column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'quotes'
  and column_name = 'quote_type';

select quote_type, count(*)
from public.quotes
group by quote_type;

select to_regclass('public.quote_blind_item_details');

select relrowsecurity
from pg_class
where oid = 'public.quote_blind_item_details'::regclass;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'quote-blinds-private';

select policyname, cmd, roles, qual, with_check
from pg_policies
where (
  schemaname = 'public'
  and tablename = 'quote_blind_item_details'
) or (
  schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'quote_blinds_images_%'
);
```

Resultados obligatorios:

- todas las cotizaciones previas continúan como `standard`;
- sólo se permiten `standard` y `blinds`;
- RLS está activo;
- no hay policies nuevas abiertas;
- bucket privado, 10 MB y MIME JPEG/PNG/WebP;
- el trigger de grupo impide mezclar tipos;
- un detalle de persiana no puede asociarse a una cotización estándar.

## Smoke post-deploy

Usar una cuenta interna designada, nunca service role.

- [ ] Abrir el listado estándar y registrar una cotización existente.
- [ ] Crear una cotización de Persianas con marcador inequívoco.
- [ ] Agregar al menos dos áreas y cuatro partidas.
- [ ] Confirmar piezas, m², subtotal, IVA y total.
- [ ] Editar una partida y retirar un ajuste manual.
- [ ] Subir, reemplazar y quitar una foto.
- [ ] Confirmar que la miniatura usa una URL firmada y el bucket sigue privado.
- [ ] Generar PDF y verificar `%PDF-`, carta, cliente, proyecto, áreas y totales.
- [ ] Confirmar ausencia de notas internas, motivo de ajuste, bucket y paths.
- [ ] Probar sesión anónima y cuenta cliente: acceso denegado.
- [ ] Confirmar que la cotización estándar registrada sigue intacta.
- [ ] Confirmar que portal, CFDI, Facturama y complementos no cambiaron.
- [ ] Eliminar las imágenes y partidas del fixture desde la aplicación.
- [ ] Limpiar cotización y grupo sólo mediante una operación administrativa
      aprobada, transaccional y limitada a los IDs/marker registrados.
- [ ] Confirmar cero objetos, referencias, detalles, cotizaciones y usuarios
      temporales asociados al marcador.

Actualmente no existe un endpoint de usuario para borrar la cotización y su
grupo completos. La limpieza final del fixture productivo requiere autorización
operativa separada y SQL/DBA dirigido por IDs. No se debe usar service role
dentro de la aplicación ni ejecutar el smoke automatizado de sandbox contra
producción.

## Rollback

La reversión preferida ante un problema de aplicación es desplegar la versión
anterior y dejar el schema aditivo aplicado. Esto conserva datos y mantiene
compatibilidad con cotizaciones estándar.

El rollback destructivo de schema sólo es válido mientras no existan datos de
Persianas:

1. detener el módulo;
2. confirmar respaldo restaurable;
3. inventariar cotizaciones, detalles, referencias y objetos;
4. ejecutar primero el rollback de Storage;
5. ejecutar después el rollback de Sprint 1;
6. validar las cotizaciones estándar.

Ambos scripts abortan en lugar de borrar datos silenciosamente:

- Sprint 4B aborta ante objetos o paths persistidos;
- Sprint 1 aborta ante cotizaciones `blinds` o detalles.

Sprint 1 no elimina durante rollback los helpers compartidos
`is_internal_user()` ni `has_internal_role(text[])`. Conservarlos es la opción
segura porque otras policies pueden reutilizarlos posteriormente.

Si ya existen datos reales, no se ejecuta el rollback destructivo. Se conserva
el schema, se revierte sólo la aplicación y se prepara una migración de datos
específica probada sobre una restauración.

## Riesgos y pendientes

- Las altas de grupo/cotización/sección y algunas mutaciones de partida no usan
  una RPC transaccional única. Existen compensaciones, pero un fallo remoto
  extremo puede requerir auditoría de registros parciales.
- Una falla al borrar un objeto después de limpiar la referencia devuelve
  `cleanup_pending`; no existe todavía un reconciliador automático de huérfanos.
- No hay endpoint para borrar una cotización de Persianas completa.
- `.env.local` del sandbox tiene pendiente completar de forma segura la
  publishable key; no es un archivo del release.
- Las 158 policies históricas abiertas del baseline quedan como backlog
  separado y no deben mezclarse con este release.
- Versionado, aprobación, portal cliente, PDF con fotos y facturación permanecen
  fuera del alcance aprobado.

Ninguno de estos pendientes autoriza ampliar el alcance durante la ventana de
release. Cualquier corrección debe volver a sandbox y repetir validaciones.

## Validación final de Sprint 5

Ejecutada exclusivamente contra sandbox `pkqwlvqosooewbejbktx`:

- `npm run test:quote-blinds`: 13/13.
- `npx tsc --noEmit`: correcto.
- ESLint dirigido a API, UI, librerías, tests y smoke: correcto.
- `npm run build`: correcto con publishable key sandbox inyectada de forma
  temporal; no se imprimió ni persistió.
- `git diff --check`: correcto.
- Smoke autenticado `ALFA-BLINDS-S4B-20260725012821`: correcto.
- Cuatro partidas, dos áreas, dos uploads desde UI, signed URLs, reemplazo,
  retiro, edición, PDF y borrado autorizado: correctos.
- Pruebas negativas anónima, cliente y rol sin permiso de delete: correctas.
- Totales: 6 piezas, 15.72 m², subtotal `$7,248.00`, IVA `$1,159.68` y total
  `$8,407.68`.
- Limpieza: cero cotizaciones, usuarios, referencias y objetos del fixture.
- Auditoría final: bucket privado, cuatro policies, cero policies abiertas
  nuevas y cotización estándar bootstrap intacta.
- Guard del rollback Storage probado en PostgreSQL real: abortó ante una
  referencia persistida creada dentro de una transacción; la transacción dejó
  cero residuos.
- Escaneo del inventario: cero literales con formato de secreto.

No se aplicaron migraciones, despliegues ni escrituras en producción. No se
creó commit, push ni merge.
