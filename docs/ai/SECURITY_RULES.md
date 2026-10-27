# Security Rules

Reglas criticas para agentes. No debilitar seguridad para resolver errores de producto.

## Auditoria 2026-09-16: correcciones locales y pendientes productivos

Ver [informe consolidado](../audits/2026-09-16-security-audit.md), sus informes de
auth/rutas/datos y el inventario SQL de solo lectura. Los cambios estan preparados
localmente; no confundirlos con un despliegue o hardening de RLS ya aplicado.

- Cada Server Action necesita perfil activo y permiso antes de usar service role,
  emitir tokens, leer datos o contactar proveedores; el proxy no sustituye ese guard.
- Perfiles inactivos se rechazan tambien en guards fiscales/portal y contextos de
  cliente/contratista. Esto no reemplaza RLS ni revocacion de sesiones.
- No interpolar tokens en filtros PostgREST `.or()`. Los contratos usan el formato
  generado `onb_`/`sgn_` + 48 hex y igualdad sobre una columna fija.
- Los crons fallan cerrados si falta `CRON_SECRET` y solo aceptan Bearer por header.
- Firma publica requiere token del tipo de firma, estado elegible y UPDATE
  condicionado que impida reemplazos concurrentes. Conservar pagos ya recibidos.
- Nuevas firmas PNG se validan y acotan antes de guardar/renderizar. Esto no valida
  automaticamente otros uploads/INE ni imagenes historicas.
- `services/supabaseAdmin.ts` es `server-only`. No importarlo desde cliente.
- Validacion reproducible del parche: `npm run test:security`, TypeScript, build,
  lint dirigido y `git diff --check`; despues matriz completa en sandbox.

**Urgente pendiente:** Auth productivo reporta registro email habilitado. El SQL
versionado conserva defaults internos permisivos; falta consultar la definicion
efectiva y corregir en conjunto trigger/RPC/RLS/API de altas. Sandbox reporta
INACTIVE. No ejecutar migraciones historicas ni afirmar policies actuales seguras
sin inventario, respaldo y pruebas.

## Auditoria de seguridad 2026-09-01 (Supabase + rutas API)

Hallazgos y correcciones de una revision completa de RLS/grants en Supabase y de
autorizacion en `app/api/**`. Ver [[project_security_audit_20260901]] en memoria.
Patrones a repetir/vigilar en cambios futuros:

- **Una policy RLS para el rol `public` es casi siempre un bug.** `public` en
  Postgres incluye `anon` (cualquiera en internet, sin login). Se encontraron y
  cerraron policies `public`/`true` (o con `qual` que no verifica nada, como
  `columna IS NOT NULL`) en `project_contracts` (RFC, CURP, INE, firmas —
  critico), `suppliers` (RFC, credito) y `project_members`. Antes de escribir
  `to public` o `to anon` en una policy, confirmar que el dato es realmente
  publico (como `quotable_systems`, catalogo sin PII, si es correcto).
- **Un `qual` de policy debe comparar contra algo que el llamante demuestre
  poseer**, no solo verificar que la columna no sea null. Un flujo "acceso por
  token" (onboarding, firma) se protege dejando la tabla sin policy publica y
  haciendo el match exacto de token en un server action/route con
  `createSupabaseAdminClient()` (service_role, bypasa RLS) — nunca confiando en
  que PostgREST valide el token del cliente.
- **Vista con `SECURITY DEFINER` + grant a `anon`/`authenticated` = bypass total
  de RLS.** Se encontraron 22 vistas `vigia_v_*` con grants completos
  (`SELECT/INSERT/UPDATE/DELETE`) al rol `anon`, exponiendo reportes financieros
  y de pipeline de ventas sin login. Toda vista nueva sobre datos de negocio
  debe revisar sus grants explícitamente (`revoke all ... ; grant select to
  authenticated;`) — no asumir que hereda el RLS de las tablas base.
- **Cada API route bajo `app/api/[algo]/[id]/...` necesita dos checks, no uno:**
  ¿esta autenticado? y ¿tiene permiso sobre ESTE `id`? (`requireInternalUser()`
  para rutas de staff, o `requireFiscalProjectAccessForProfile`/
  `requirePortalProjectAccessForProfile` para rutas que un cliente/contratista
  puede tocar). Se encontro y corrigio `app/api/contracts/[id]/pdf` que solo
  verificaba sesion, sin rol — cualquier usuario logueado (incluido portal
  cliente) podia pedir el contrato de cualquier otro `id`.
- **Todo webhook externo debe verificar firma con fail-closed**, nunca un
  fallback que confie en el body si falta la firma/secreto. Se encontro y
  corrigio `app/api/webhooks/stripe` con un fallback `JSON.parse(rawBody)` sin
  verificar cuando faltaba el header `stripe-signature` — permitia falsificar
  eventos de pago (marcar servicios como pagados sin pagar).
- **Pendiente de confirmar por Leo (no verificable via SQL/MCP):** que el
  signup publico de email este deshabilitado en el Dashboard de Supabase
  (Authentication → Sign In / Providers). `handle_new_user_profile()` y
  `ensure_current_user_profile()` asignan `is_internal = true, role =
  'comercial'` por default a cualquier usuario nuevo cuyo `user_metadata` no
  lo marque como `client_portal` — fail-open. Ningun flujo de la app crea
  usuarios asi (todos usan `service_role` + rol explicito), pero si el signup
  publico de GoTrue esta habilitado, es una escalada de privilegios directa.
  Corregir esto requiere tambien tocar `app/api/admin/users/route.ts` (que hoy
  depende de ese default para dejar `is_internal=true` en altas de staff) —
  no cambiar sin revisar ambos lados a la vez.

## Cotizaciones: RLS beta abierta (auditoria 2026-10-01)

Estado: **migracion propuesta, NO aplicada en produccion**. Requiere
confirmacion explicita de Leo.

- Hallazgo (produccion, solo lectura): `quotes`, `quote_groups`,
  `quote_sections`, `quote_items`, `quote_item_area_allocations`,
  `quote_item_labor_activities`, `quote_diagnostic_blocks`, `quote_misc_items`
  y `quote_terms_settings` tienen `beta_authenticated_{select,insert,update,delete}`
  con `true` para `authenticated`. Simulando el JWT de un usuario portal
  cliente, ve 187 cotizaciones y 2,346 partidas, con costos y descuentos de
  aliado, y puede editarlas o borrarlas. `quote_templates`,
  `quote_template_lines` y `quote_voice_drafts` tienen select `true`.
  `quote_blind_item_details` ya estaba cerrada (`is_internal_user()`) y
  `quote_approvals` tiene RLS sin policies (deny-all).
- Migracion: [`sql/20261001_quotes_rls_internal_only.sql`](../../sql/20261001_quotes_rls_internal_only.sql).
  Rollback: [`sql/20261001_quotes_rls_internal_only_rollback.sql`](../../sql/20261001_quotes_rls_internal_only_rollback.sql).
  Las 12 tablas quedan con `is_internal_user()`. Se revocan los grants de `anon` y
  `TRUNCATE/REFERENCES/TRIGGER` de `authenticated` en las 14 tablas `quote_*`.
- **Orden de despliegue:** primero el codigo de `app/portal/projects/[id]/page.tsx`,
  que ahora lee la cotizacion aprobada con service role (proyecto ya validado
  por `getAccessibleClientProject`, con select explicito sin costos), y despues
  la migracion. Era el unico lector de `quotes` con la sesion de un usuario no
  interno.
- **Regla:** el portal cliente, el portal de contratistas y los documentos
  publicos no deben leer tablas `quote_*` con la sesion del usuario. Una policy
  de fila para el portal expone todas las columnas via PostgREST (costos,
  `partner_*_discount_*`). Usar service role en servidor despues de validar
  proyecto/token, con un select explicito.
- Todos los demas lectores/escritores son internos: paginas `app/(admin)/**`
  (sesion), cliente del navegador en `quotes/new`, `quotes/[id]/edit`,
  `CreateQuoteVersionButton`, `ApproveQuoteVersionButton`, `DeleteQuoteButton`,
  `invoices/InvoiceForm`, `RecalculatePurchaseLinesButton`, y rutas API con
  `requireInternalUser`/`requireWorkOrderRole`/`requireQuoteNotificationPermission`.
  Los flujos publicos (`app/public/documents/[token]/quote`, contratos,
  firma de servicio/entrega, Vigia) ya usan service role.
- Ensayo en sandbox `pkqwlvqosooewbejbktx` (2026-10-01) con migracion,
  verificacion y rollback en una transaccion abortada al final, sin dejar
  cambios: 0 policies abiertas despues de migrar. Un `sub` no interno ve 0
  `quotes` y 0 `quote_items`; su `update`/`delete` afecta 0 filas y su `insert`
  falla con `42501`. Un interno activo sigue actualizando. El rollback reabre
  las 24 policies. El sandbox no tiene usuarios `client`; el resto de la
  matriz se probo con el JWT simulado.
- Fase 2 opcional (no incluida): granularidad por rol interno. Ojo: el editor
  borra y recrea secciones y partidas, asi que `delete` debe seguir permitido a
  quien edita. El `*_delete_admin_direction` de `20260615` romperia la edicion
  para `comercial`.
- **Drift sandbox/produccion:** `sql/20260615_critical_rls_hardening.sql` esta
  aplicado en sandbox pero **no en produccion**. En produccion, `clients`,
  `client_projects`, `projects`, `project_invoices`, `project_payments` y otras
  tablas siguen con `beta_authenticated_*` = `true`: 53 tablas fuera de
  `quote_*` al 2026-10-01. `public_document_links` tiene las policies de
  `20260615` mas las beta, y como las permissive se combinan con OR, sigue
  abierta. Los documentos de modulo que dicen "RLS vigente en 20260615"
  describen el sandbox, no produccion. No aplicar la seccion de cotizaciones de
  `20260615` despues de esta migracion: reintroduce el select del portal sobre
  cotizaciones aprobadas con todas sus columnas.
- **Pendiente relacionado:** las vistas `vigia_v_*` no tienen
  `security_invoker` y tienen `select` para `authenticated`. Por eso un usuario
  portal sigue leyendo datos de cotizaciones por ahi (por ejemplo,
  `vigia_v_vta02_stale_high_value_quotes` devolvio 11 filas como cliente). En el
  codigo solo las leen los sensores con service role (cron y `runVigiaNowAction`).
  Se puede revocar `select` de `authenticated` en ellas, pero hay que hacerlo en
  una migracion aparte.

## Autenticacion

- La proteccion de rutas vive principalmente en `proxy.ts`.
- Rutas internas protegidas detectadas: `/admin`, `/dashboard`, `/leads`, `/customers`, `/clients`, `/projects`, `/inventory`, `/post-sale`, `/contractors`, `/services`, `/invoices`, `/products`, `/quotes`, `/engineering`, `/engineering-quotes`, `/users`, `/settings`, `/notifications`, `/product-categories`, `/product-tags`.
- El portal cliente vive bajo `/portal` y debe mantenerse separado de rutas internas.
- `proxy.ts` usa Supabase SSR y claims para decidir redirecciones.

## Roles Y Permisos

- Roles y helpers centrales: `lib/permissions.ts`.
- Perfil actual e identificacion interno/cliente: `services/profile.ts`.
- Guards server-side para API: `lib/apiAuth.ts`.
- No duplicar reglas de permisos en pantallas si ya existe helper compartido.
- No convertir usuarios cliente en internos ni al reves por workaround.

Roles detectados en codigo:

- `admin`
- `direccion`
- `comercial`
- `ingenieria`
- `project_manager`
- `instalador`
- `compras`
- `finanzas`
- `client`

## Supabase Y RLS

- SQL versionado vive en `sql/`.
- Cambios de tablas, columnas, indices, triggers o RLS deben ir en migracion revisable.
- Reutilizar patrones RLS existentes de tablas similares.
- Incluir recarga de schema cache cuando una migracion cambie estructura usada por PostgREST.
- No inventar policies si existe patron equivalente en el modulo.

Pendiente de confirmar: listado completo y actualizado de policies aplicadas en produccion.

### RLS de tablas de negocio fuera de cotizaciones (auditoria 2026-10-01)

Estado: **migraciones propuestas, NO aplicadas en produccion**. Requieren
confirmacion explicita de Leo. Complementa la seccion de cotizaciones
(`sql/20261001_quotes_rls_internal_only.sql`).

- **Hallazgo (produccion `jcdnfjitvyfizcsjvwww`, solo lectura):**
  `sql/20260615_critical_rls_hardening.sql` esta aplicado en sandbox pero **no
  en produccion**. Hay 53 tablas fuera de `quote_*` con
  `beta_authenticated_*` = `true` para `authenticated`, asi que un usuario
  `client` o `contractor` lee, edita y borra datos de todos los clientes.
  `public_document_links` tiene ademas las policies `*_internal` y la de portal,
  pero como las permissive se combinan con OR, sigue abierta. En produccion
  **no existe** `has_project_portal_access()`.
- **Abiertas fuera del patron `beta_*`, tambien en produccion:**
  - `project_contracts`: ALL `true`, con RFC, CURP, INE y firmas.
  - `contractor_portal_users`: ALL `true`. Cualquier usuario autenticado puede
    insertarse como usuario de un contratista.
  - `contractor_signed_agreements`: select `user_id = auth.uid() OR true`, con
    CLABE, RFC, CURP e INE. Insert `true`.
  - `suppliers`: ALL `true`.
  - `project_members`: select `true`.
  - `quotable_systems`: gestion ALL `true`.
  - `vigia_*`: select `true`.
  - Las 22 vistas `vigia_v_*` no tienen `security_invoker` y tienen select para
    `authenticated`.
- **Inventario de accesos no internos con la sesion (codigo al 2026-10-01):**
  - **Lecturas propias que se mantienen con la sesion:**
    - `client_portal_users` y `client_portal_project_access` (`lib/clientPortal.ts`,
      `lib/apiAuth.ts`, `app/portal/page.tsx`, `app/portal/services/[id]/page.tsx`).
    - `contractor_portal_users` (`lib/contractorPortal.ts`).
    - `contractor_signed_agreements` (`getContractorSignedAgreement`).
    - `profiles`, por el RPC `ensure_current_user_profile` y `proxy.ts`.
  - **Pasan a service role, despues de validar acceso y con select explicito:**
    - Para cliente: `clients`, `client_projects`, `project_invoices`,
      `project_payments`, `project_deliveries`, `project_warranties`,
      `service_reports`, `service_report_photos` y `quotes`.
      Archivos: `app/portal/page.tsx`, `app/portal/projects/[id]/page.tsx`,
      `app/portal/services/[id]/page.tsx` y `getAccessibleClientProject`.
    - Para contratista: `contractors`, `service_reports` (con embeds de
      `clients`/`client_projects`), `service_report_photos` y `work_orders`.
      Archivos: `lib/contractorPortal.ts` y `app/portal/page.tsx`.
    - El `update` de `service_reports` que hace el contratista
      (`app/portal/services/[id]/contractorActions.ts`). Era la unica escritura
      con la sesion de un usuario no interno.
    - Para eso, `ClientPortalContext` y el contexto contratista exponen `db`
      (service role). Usarlo **solo** despues de validar acceso y siempre
      filtrando por `portalUser.client_id`, proyectos asignados o
      `portalUser.contractor_id`.
  - **Ya usaban service role:** `public_document_links`, `documents`,
    `public_document_access_events`, `/public/documents/[token]/*`, la insercion
    de fotos y acuerdos del contratista, contratos publicos por token y Vigia.
- **Decision:** no hay policies de fila para portal en tablas de negocio. Una
  policy de fila expone todas las columnas via PostgREST (por ejemplo
  `facturama_response`, costos, notas internas o el RFC del cliente al
  contratista) y en produccion exigiria crear antes el helper de acceso. Se usa
  el mismo patron que en cotizaciones.
- **Migraciones** (idempotentes; cada una con rollback que restaura exactamente
  el estado de produccion auditado):
  1. P1 fiscal/financiero/PII (26 tablas beta + 5 extra):
     [`sql/20261001e_rls_internal_only_p1_fiscal_pii.sql`](../../sql/20261001e_rls_internal_only_p1_fiscal_pii.sql) /
     [`_rollback`](../../sql/20261001e_rls_internal_only_p1_fiscal_pii_rollback.sql).
     `project_invoices` y `project_invoice_items` conservan sus candados de
     estado: `update` solo `issued`/`paid` y `delete` solo borrador sin
     `facturama_id`, ahora ademas con `is_internal_user()`.
  2. P2 operacion/compras/productos/catalogos SAT (27 tablas) + `quotable_systems`:
     [`sql/20261001f_rls_internal_only_p2_operations.sql`](../../sql/20261001f_rls_internal_only_p2_operations.sql) /
     [`_rollback`](../../sql/20261001f_rls_internal_only_p2_operations_rollback.sql).
  3. Vigia, vistas y tablas:
     [`sql/20261001d_vigia_internal_only.sql`](../../sql/20261001d_vigia_internal_only.sql) /
     [`_rollback`](../../sql/20261001d_vigia_internal_only_rollback.sql).
- **Orden de despliegue:**
  1. Codigo del portal (service role).
  2. Cotizaciones.
  3. P1.
  4. P2.
  5. Vigia.

  Si P1 se aplica antes que el codigo, el portal cliente y el de contratistas
  quedan vacios y el contratista no puede actualizar servicios.
- **Diseno de las migraciones:** cada tabla listada pierde **todas** sus
  policies y recibe `<tabla>_internal_{select,insert,update,delete}` con
  `is_internal_user()`, solo para los comandos que hoy existen. Ademas se
  aplica `REVOKE ALL` a `anon` y `REVOKE TRUNCATE/REFERENCES/TRIGGER` a
  `authenticated`. No se usa la granularidad por rol de `20260615`: hoy todo
  interno puede todo, y eso queda como Fase 2.
- **Ensayo en sandbox `pkqwlvqosooewbejbktx` (2026-10-01):** todo se corrio en
  una transaccion terminada con `RAISE EXCEPTION`. Antes y despues se verifico
  el mismo hash de policies y grants: 229 policies, sin residuos.
  1. Se simulo el estado de produccion corriendo los rollbacks: 184 policies
     beta. Un `sub` no interno lee `clients`/`client_projects`, actualiza
     `clients` y su `insert` en `leads` pasa RLS.
  2. Despues de migrar:
     - 0 policies beta y 0 abiertas; `anon` sin grants; la vista `vigia_v_*`
       de prueba sin grant.
     - No interno: 0 filas en las 19 tablas muestreadas, `update` afecta
       0 filas, `insert` falla con `42501` y la vista de Vigia con `42501`.
     - Interno activo: mismos conteos que service role y `update` OK.
     - Correr la migracion otra vez deja el mismo estado.
  3. Despues del rollback, el hash de policies y grants es identico al estado
     tipo produccion.

  Limites del sandbox: no tiene `project_contracts`, `contractor_*`,
  `suppliers`, `company_settings`, `quotable_systems`, tablas ni vistas de
  Vigia, ni usuarios `client`/`contractor`. Esas partes se omitieron (las
  migraciones las saltan con `to_regclass`) y deben probarse en produccion con
  JWT simulado dentro de `begin; ... rollback;` antes del commit real.
- **Conocido despues de aplicar:**
  `/api/invoices/[id]/{pdf,xml,cancellation-acuse}` y
  `/api/payment-complements/[id]/*` hacen una lectura previa con la sesion antes
  de `requireFiscalProjectAccessForProfile`, asi que para un usuario portal
  devolveran 404. El portal no las enlaza: usa `/public/documents/[token]/*`.
  Cambiar esa lectura previa a service role se dejo fuera porque toca rutas
  fiscales y requiere revision explicita.
- **Pendientes relacionados (no incluidos en estas migraciones):**
  - Storage (`storage.objects`) en produccion:
    - `beta_authenticated_*_storage` da CRUD a cualquier autenticado sobre
      `project-photos`, `project-documents` y `product-images`.
    - `Allow public uploads*` permite a `anon` subir a `project-photos` y
      `project-documents`.
    - `Public view for contract onboarding and signatures` permite a `anon`
      leer `project-contracts`, donde estan los INE y las firmas.

    Requiere una migracion de storage aparte, revisando antes que el onboarding
    publico de contratos sube y lee con service role.
  - `ensure_current_user_profile()` crea perfiles internos `comercial` por
    default (ver auditoria 2026-09-01).
  - Las fotos del contratista se suben al bucket `service_reports`, pero los
    lectores firman URLs de `project-photos`.
  - `app/api/terminal/connection-token` solo verifica sesion.

### Tablas de respaldo (`bkp_*`)

- Toda tabla `bkp_*` creada durante una reparacion de datos (ver `sql/20260830_merge_orphan_purchase_lines.sql`) debe llevar `ENABLE ROW LEVEL SECURITY` sin policies en el mismo momento en que se crea. Sin RLS, PostgREST la expone publicamente (lectura/escritura/borrado con el `anon` key) al schema `public` — asi se detecto y corrigio para `bkp_20260830_*` (2026-09-01, alertado por el linter de seguridad de Supabase).
- Estas tablas no las consulta la app; RLS activo sin policy las deja en deny-by-default, que es el estado correcto (no requieren policies de lectura).
- Correr `get_advisors(type: security)` despues de crear cualquier tabla de respaldo o dejar una migracion sin terminar.

### El Vigia

- Tablas `vigia_sensor_runs`, `vigia_findings`, `vigia_audit_log`: RLS activo, unica policy `select` para `authenticated` (hoy `true`; `sql/20261001d_vigia_internal_only.sql`, propuesta, la cambia a `is_internal_user()` y quita el grant de las vistas `vigia_v_*` a `authenticated`). La escritura la hace el runner con service_role. No abrir estas tablas a escritura por RLS.
- Endpoint `app/api/vigia/cron/daily`: auth por `CRON_SECRET` en header Bearer; niega secreto ausente y no acepta `?key=`. No quitar el candado. El endpoint corre sensores de solo lectura y puede enviar correo (Resend), asi que su ejecucion es un cambio que envia correos.
- Los sensores (`lib/vigia/sensors.ts`) son solo lectura sobre tablas de negocio. Nunca escribir desde un sensor.
- Ejecutores de 1 clic (`lib/vigia/executors.ts`, `app/(admin)/vigia/execute-actions.ts`): server actions con gate de rol `admin`/`direccion`. Cada uno guarda snapshot en `vigia_action_backups` antes de tocar nada y tiene `revert()`. Si hay cualquier duda, `canApply()` se niega.
- Investigar a fondo (`lib/vigia/investigate/*`): los playbooks son solo lectura; la unica llamada a un modelo (Claude, via `ANTHROPIC_API_KEY`) solo interpreta el expediente y **propone** — nunca escribe en la base. Server action con gate de rol `admin`/`direccion`. Tope de costo mensual (`VIGIA_INVESTIGATE_MONTHLY_CAP_USD`). No enviar el contenido de `vigia_*` ni de las tablas de negocio a ningun otro servicio; el unico destino externo es la API de Anthropic para la interpretacion y Resend para el correo.
- Tablas `vigia_action_backups` y `vigia_investigations`: RLS activo, `select` para `authenticated`. No abrir a escritura.

### Inventario/Almacen

- `inventory_items` e `inventory_movements`: RLS activo con solo `beta_authenticated_select`. No agregar policies de escritura: el saldo y el costo promedio solo se mueven por las funciones `inventory_*` (`sql/20261025_inventory.sql`).
- Las funciones `inventory_*` estan revocadas a `public`/`anon`/`authenticated` y concedidas solo a `service_role`. Se llaman desde `app/(admin)/inventory/actions.ts` despues de validar perfil activo y `canManagePurchases`.
- Vista `inventory_v_stock` con `security_invoker = true`, revocada a `anon`.
- Ver [`../modules/inventario/MODULE_CONTEXT.md`](../modules/inventario/MODULE_CONTEXT.md).

## Storage

- El repo usa Supabase Storage en flujos de imagenes/documentos.
- Mantener privados los buckets privados; usar URLs firmadas o helpers existentes.
- No cambiar buckets a publicos para resolver renderizado de PDF o preview.
- Validar expiracion y acceso de URLs firmadas en servidor cuando aplique.
- Un flujo publico por token (firma, onboarding, documentos) **sube y lee con
  `createSupabaseAdminClient()`** despues de validar el token en servidor. Nunca
  abrir un bucket a `anon`/`public` para que el navegador suba directo.
- Una policy de storage para `authenticated` sin `is_internal_user()` incluye a
  usuarios de portal cliente y contratista.

### Storage en produccion (auditoria 2026-10-01)

Estado: **migracion propuesta, NO aplicada en produccion**. Requiere
confirmacion explicita de Leo. Resuelve el pendiente "Storage
(`storage.objects`) en produccion" de la auditoria de RLS 2026-10-01 (rama
`claude/kind-greider-86b2f4`).

- **Estado de produccion (`jcdnfjitvyfizcsjvwww`, solo lectura, 2026-10-01):**
  27 policies en `storage.objects`, iguales a
  [`supabase/backups/storage_policies_20260905.sql`](../../supabase/backups/storage_policies_20260905.sql)
  menos las 4 `dev product-images` ya borradas. Hash
  `7479cbd89b2204393c13c38a4e8551b4`:
  `md5(string_agg(policyname||'|'||permissive||'|'||roles::text||'|'||cmd||'|'||coalesce(qual,'')||'|'||coalesce(with_check,''), E'\n' order by policyname))`.

  | Bucket | `public` | Objetos |
  | --- | --- | --- |
  | `product-images` | si | 1425 |
  | `project-photos` | no | 191 |
  | `project-documents` | no | 5 |
  | `quote-blinds-private` | no | 5 |
  | `product_images` (heredado) | si | 4 |
  | `commercial-partner-assets` | si | 2 |
  | `profile-photos` | si | 1 |
  | `project-contracts` | no | 0 |

  No existe el bucket `service_reports`.

- **Huecos encontrados:**
  - `anon`:
    - lee y sube a `project-contracts` (`Public view/upload for contract
      onboarding and signatures`);
    - sube a `project-photos` y `project-documents` (`Allow public uploads*`);
    - lista `commercial-partner-assets`.
  - Cualquier `authenticated`, incluidos portal cliente y contratista:
    - CRUD sobre `project-photos`, `project-documents` y `product-images`
      (`beta_authenticated_*_storage`);
    - ALL sobre `project-contracts`;
    - escritura en `product_images`.
  - Las `alfa_internal_*` ya eran solo internas: `current_profile_role()` exige
    `is_active AND is_internal`, igual que `is_internal_user()`. Como las
    policies permissive se combinan con OR, las `beta_*` las anulaban.
- **Inventario de storage en codigo** (incluye los cambios de portal de
  `claude/kind-greider-86b2f4`):
  - **Service role** (`services/supabaseAdmin.ts`):
    - Firma publica de entrega (`lib/projectDeliverySignature.ts`): sube firma e
      INE a `project-photos` y firma URLs.
    - Firma publica de servicio (`lib/serviceSignature.ts`): sube firma e INE a
      `project-photos` y firma fotos.
    - `/public/documents/[token]/{pdf,file}` (cliente de
      `lib/publicDocuments.ts`): genera PDFs de entrega, garantia y servicio
      (firman `project-photos`) y firma `project-documents`.
    - `app/api/projects/[id]/delivery/photos/**`: upload, firma y remove en
      `project-photos`.
    - Cron `app/api/services/cron/payment-reminders` y el envio de reporte en
      `app/(admin)/services/[id]/actions.ts`, que generan el PDF del servicio.
    - Portal (`app/portal/services/[id]/page.tsx`):
      `resolveServicePhotoUrl(db.storage | contractorCtx.db.storage)`.
    - Upload del contratista (`app/portal/services/[id]/contractorActions.ts`).
      Sube a `service_reports`, un bucket que no existe en produccion, asi que
      falla hoy. Es un bug aparte, no lo cambia esta migracion.
  - **Contratos publicos** (`app/public/contracts/[token]/{onboarding,sign}`,
    `app/api/public/contracts/[token]/pdf`): service role. INE y firmas se
    guardan como data URL en columnas de `project_contracts`. **Ningun codigo
    usa el bucket `project-contracts`.**
  - **Sesion** (`services/supabaseServer.ts` o `services/supabase.ts`):
    - Solo en paginas `app/(admin)/**`, protegidas por `proxy.ts`, y en API con
      `requireInternalUser`/`requireServicesRole`/`requireWorkOrderRole`.
    - Uploads cliente:
      - `project-photos`: visitas, entregas, entregas de material, ordenes de
        trabajo, `ServiceReportForm`, `QuoteDiagnosticContextEditor` y
        `components/UploadProjectPhoto.tsx`.
      - `project-documents`: `components/UploadDocument.tsx` y
        `UploadAuthorizedPlanButton.tsx`.
      - `product-images`: producto nuevo/editar y `QuickCreateProductButton`.
      - `commercial-partner-assets`: aliados comerciales, con `upsert`.
    - Firmas server: `resolveServicePhotoUrl` (`lib/serviceReports.ts`) desde
      las paginas `app/(admin)/services/**`; `resolvePhotoUrl` de proyectos;
      `lib/quotePdfSnapshot.ts`; `lib/postSalePdf.tsx`; `lib/serviceReportPdf.tsx`
      y `lib/serviceCompletedEmail.ts` desde las API internas.
    - `quote-blinds-private`: rutas `app/api/quotes/blinds/**` (tiene sus
      propias policies, que no cambian).
    - Ningun codigo con sesion hace `remove` en `project-*` ni en
      `product-images`.
  - **URL publica sin RLS** (bucket `public = true`): `product-images` en el
    catalogo publico (`lib/catalogData/*`) y en los PDFs, y
    `commercial-partner-assets` (`lib/commercialPartners.ts`).
- **Migracion:**
  [`sql/20261001g_storage_internal_only.sql`](../../sql/20261001g_storage_internal_only.sql) /
  [`_rollback`](../../sql/20261001g_storage_internal_only_rollback.sql).
  Es idempotente y el rollback restaura exactamente las 27 policies.
  - **Quita:**
    - `Public view/upload for contract onboarding and signatures`;
    - `Allow public uploads*`;
    - `Authenticated staff manage project contracts bucket`;
    - `beta_authenticated_*_storage`;
    - `beta_public_read_product_images` (duplicado);
    - las 3 de escritura de `product_images`;
    - `commercial_partner_assets_select_internal`.
  - **Crea:**
    - `project_contracts_internal_{select,insert,update}` con
      `is_internal_user()`;
    - `project_contracts_internal_delete` solo para admin/direccion;
    - `commercial_partner_assets_select_internal_only` con `is_internal_user()`.
  - **Conserva:**
    - `alfa_internal_*`: lectura, insercion y actualizacion para internos, y
      delete solo admin/direccion;
    - `alfa_public_read_product_images` (catalogo publico);
    - `Public product images 1uh8lhk_0`;
    - `quote_blinds_*`;
    - las demas `commercial_partner_assets_*`.
  - **Efecto para internos no admin:** ya no pueden borrar en `project-*` ni en
    `product-images`. Hoy ningun flujo con sesion lo hace.
- **Orden de despliegue:**
  1. Codigo del portal que firma con service role (`claude/kind-greider-86b2f4`).
     En `main` el portal todavia firma `project-photos` con la sesion del
     cliente y sin `beta_authenticated_read_storage` las fotos del servicio
     dejan de verse.
  2. Esta migracion. Es independiente de P1/P2/Vigia.
- **Ensayo en sandbox `pkqwlvqosooewbejbktx` (2026-10-01):** un solo bloque `DO`
  terminado en `RAISE EXCEPTION`, asi que no persistio nada. Se creo cada bucket
  con 2 objetos semilla y se probaron select, insert, update y delete con
  `anon`, con un `sub` sin perfil interno (equivalente a cliente o contratista)
  y con un interno `comercial`.
  1. Estado de produccion recreado: 27 policies, hash identico a produccion.
     - `anon` subia a `project-contracts`, `project-photos` y
       `project-documents`.
     - El no interno hacia CRUD en `project-*` y `product-images`.
  2. Despues de migrar quedan 18 policies.
     - `anon` y el no interno: 0 filas e insert denegado en `project-contracts`,
       `project-photos`, `project-documents` y `commercial-partner-assets`.
       Solo leen `product-images` y `product_images`. Sin escrituras.
     - Interno: lee, sube y actualiza en `project-*`, `product-images` y
       `commercial-partner-assets`. No borra (es `comercial`).
  3. Correr la migracion otra vez da el mismo hash.
  4. Despues del rollback, y al correrlo otra vez, el hash es identico a
     produccion.
  5. Hash del sandbox antes y despues del ensayo: `2dc2e92a621529bcc74b42e6e648aa40`
     (4 policies, solo `quote-blinds-private`, 0 objetos). Sin cambios.
- **Antes de aplicar en produccion:**
  1. Confirmacion de Leo.
  2. Desplegar el codigo del portal.
  3. Releer el hash. Si ya no es `7479cbd8...`, regenerar el rollback.
  4. Despues, abrir como cliente portal un servicio con fotos y probar subir
     una foto desde una pantalla interna.
- **Fuera de alcance:**
  - El bucket `service_reports` del contratista.
  - `project-contracts` queda vacio y sin uso. Se puede borrar el bucket.
  - `product_images` (heredado, 4 objetos) se puede migrar o borrar.
  - `profile-photos` no tiene policies; su lectura es por URL publica.

## Portal Cliente

- El portal cliente no debe poder acceder a rutas internas.
- Las API que exponen proyectos, servicios, PDF, XML o archivos deben validar pertenencia/acceso.
- Revisar `lib/apiAuth.ts`, `lib/clientPortal.ts` y `PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md` antes de tocar portal.
- Rutas publicas por token deben mantener expiracion, alcance minimo y registro de acceso si el flujo existente lo usa.

## Cambios Que Requieren Sandbox

- Migraciones SQL.
- RLS y storage policies.
- Facturama, CFDI, complementos de pago y credenciales fiscales.
- Auth, roles, proxy, middleware y guards API.
- Rutas publicas de documentos por token.
- Cambios que envian correos, generan documentos fiscales o mutan datos productivos.

## Cambios Que No Deben Hacerse Directo En Produccion

- Timbrar CFDI de prueba con credenciales productivas.
- Cambiar `FACTURAMA_ENV`, `FACTURAMA_ENABLE_PRODUCTION` o variables equivalentes sin confirmacion explicita.
- Borrar datos productivos sin SQL revisado, respaldo y confirmacion.
- Relajar RLS/policies para desbloquear UI.
- Publicar buckets privados.

## Referencias

- [`PROJECT_MAP.md`](./PROJECT_MAP.md)
- [`../SETUP_SANDBOX.md`](../SETUP_SANDBOX.md)
- [`../../PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md`](../../PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md)
