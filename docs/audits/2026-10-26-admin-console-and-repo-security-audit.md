# Auditoría de Seguridad: Aviso Google Admin Console (`.eml`) + Repositorio `alfa-portal`

- **Fecha de auditoría:** 2026-10-26
- **Repositorio auditado:** `c:\Users\Leo Figueroa\Desktop\alfa-portal`
- **Archivo de aviso analizado:** `c:\Users\Leo Figueroa\OneDrive\Desktop\[Notice] Possible unresolved security risks in your Admin Console.eml`
- **Modo de ejecución:** **100% Solo Lectura** sobre código, historial Git, dependencias y cabeceras del correo. No se modificó código existente, no se alteró el worktree previo, no se leyeron ni copiaron valores secretos de `.env*` y no se ejecutaron acciones contra producción.
- **Regla de evidencia:** Cero suposiciones. Todo lo que no puede demostrarse estáticamente desde el repositorio o el archivo `.eml` queda marcado explícitamente como **`Pendiente de confirmar`** en el bloque de cierre para Claude / Leo.

---

## 1. Análisis Forense del Correo Recibido (`.eml`) y su Relación con `alfa-portal`

### 1.1 Autenticidad y alcance real del aviso
De la inspección directa de cabeceras y cuerpo MIME (`text/plain` en Base64 líneas `91-116` y `text/html` líneas `118-1029`):

- **Destinatario:** `leo@alfait.com.mx` (`Delivered-To` línea `1`, `To` línea `84`).
- **Remitente y fecha:** `The Google Workspace Team <workspace-noreply@google.com>`, `Mon, 26 Oct 2026 20:33:00 -0700 (PDT)` (líneas `73-83`).
- **Autenticación de transporte verificada en cabeceras (`mx.google.com`, líneas `26-42`):**
  - `spf=pass` desde `209.85.220.69` (`mail-sor-f69.google.com`, `scoutcamp.bounces.google.com`).
  - `dkim=pass` (`header.i=@google.com`, `header.s=20251104`) y `X-Google-DKIM-Signature` (`d=1e100.net`).
  - `dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=google.com`.
- **Aclaración crítica (sin suponer):**
  - **"Admin Console"** en este correo se refiere a la **Consola de Administración de Google Workspace (`admin.google.com`) de la organización `alfait.com.mx`**, **NO** directamente al panel `/admin` de ALFA OS (`alfa-portal`).
  - **Precaución operativa:** Aunque las firmas DKIM/SPF/DMARC de Google son válidas, el correo contiene enlaces acortados `https://c.gle/...` (líneas `95-99`, `571-574`). Por higiene anti-phishing, **no abras el enlace del correo**: ingresa manualmente escribiendo `https://admin.google.com` en el navegador.

### 1.2 Las 5 alertas exactas reportadas por Google Workspace en el `.eml`

| # | Nivel visual en `.eml` | Texto exacto en el aviso | Qué significa en Google Workspace (`alfait.com.mx`) | Estado |
|---|---|---|---|---|
| 1 | Alto (`high_sguard.png`, `:624-640`) | *"1 users are missing 2SV account protections — Without 2SV, a single instance of password theft can pose huge risks"* (`:856-871`) | **1 cuenta de usuario en `@alfait.com.mx` no tiene Verificación en 2 Pasos (2SV/MFA) activa** (o la política 2SV no está forzada para toda la unidad organizativa). | `Pendiente de confirmar` en `admin.google.com` qué buzón es |
| 2 | Alto (`high_sguard.png`, `:624-640`) | *"In just a week, Workspace orgs like yours detected 149K+ phishing emails with enhanced security"* (`:638-640`) | **Protecciones avanzadas anti-phishing y malware en Gmail** (Safety -> Spoofing and authentication / Attachments / Links) desactivadas o incompletas. | `Pendiente de confirmar` en `admin.google.com` |
| 3 | Medio (`mid_sguard.png`, `:775-785`) | *"Enhance app access protections"* (`:785`) | **Controles de API / OAuth de terceros (`API controls`)** permisivos: usuarios `@alfait.com.mx` podrían autorizar apps OAuth externas no verificadas sobre Gmail/Drive/Calendar. | `Pendiente de confirmar` en `admin.google.com` |
| 4 | Medio (`mid_sguard.png`, `:816-826`) | *"Improve account security"* (`:826`) | **Políticas de cuenta/sesión/recuperación de administradores** (llaves de seguridad, duración de sesión, recuperación de super-admin). | `Pendiente de confirmar` en `admin.google.com` |
| 5 | Bajo (`low_sguard.png`, `:735-745`) | *"Sensitive data protection turned on"* (`:745`) | **Reglas DLP / Protección de datos sensibles** en Workspace (Drive/Gmail) pendientes de configurar o revisar. | `Pendiente de confirmar` en `admin.google.com` |

### 1.3 Intersección directa verificada entre Google Workspace (`@alfait.com.mx`) y `alfa-portal`
Aunque el aviso nace en Google Workspace, **compromete o interactúa directamente con `alfa-portal`** en tres puntos confirmados en código:

1. **Buzones `@alfait.com.mx` críticos para la operación de ALFA OS:**
   En el código fuente están referenciados `leo@alfait.com.mx` (`lib/vigia/brief.ts:209`, `lib/vigia/investigate/email.ts:128`, `public/.well-known/security.txt:1`), `direccion@alfait.com.mx` (`lib/bankAccounts.ts:44`, `lib/serviceSignature.ts:387-388`, `lib/projectDeliverySignature.ts:440`, `app/(admin)/projects/[id]/contract/actions.ts:303`), `facturacion@alfait.com.mx` (`app/api/fiscal-documents/[type]/[id]/send-email/route.ts:62,158`), `soporte@alfait.com.mx` (`lib/vigia/brief.ts:208`, `SUPABASE_AUTH_INVITATION_TEMPLATE.md:67`), `notificaciones@alfait.com.mx` (`lib/contractorNotificationEmail.ts:252`), `contacto@alfait.com.mx` (`app/aviso-de-privacidad/page.tsx:181`) y `no-reply@alfait.com.mx`.
   - **Impacto:** Si la cuenta sin 2SV en Google Workspace es `leo@`, `direccion@`, `facturacion@` o `soporte@` (cuando existen como usuarios reales y no como alias/grupos), el robo de su contraseña expone **comprobantes SPEI de clientes, CFDIs, reportes financieros diarios de El Vigía y correos de recuperación de Supabase, Vercel, Stripe, Resend y Facturama**.
2. **Integración Google Calendar en `alfa-portal` (`lib/googleCalendarSync.ts:75-246`):**
   - El portal **NO** usa OAuth interactivo de usuario (3-legged OAuth) ni login con Google (`signInWithOAuth` no aparece en el repo). Usa un **Google Cloud Service Account** (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`) firmando un JWT `RS256` contra `https://oauth2.googleapis.com/token` con scopes `calendar.events` y `calendar.readonly` (`lib/googleCalendarSync.ts:91-97`) sobre un calendario compartido (`GOOGLE_CALENDAR_ID`).
   - **Implicación al remediar la alerta #3 (*Enhance app access protections*):** Restringir apps OAuth de terceros para usuarios en `admin.google.com` **no romperá** el JWT del Service Account, **pero** restringir la compartición externa de calendarios en Google Workspace sí podría bloquear al Service Account si el proyecto de Google Cloud pertenece a una cuenta externa a la organización `alfait.com.mx` (`Pendiente de confirmar`).
   - **Vulnerabilidad activa en `origin/main` sobre esta integración:** En `origin/main`, `app/api/calendar/test-connection/route.ts` **no tiene autenticación**; cualquier persona sin sesión puede invocar `GET/POST /api/calendar/test-connection`, forzar llamadas OAuth a Google y recibir en JSON el `calendarId` completo y —si hay error 403/404— el `serviceAccountEmail` completo (`lib/googleCalendarSync.ts:167, 213-215`). *(Corregido únicamente en el worktree local sin commitear).*
3. **Autenticación de correo saliente (`alfait.com.mx` + Resend):**
   - `alfa-portal` envía correos transaccionales, recordatorios de pago, contratos, CFDIs y briefs de El Vigía desde múltiples remitentes `@alfait.com.mx` vía `https://api.resend.com/emails`. En las cabeceras del `.eml` (`:30, 42`) aparece `dara=neutral header.i=@alfait.com.mx`, pero el `.eml` es entrante desde `google.com`, por lo que **no permite confirmar** la política DMARC/SPF/DKIM actual de `alfait.com.mx` (`Pendiente de confirmar` vía DNS).

---

## 2. Matriz de Alcance: Auditado en Repo vs Sin Acceso (`Pendiente de confirmar`)

| Superficie | Acceso en esta auditoría | Estado de verificación |
|---|---|---|
| Archivo `.eml` completo (headers + Base64 + HTML) | **Sí (lectura directa)** | Verificado al 100% |
| Código fuente `app/`, `lib/`, `services/`, `components/`, `scripts/`, `sql/`, `supabase/`, `tests/` | **Sí (lectura directa)** | Auditados 53 Route Handlers, 24 archivos `"use server"`, SQL/RLS, configuración y tests |
| Estado Git (`HEAD`, `origin/main`, ramas y worktrees locales) | **Sí (`git` local)** | Verificado (`HEAD = 3f767af`, `origin/main = 0b4d1c9`, worktree `chore/deps-security = 3a0f8de`, 50+ archivos `M`/`??` sin commitear) |
| Validaciones locales (`npm audit`, `npx tsc --noEmit`, `npm run test:security`, `git diff --check`) | **Sí (ejecución local sin red de negocio)** | Ejecutadas y documentadas abajo |
| Valores de `.env.local` | **No leído deliberadamente** | Confirmado que existe y está ignorado por `.gitignore:34,45`; no se leyeron secretos |
| Google Workspace Admin Console (`admin.google.com`) y GCP IAM | **Sin acceso** | `Pendiente de confirmar` por Claude / Leo |
| Registros DNS públicos/autoritativos de `alfait.com.mx` (SPF, DKIM, DMARC) | **Sin acceso desde shell restringido / sin asumir** | `Pendiente de confirmar` por Claude |
| Supabase Producción (`jcdnfjitvyfizcsjvwww`) y Sandbox (`pkqwlvqosooewbejbktx`) en vivo | **Sin acceso vivo** (`.mcp.json` es de Claude Code) | `Pendiente de confirmar` por Claude vía MCP / CLI |
| Vercel (`portal-alfa`, `prj_VjLjbYG3Tb0H9Ey4S45RznKTDqGs`, `team_KO7JrJ1nTu0TggZ99jgmwF0m`) | **Solo metadatos `.vercel/repo.json`** | SHA desplegado, env vars y WAF: `Pendiente de confirmar` |
| Stripe, Facturama, Resend y GitHub Settings (2FA, branch protection, Dependabot) | **Sin acceso** | `Pendiente de confirmar` por Claude / Leo |

---

## 3. Hallazgos Críticos de Estado Git y Dependencias (Evidencia Directa 2026-10-26)

### [GIT-01] CRÍTICA — Ninguno de los parches de seguridad del `2026-09-16` está commiteado ni en `origin/main`
- **Evidencia verificada:**
  - `origin/main` apunta a `0b4d1c9`; la rama actual es `chore/import-syscom-cableado` (`3f767af`). Ningún commit entre septiembre y el `2026-10-25` incluye los parches de la auditoría `docs/audits/2026-09-16-security-audit.md`.
  - Los **30+ archivos de endurecimiento del `2026-09-16` permanecen sin commitear (`M` y `??`) en el worktree local**, mezclados ahora con cambios funcionales del `2026-10-25` (`app/(admin)/inventory/`, compras y rentabilidad).
- **Impacto directo si producción despliega desde `origin/main` (`Pendiente de confirmar` SHA activo en Vercel):**
  Todas estas vulnerabilidades corregidas solo en disco local **siguen abiertas en `origin/main`**:
  1. **Inyección de filtros PostgREST `.or()` con `service_role` (Crítica):** `app/api/public/contracts/[token]/pdf/route.ts` en `origin/main` interpola `token` dentro de `.or(...)` sin validar formato `onb_`/`sgn_` + 48 hex.
  2. **Diagnóstico Google Calendar público sin sesión (Alta/Media):** `app/api/calendar/test-connection/route.ts` en `origin/main` no exige autenticación y expone `calendarId` y correo del Service Account.
  3. **Crons fail-open y con `?key=` en URL (Alta):** `app/api/contracts/cron/daily-reminders/route.ts`, `app/api/services/cron/payment-reminders/route.ts` y `app/api/vigia/cron/daily/route.ts` en `origin/main` quedan públicos si falta `CRON_SECRET` y aceptan secretos por query string.
  4. **Token de Stripe Terminal para cualquier sesión (Alta):** `app/api/terminal/connection-token/route.ts` en `origin/main` solo valida `auth.getUser()`, permitiendo a clientes o contratistas obtener tokens de Stripe Terminal.
  5. **Server Actions privilegiadas sin validación de sesión o rol interno (Crítica/Alta):** En `origin/main`, `convertLeadToClient` (`app/(admin)/leads/actions.ts`), `getContractDispatchContext` (`contract/actions.ts`), `getServiceDispatchContext` y `notifyContractorAction` (`services/[id]/actions.ts`), y `getWarrantyDispatchContext` (`warranty/[warrantyId]/actions.ts`) carecen de guard interno antes de operar con `service_role`; las mutaciones de contratos, servicios, órdenes de trabajo (`work-orders/actions.ts`) y entregas (`deliveries/[deliveryId]/actions.ts`) solo verificaban `auth.getUser()` o carecían de filtro cruzado `projectId`.
  6. **Firmas públicas vulnerables a SSRF/lectura local, reescritura y reseteo de pagos (Alta):** En `origin/main`, `app/public/contracts/[token]/{onboarding,sign}/actions.ts`, `lib/serviceSignature.ts` y `lib/projectDeliverySignature.ts` aceptaban tokens de solo lectura para firmar, permitían sobrescribir contratos ya firmados, reseteaban `payment_status` de `paid` a `pending_payment` y pasaban URLs/rutas arbitrarias en `signatureDataUrl` a `@react-pdf/renderer`.
  7. **Perfiles inactivos, logout roto y caché PWA insegura (Media):** En `origin/main`, `lib/apiAuth.ts`, `lib/clientPortal.ts` y `lib/contractorPortal.ts` no bloqueaban `profiles.is_active = false`; `/auth/signout` no existía (POST desde portal daba 404); `public/sw.js` (`alfa-os-v1`) cacheaba cualquier `.png`/`.ico` aunque tuviera query string firmada o fuera privado; `services/supabaseAdmin.ts` no tenía `import "server-only"`; `next.config.ts` no incluía `frame-ancestors 'self'`.

---

### [DEPS-01] CRÍTICA — `npm audit` detecta 7 vulnerabilidades activas (`1 Critical, 6 High`), incluyendo RCE y SSRF sin autenticación en `next@16.3.4`
- **Evidencia verificada al ejecutar `npm audit --json` hoy (`2026-10-26`):**
  1. **`next` (`16.3.4` instalado en `package.json:28`; rango vulnerable `16.0.0 - 16.4.0`; versión corregida: `16.4.3`) — SEVERIDAD CRÍTICA:**
     - `GHSA-2464-fhr4-w9xw`: Unauthenticated RCE en Image Optimization API con archivos SVG.
     - `GHSA-673q-mjm6-r5xr`: Unauthenticated RCE en funciones `use cache` que retornan typed arrays.
     - `GHSA-vcvr-r3jv-pc5j`: RCE en `next/og` `ImageResponse`.
     - `GHSA-p3m5-59mp-jv5r`: Denial of Service en App Router usando **Server Actions** *(superficie usada intensivamente en `alfa-portal`)*.
     - `GHSA-cjq9-62q9-8jv4`: SSRF en Image Optimization.
     - `GHSA-mcj8-r9mp-w47p` y `GHSA-4jqv-mc3x-m676`: Cache poisoning en SSG/ISR con sustitución de contenido cruzado / DoS persistente.
     - `GHSA-3w37-wq28-93x7` y `GHSA-h694-7cp9-m8p3`: Fugas de caché en `use cache`.
     - `GHSA-f87g-xv8r-7p7x` y `GHSA-39w2-rjm5-chcv`: Divulgación de información en rutas de metadata e interfaz MCP del dev server.
     - **Nota crucial sobre la rama `chore/deps-security` (`3a0f8de`):** Existe un worktree de Claude del `2026-10-20` que sube `next` a `16.3.8` (aún sin mergear a `main`), **pero `16.3.8` YA QUEDÓ DENTRO DEL RANGO VULNERABLE (`16.0.0 - 16.4.0`)**. Se debe actualizar directamente a **`next@16.4.3`** y `eslint-config-next@16.4.3`.
  2. **`sharp` (`<0.35.5`) — ALTA:** `GHSA-wq5f-xc86-pv6w` (`CVE-2026-96889` en `librsvg`).
  3. **`puppeteer-core` (`25.1.0`, vulnerable `22.5.0 - 25.12.0`) -> `chromium-bidi` -> `zod` (`<4.6.6`) — ALTA (`3 paquetes en cadena`):** `GHSA-mrhx-c7xc-m3w5` (agotamiento de memoria validando colecciones).
  4. **`brace-expansion` (`<=1.1.20`) — ALTA:** `GHSA-q2hr-2g5m-vwhr`, `GHSA-qhr7-859c-m2p7`, `GHSA-6j4f-fj2g-mc7p` (DoS CPU / stack exhaustion).
  5. **`source-map-js` (`1.0.0 - 1.2.1`) — ALTA:** `GHSA-68fv-2mgg-jv7q` (DoS del event loop).

---

## 4. Riesgos Confirmados en el Código Actual (Presentes Incluso con el Worktree Local)

### 4.1 Base de Datos, Migraciones SQL, RLS y Storage (Nuevos de Oct 2026 + Arrastrados)

#### [DB-NEW-01] ALTA / CRÍTICA COMERCIAL — `sql/20261025_inventory.sql` expone todo el almacén, costos promedio, proveedores y facturas a clientes y contratistas vía PostgREST
- **Evidencia:**
  - `sql/20261025_inventory.sql:106-117` crea `beta_authenticated_select` (`for select to authenticated using (true)`) en `public.inventory_items` y `public.inventory_movements`.
  - `sql/20261025_inventory.sql:123-142` crea `public.inventory_v_stock` con `security_invoker = true` y otorga `grant select on public.inventory_v_stock to authenticated;`. Como tanto `inventory_items` como `products` (`supabase/migrations/20260702103000_baseline_remote_schema.sql:4963`) tienen `SELECT TO authenticated USING (true)`, `security_invoker` **no filtra usuarios externos**.
  - En Supabase, cualquier usuario de **Portal Cliente** (`role = 'client'`) o **Portal Contratista** posee el rol JWT `authenticated`. Con `NEXT_PUBLIC_SUPABASE_ANON_KEY` + su token de sesión puede consultar `/rest/v1/inventory_v_stock`, `/rest/v1/inventory_items` y `/rest/v1/inventory_movements`, obteniendo `average_cost_mxn`, `unit_cost_mxn`, `stock_value_mxn`, `supplier_id`, `invoice_reference` y `client_project_id` de otros clientes.
  - Adicionalmente, `sql/20261025_inventory.sql:119-120` solo hace `revoke all ... from anon`, omitiendo `revoke all ... from authenticated; grant select ... to authenticated;` (dejando expuesto `TRUNCATE`, que en PostgreSQL no evalúa RLS, si siguen activos los `DEFAULT PRIVILEGES` del baseline `:6588`).
  - **Estado:** Aplicado en sandbox el `2026-10-25` (`docs/modules/inventario/MODULE_CONTEXT.md:5,95`); **bloquear su ejecución en producción** hasta reemplazar `using (true)` por `using (public.is_internal_user())` y revocar privilegios excesivos.

#### [DB-NEW-02] MEDIA / ALTA COMERCIAL — Nuevas columnas de reparto de utilidad con aliados (`2026-10-01`) legibles por el cliente del proyecto vía PostgREST
- **Evidencia:** `sql/20261001_quote_line_discounts_brand_rules.sql:14-18` y `sql/20261001b_partner_profit_share.sql:13-22` agregaron `partner_discount_mxn` y `partner_profit_share_percent` directamente a `public.quotes` y `public.quote_items`. Bajo `quotes_select_access` y `quote_items_select_access` (`sql/20260615_critical_rls_hardening.sql:371-381, 506-519`), un usuario `client` con acceso al proyecto puede hacer `SELECT *` sobre su cotización aprobada en PostgREST y ver qué porcentaje de utilidad o monto en MXN le paga ALFA al aliado comercial/arquitecto. *(En contraste, `brand_commercial_rules` en `:49-58` sí se protegió correctamente con `public.is_internal_user()`).*

#### [DB-NEW-03] MEDIA — Instrucción de tabla de respaldo sin RLS en `sql/20261025_fix_purchase_line_totals.sql`
- **Evidencia:** Las líneas `40-42` recomiendan crear manualmente `public.bkp_20261025_purchase_line_totals` sin incluir `alter table ... enable row level security;`, lo que bajo los `DEFAULT PRIVILEGES` del proyecto expone la tabla públicamente a `anon` en PostgREST (`docs/ai/SECURITY_RULES.md:120`). `Pendiente de confirmar` si se creó esta u otra tabla `bkp_*` en sandbox o producción.

#### [DB-HEREDADOS] CRÍTICA / ALTA POTENCIAL — Brechas en SQL versionado cuyo estado vivo en producción requiere verificación inmediata
1. **Bootstrap interno por defecto + Signup público (`AUTH-01`):** `handle_new_user_profile()` y `ensure_current_user_profile()` (`sql/20260604_separate_internal_and_client_portal_users.sql:88-99, 162-174`; baseline `:84-96, 159-171`) asignan `user_type = 'internal', role = 'comercial', is_internal = true, is_active = true` a cualquier usuario nuevo sin metadata `client_portal`. En `supabase/config.toml:176` figura `enable_signup = true` y el `2026-09-16` se midió `disable_signup: false` en Auth productivo (`Pendiente de confirmar` estado hoy).
2. **Políticas abiertas en SQL versionado (`using (true)` / `or true` / `IS NOT NULL`):**
   - `sql/20260825_project_contracts.sql:153-168`: políticas `anon`/`public` con `onboarding_token IS NOT NULL` y `FOR ALL TO authenticated USING (true)` *(según `SECURITY_RULES.md:38-44` se cerraron manualmente el `2026-09-01`, pero no hay migración correctiva versionada en `sql/`)*.
   - `sql/20260825_contractor_complete_setup.sql:183-208`: `contractor_portal_users` (`FOR ALL TO authenticated USING (true)`) y `contractor_signed_agreements` (`using (user_id = auth.uid() or true)` exponiendo RFC, CURP, CLABE, INE y firmas).
   - `sql/20260825_suppliers_catalog.sql:31-40` (`suppliers`), `sql/20260827_brands_and_catalog_seo.sql:38-43` (`brands`), `baseline:4555-5319` (`products`, `service_reports`, `project_deliveries`, `project_warranties`, `project_purchase_*`, `documents`), `sql/20260830_vigia_phase0.sql:95-104`, `sql/20260901_vigia_action_backups.sql:29-30`, `sql/20260901_vigia_investigations.sql:47-48`, `sql/20260901_quote_voice_drafts.sql:41-42` y `sql/20260901_quote_templates.sql:47-53`: permiten `SELECT` (y en varias `INSERT/UPDATE/DELETE`) a cualquier `authenticated` (`client`/`contractor`).
3. **22 vistas `vigia_v_*` sin `security_invoker = true` ni `REVOKE` versionado:** (`sql/20260830_vigia_phase0.sql`, `20260831_vigia_phase1_batch2.sql`, `20260901_vigia_phase1_sprint_c.sql`, `20260901_vigia_phase1_prc.sql`, `20260901_vigia_calibracion_c.sql`). Al ejecutarse con permisos del owner (`postgres`), saltan el RLS de las tablas base; aun si se revocó `anon` manualmente el `2026-09-01`, `grant select to authenticated` expone reportes financieros y pipeline de todos los clientes a usuarios `client`/`contractor` autenticados (`Pendiente de confirmar` grants actuales en `pg_views` / `role_table_grants`).
4. **Funciones `SECURITY DEFINER` y `has_project_portal_access`:** `next_project_invoice_internal_folio()` y `next_project_profitability_report_number()` tienen `GRANT ALL` a `anon` y `authenticated` en el baseline (`:5678-5686`); `has_project_portal_access(bigint)` (`sql/20260615_critical_rls_hardening.sql:62-80`) no comprueba `profiles.is_active = true`.
5. **Storage policies (`supabase/backups/storage_policies_20260905.sql`):** Muestra 27 políticas activas al 5 de septiembre (subida `anon` en `project-documents`/`project-photos`, lectura/subida `public` en `project-contracts`, y `beta_authenticated_*_storage` anulando las políticas internas por combinación `OR` de políticas `PERMISSIVE`). `Pendiente de confirmar` cuáles siguen vigentes hoy en `storage.objects`.

---

### 4.2 Autorización en Rutas API, Server Actions y Pantallas Administrativas

1. **[AUTHZ-01] ALTA — IDOR Cross-Tenant en administración de usuarios de Portal Cliente y Portal Contratista (`service_role`):**
   - `app/(admin)/clients/[id]/portal-users/actions.ts:243-268` (`assignPortalProjectAccess`): valida que `projectId` pertenezca a `clientId`, pero **no valida que `portalUserId` pertenezca a ese mismo `clientId`** antes del `upsert` en `client_portal_project_access`. Dado que `requirePortalProjectAccessForProfile` (`lib/apiAuth.ts:185-196`) autoriza descargas fiscales PDF/XML confiando en `client_portal_project_access`, una asignación cruzada expone facturas y documentos de otro cliente. En el mismo archivo, `revokePortalProjectAccess` (`:270-291`) ignora `clientId` y `resendClientPortalInvitation` (`:293-332`) envía la invitación antes de verificar pertenencia.
   - `app/(admin)/contractors/[id]/portal-users/actions.ts:175-260, 333-390`: `deactivateContractorPortalUser` y `resendContractorPortalInvitation` actualizan por `id` sin `.eq("contractor_id", contractorId)`. Además, `generateContractorWhatsAppLinkAction` + `ensureContractorProfile` (`:37-94`) genera un link `recovery` antes de verificar si el correo es interno, permite degradar empleados con rol `instalador` a `contractor_portal` (`is_internal: false`), y envía `?token_hash=...` en query string por WhatsApp (expuesto a previsualizadores de enlaces y logs).
2. **[AUTHZ-02] ALTA — Bandeja ejecutiva `/vigia` accesible para cualquier rol interno vía `service_role` y fuera de `proxy.ts`:**
   - `app/(admin)/vigia/page.tsx:21-31` solo verifica `getCurrentInternalUserProfile()` (sin exigir `admin` o `direccion`, a diferencia de sus Server Actions) y consulta `getVigiaOverview()`, `getVigiaFindings()` y `getVigiaAuditLogs()` con `createSupabaseAdminClient()` (`lib/vigia/queries.ts:80,185,255`). Cualquier `instalador`, `compras` o `comercial` que visite `/vigia` ve desvíos de costos, márgenes y hallazgos ejecutivos. Además `/vigia` no figura en `proxy.ts:12-30`.
3. **[AUTHZ-03] MEDIA / ALTA — `/suppliers` fuera de `proxy.ts` y sin verificación de rol en cliente:**
   - `app/(admin)/suppliers/page.tsx:1-30, 154-195` no está en `proxy.ts`, es un Client Component (`"use client"`) y muta `suppliers` directamente desde el navegador sin comprobar `canManagePurchases`.
4. **[AUTHZ-04] MEDIA — Acceso horizontal excesivo con `service_role` en Cotizaciones (Plantillas, Reglas de Marca, Voz y Contratos PDF):**
   - `app/(admin)/quotes/brand-rules/page.tsx:18-40` (expone `%` de utilidad de aliados con `service_role`), `app/(admin)/quotes/templates/page.tsx:27-57` (vuelca clientes/productos/plantillas con `service_role`), `app/(admin)/quotes/templates/actions.ts:20-24, 149-196` (`createDraftFromTemplateAction`), `app/(admin)/quotes/voz/page.tsx:13-21` y `app/api/quotes/draft-from-intent/route.ts:36-42` solo exigen `getCurrentInternalUserProfile()` sin `canManageQuotes(profile.role)`. `app/api/contracts/[id]/pdf/route.ts` también permite a cualquier rol interno (`instalador`, `compras`) descargar cualquier contrato con `service_role`.
5. **[AUTHZ-05] MEDIA — Acciones sin `is_active` / `is_internal`, mutaciones desde navegador y fallback permisivo de roles:**
   - `app/(admin)/post-sale/actions.ts:12-20` (`syncPostSaleProjectStages`) usa `getCurrentUserProfile()` sin comprobar `profile.is_active` ni `profile.is_internal`.
   - `app/(admin)/invoices/actions.ts`, `paymentComplementActions.ts`, `account-statement/paymentActions.ts:60`, `profitability/actions.ts:30` y `contractors/[id]/actions.ts:14` usan `getCurrentUserProfile()` sin comprobar `profile.is_internal === true`.
   - `app/api/admin/users/[id]/route.ts:36-44` (`PATCH`) no verifica que el `id` objetivo sea un usuario interno antes de actualizar `role`, y `POST /api/admin/users` (`:66-73`) no escribe explícitamente `is_internal: true, user_type: 'internal'`.
   - `lib/permissions.ts:17-30`: `normalizeRole(null)` devuelve `"comercial"` e `isInternalRole(null)` devuelve `true`, lo que combinado con `services/profile.ts:19-28` promueve perfiles con campos nulos a `comercial` interno si `user_type` no es `client_portal`/`contractor_portal`.
   - `app/(admin)/admin/operations/page.tsx` (`RegenerateOperationalBaseButton.tsx`) no valida rol `admin` en servidor, e `InvoiceStatusSelect.tsx:37-40` muta `project_invoices.status` directo desde el navegador sin Server Action ni bitácora.

---

### 4.3 Autenticación, MFA, Secretos en URL, Pagos e Integridad Financiera/Operativa

1. **[AUTH-MFA-01] ALTA — Ausencia total de MFA / AAL2 en ALFA OS:**
   - Cero referencias a `mfa`, `aal2` o `getAuthenticatorAssuranceLevel` en todo el repositorio; `supabase/config.toml:302-309` tiene MFA deshabilitado localmente. Operaciones irreversibles (timbrar/cancelar CFDI ante el SAT, crear administradores, ejecutar acciones de Vigía, ver estados financieros) operan con factor simple (`aal1`).
2. **[AUTH-URL-01] ALTA — Secretos en Query String (`?key=`) y captura de tokens en `/auth/accept-invite` y Analytics:**
   - `app/api/quotes/draft-from-intent/route.ts:26-35` y `app/api/vigia/investigate/route.ts:23-29` aceptan secretos por query string (`?key=`), comparten `CRON_SECRET` y comparan con `===` en lugar de `timingSafeEqual`.
   - `app/auth/accept-invite/page.tsx:53-57, 118-174` acepta `access_token`/`refresh_token` por query string, no restringe `type` a `"invite"` y, si ya existe cualquier sesión activa en el navegador, permite cambiar la contraseña de esa sesión (`updateUser({ password })`) sin validar el token de invitación.
   - `app/layout.tsx:64` monta `components/AnalyticsScripts.tsx` y `lib/utmTracking.ts:53-57` globalmente sobre `/public/*/[token]` y `/auth/*`, guardando rutas con capability tokens en `sessionStorage` y enviándolas a GTM/GA4/Meta Pixel si esas variables `NEXT_PUBLIC_*` están activas en producción (`Pendiente de confirmar`).
3. **[FIN-01] ALTA — Webhook de Stripe sin conciliación de monto/moneda/sesión y retorno HTTP 200 en error de BD:**
   - `app/api/webhooks/stripe/route.ts:39-96, 112` verifica firma Stripe, pero liquida `service_reports.payment_status = "paid"` sin comprobar importe esperado, moneda ni sesión vigente; `updateServiceAmountAction` (`app/(admin)/services/[id]/actions.ts:57-87`) no expira en Stripe la Checkout Session anterior cuando sube el monto. Además, si falla el `UPDATE` en Supabase, el webhook responde `200`, perdiendo los reintentos automáticos de Stripe.
4. **[FIN-02] MEDIA / ALTA OPERATIVA — Fallback silencioso a CLABE y RFC ficticios en `lib/bankAccounts.ts`:**
   - `lib/bankAccounts.ts:14-18` usa `process.env.ALFA_BANK_CLABE || "012180015894123567"`, `ALFA_BANK_ACCOUNT || "0158941235"` y `ALFA_COMPANY_RFC || "AIT180612ABC"`. Esta función alimenta contratos legales (`lib/contractPdf.tsx:333`), páginas de firma y pago de servicios (`lib/serviceSignature.ts:193`) y recordatorios automáticos de cobro (`app/api/services/cron/payment-reminders/route.ts:36`). Si esas variables faltan en Vercel (`Pendiente de confirmar`), el sistema entrega datos bancarios falsos a clientes reales en vez de fallar cerrado.
5. **[INV-01] MEDIA — Lógica de sobrantes y guardia de edición en el nuevo módulo de Inventario (`2026-10-25`):**
   - `app/(admin)/inventory/actions.ts:98-167` (`registerPurchaseLeftoverAction`): permite registrar entradas de sobrante ligadas a `purchaseEventId` sin validar en SQL/servidor que la suma acumulada de sobrantes de ese evento sea `<=` la cantidad comprada en `project_purchase_events`.
   - `app/api/projects/[id]/purchases/events/[eventId]/route.ts:92-108`: ignora cualquier `inventoryReadError` (`if (!inventoryReadError && inventoryMovement)`) en vez de ignorar únicamente el código de tabla inexistente (`42P01`/`PGRST205`), por lo que un error transitorio de lectura permitiría editar un evento generado por consumo de almacén.

---

### 4.4 SSRF, Subida de Archivos, Inyección HTML en Correos y Abuso

1. **[SSRF-01] ALTA — SSRF incompleto, inyección CSS en PDF de Cotizaciones y firma interna de contratos sin validar:**
   - `lib/quotePdfSnapshot.ts:311-384`: `isPublicFetchableUrl` no filtra `169.254.0.0/16`, `0.0.0.0`, `100.64.0.0/10`, `[::1]` (corchetes en `URL.hostname`), IPv6 privadas ni redirecciones HTTP, y cae a carga remota directa en Chromium (`lib/quotePremiumPdf.ts:58-75`) si falla el fetch previo. `lib/quotePremiumPdfHtml.ts:177-186, 578-913` incrusta `branding.logoUrl` directo e interpola `primaryColor`/`secondaryColor` en `<style>` sin validar hex estricto.
   - `app/(admin)/projects/[id]/contract/actions.ts:220-248` (`signContractAsAlfaAction`): guarda `signatureDataUrl` sin `isValidContractSignaturePng` (que luego renderiza `@react-pdf/renderer` en `lib/contractPdf.tsx:558-560`) y fija como firmante `"Ing. Leonardo Figueroa Gómez"` aunque invoque la acción cualquier usuario `comercial`.
2. **[UPLOAD-01] MEDIA / ALTA — Cargas con `service_role` sin validación de magic bytes/cuota y sobrescritura de maestros:**
   - `app/portal/services/[id]/contractorActions.ts:30-133`: sube fotos con `service_role` sin magic bytes, sin límite de tamaño/cantidad y sin sanitizar `fileExt`, además de permitir mutar `status` sin whitelist en servicios ya cerrados.
   - `lib/serviceSignature.ts:280-311` y `lib/projectDeliverySignature.ts:81-89, 520-554`: adjuntos INE públicos sin validación de magic bytes ni tope de peso (acepta `image/svg+xml`).
   - `app/portal/contractor-agreement/actions.ts:50-177`: sin límite de peso/formato ni bloqueo de reenvíos, y sobrescribe la tabla maestra `contractors`.
   - `app/public/contracts/[token]/onboarding/actions.ts:15, 122-157`: `select("*")` incluye `signing_token` durante onboarding, guarda URLs de documentos sin validar y sobrescribe datos fiscales maestros en `clients`.
3. **[EMAIL-01] MEDIA — Inyección HTML / Relay en correos salientes vía Resend:**
   - Interpolación sin `escapeHtml` de campos controlados por firmantes públicos o terceros en `lib/serviceSignature.ts:421-462`, `lib/projectDeliverySignature.ts:391-443`, `app/(admin)/services/[id]/actions.ts:224-275`, `app/api/services/cron/payment-reminders/route.ts:108-157`, `app/(admin)/projects/[id]/contract/actions.ts:355-379`, `app/api/contracts/cron/daily-reminders/route.ts:87-191`, `lib/contractorNotificationEmail.ts:120-218`, `app/(admin)/projects/[id]/profitability/actions.ts:160-176` y `lib/vigia/investigate/email.ts:64-69`.
   - `app/(admin)/projects/[id]/deliveries/[deliveryId]/actions.ts:497-599`: permite a cualquier `WorkOrderRole` (incluye `instalador`) enviar correos arbitrarios (`to`, `cc`, `subject`, `html`) desde el dominio `@alfait.com.mx`.
4. **[ABUSE-01] MEDIA — Rate limiting en memoria local y Turnstile fail-open:**
   - `checkBasicRateLimit` (`lib/apiAuth.ts:246`) opera en memoria por instancia serverless; en el worktree (`M`), `app/api/leads/route.ts` permite el alta de leads cuando falta `TURNSTILE_SECRET_KEY` o Turnstile responde `"unavailable"`; `app/api/sat-catalogs/*/route.ts` y `app/api/exchange-rate/route.ts` son públicos sin sesión (los primeros usan `service_role`).

---

### 4.5 Higiene del Repositorio, Archivos Sensibles Versionados y `.gitignore`

Confirmado mediante `git ls-files` y `git check-ignore` (sin leer `.env.local`):
1. **Datos reales de operación, costos y clientes versionados en Git:**
   - `backups/20260830_p48_duplicate_operational_items_pre_fix.json` (expone `project-ref` productivo `jcdnfjitvyfizcsjvwww`, UUID de staff y costos del Proyecto 48) y `backups/20260830_purchase_lines_dedup_phase_pre_fix.json` (7,917 líneas de compras reales).
   - `backups/remote_backup_20260702.sql` (esquema y políticas remotas).
   - `docs/audits/syscom-cableado-backup-20261020.json` (costos de distribuidor Syscom y precios de venta).
   - `sql/20261025_inventory_seed_genki_poke.sql` (cliente `Genki Poke`, proveedor `Adises`, factura `WEB-612566` y costos exactos).
   - `ALFA-0011-V2-premium-v0.pdf` (3.74 MB en la raíz del repo).
   - `scripts/generate_catalog_data.js:4-71` (lista confidencial de costos de integrador Lutron RadioRA 3) y `scripts/build-casa-er-media.mjs:1,12-16` (desanonimiza `"Casa ER"` con el apellido real del cliente residencial).
   - `tmp/next-dev.out.log` y `tmp/next-dev.err.log` (logs de desarrollo versionados).
2. **Brechas en `.gitignore` y scripts con `service_role`:**
   - `.mcp.json`, `.claude/` y `tmp/` **no están en `.gitignore`** (un `git add .` subiría `.mcp.json` y logs).
   - `scripts/import-syscom.mjs`, `scripts/import-dsc-tvc.mjs`, `scripts/backfill-sat-codes.mjs` y `scripts/generate-cctv-catalog.mjs` cargan `.env.local` y escriben con `SUPABASE_SERVICE_ROLE_KEY` **sin guardia de `SANDBOX_REF`**.

---

## 5. Resultados de Validación Ejecutados en Esta Auditoría

| Comando ejecutado | Resultado observado (2026-10-26) |
|---|---|
| `npx tsc --noEmit` | **Aprobado (`exit 0`)** sobre el worktree actual |
| `npm run test:security` | **Aprobado (`29/29` pruebas en verde: `18` en `securityAuth`+`securityHardening` y `11` en `securityRoutes`+`securityPublicSignatures`)** |
| `git diff --check` | **Aprobado (`exit 0`)**; cero errores de whitespace (solo avisos CRLF/LF de Windows) |
| `npm audit --json` | **Falla (`exit 1`): `7` vulnerabilidades (`1 critical` en `next@16.3.4`, `6 high` en `sharp`, `puppeteer-core`, `chromium-bidi`, `zod`, `brace-expansion`, `source-map-js`)** |

---

## 6. Playbook de Continuación para Claude (Revisión de Accesos Externos y Cierre)

> **Instrucción crítica para Claude antes de empezar:**
> 1. Respeta estrictamente [`AGENTS.md`](../../AGENTS.md) y [`docs/ai/SECURITY_RULES.md`](../ai/SECURITY_RULES.md): **no tocar producción sin sandbox, respaldo y plan de rollback; no revertir ni mezclar a ciegas los cambios `M`/`??` del worktree actual**.
> 2. **¡Cuidado con `.mcp.json`!** El archivo `.mcp.json` en la raíz conecta el MCP de Supabase a **`project_ref=pkqwlvqosooewbejbktx` (`alfa-os-sandbox`)**, **NO** al proyecto productivo **`jcdnfjitvyfizcsjvwww` (`Alfa IT`)**. Verifica siempre sobre qué `project_ref` estás ejecutando consultas SQL o `get_advisors` para no confundir el estado de sandbox con el de producción.

### Paso 1 — Google Workspace Admin Console (`admin.google.com`) y GCP (Origen del `.eml`)
*(Requiere revisión en navegador con sesión Super Admin de Leo en `https://admin.google.com` — no usar enlaces `c.gle` del correo).*

- [ ] **1.1 Cerrar la alerta `1 users are missing 2SV account protections` (Prioridad Inmediata):**
  - Ir a **Directory -> Users** -> filtrar por *2-Step Verification: Not enrolled*.
  - Identificar cuál cuenta de `@alfait.com.mx` carece de 2SV (revisar especialmente si `direccion@`, `facturacion@`, `soporte@`, `notificaciones@`, `contacto@` o una cuenta secundaria son buzones con licencia en lugar de Google Groups/alias).
  - Enrolar 2SV (preferentemente Passkey / llave FIDO2 o TOTP, evitando SMS) y en **Security -> Authentication -> 2-step verification** activar **Enforcement: ON** para todas las unidades organizativas, sin dejar cuentas administrativas exentas.
  - Revisar **Reporting -> Audit and investigation -> User log events / Admin log events** de los últimos 30 días para esa cuenta sin 2SV (descartar inicios de sesión sospechosos o reglas de reenvío automático en Gmail).
- [ ] **1.2 Cerrar la alerta de Phishing / Email Security:**
  - En **Apps -> Google Workspace -> Gmail -> Safety**, activar las protecciones avanzadas de *Attachments*, *Links and external images* y *Spoofing and authentication* (alertas de suplantación de nombres de dominio y de empleados de `alfait.com.mx`).
- [ ] **1.3 Cerrar `Enhance app access protections` SIN romper `googleCalendarSync.ts`:**
  - En **Security -> Access and data control -> API controls**:
    - Auditar qué apps OAuth de terceros tienen acceso actual a datos de `@alfait.com.mx` y revocar las no reconocidas.
    - Configurar **Block all third-party API access** para servicios sensibles (Gmail, Drive, Admin) salvo apps explícitamente marcadas como *Trusted*.
    - Verificar en **Google Cloud Console** el Service Account configurado en `GOOGLE_SERVICE_ACCOUNT_EMAIL`: confirmar que solo tenga el permiso necesario sobre el calendario operativo (`GOOGLE_CALENDAR_ID`), que no tenga Domain-Wide Delegation innecesario y revisar la antigüedad/rotación de su llave privada JSON.
    - Si se endurece **Apps -> Google Workspace -> Calendar -> Sharing settings** (compartición externa), verificar que `GOOGLE_CALENDAR_ID` conserve acceso para el `GOOGLE_SERVICE_ACCOUNT_EMAIL` (probar con `/api/calendar/test-connection` una vez desplegado su guard admin).
- [ ] **1.4 Cerrar `Improve account security` y `Sensitive data protection`:**
  - Verificar que existan al menos 2 mecanismos de recuperación / segundo Super Admin con llave física/Passkey, sesiones de consola admin acotadas y reglas básicas de DLP/alerta ante compartición externa en Drive de RFC/CURP/INE/CLABE.

### Paso 2 — Registros DNS de `alfait.com.mx` y Resend
- [ ] Consultar registros reales del dominio (`nslookup -type=txt alfait.com.mx`, `_dmarc.alfait.com.mx` y selectores DKIM de Google y Resend):
  - Confirmar un único registro **SPF** válido que autorice tanto `_spf.google.com` como el dominio de envío de Resend, terminando en `-all` (o `~all` en transición).
  - Confirmar **DKIM** activo tanto en Google Workspace Admin Console (**Gmail -> Authenticate email**) como en el dashboard de **Resend**.
  - Confirmar registro **DMARC** (`_dmarc.alfait.com.mx`) con política `p=quarantine` o `p=reject` y buzón `rua=` monitoreado.

### Paso 3 — Auditoría en Vivo de Supabase: Producción (`jcdnfjitvyfizcsjvwww`) vs Sandbox (`pkqwlvqosooewbejbktx`)
*(Ejecutar exclusivamente en modo lectura).*

- [ ] **3.1 Configuración GoTrue / Auth en Producción (`jcdnfjitvyfizcsjvwww`):**
  - Comprobar `/auth/v1/settings` o Dashboard (**Authentication -> Providers / Sign Up**): ¿sigue `disable_signup: false`? Si el portal opera solo por invitación/alta admin, deshabilitar el registro público tras verificar flujos de invitación de cliente y contratista.
  - Revisar en `auth.users` y `public.profiles` cuentas creadas recientemente que hayan recibido `role = 'comercial'` e `is_internal = true` por el default de `handle_new_user_profile()`.
  - Verificar configuración de MFA (TOTP), longitud mínima de contraseña (`>= 12`) y protección contra contraseñas filtradas (HaveIBeenPwned) en Supabase Auth.
- [ ] **3.2 Inventario SQL de solo lectura y Security Advisors en Producción (`jcdnfjitvyfizcsjvwww`):**
  - Ejecutar el script preparado en [`docs/audits/2026-09-16-database-inventory.sql`](./2026-09-16-database-inventory.sql) y `get_advisors(type: "security")` asegurando apuntar al proyecto productivo (`jcdnfjitvyfizcsjvwww`).
  - Confirmar específicamente en producción:
    1. Definición viva de `handle_new_user_profile()`, `ensure_current_user_profile()`, `has_project_portal_access(bigint)`, `next_project_invoice_internal_folio()` y `next_project_profitability_report_number()`.
    2. Políticas reales en `pg_policies` sobre `project_contracts`, `contractor_portal_users`, `contractor_signed_agreements`, `suppliers`, `brands`, `products`, `service_reports`, `project_deliveries`, `project_warranties`, `vigia_*`, `quote_templates*` y `quote_voice_drafts`.
    3. Políticas reales sobre `storage.objects` (comparar contra las 27 políticas de `supabase/backups/storage_policies_20260905.sql`).
    4. `security_invoker` y `role_table_grants` en las **22 vistas `vigia_v_*`** (verificar tanto `anon` como `authenticated`).
    5. Existencia de cualquier tabla `public.bkp_*` sin RLS activa.
- [ ] **3.3 Estado de Backups y Recuperación:**
  - Confirmar en Supabase Producción estado de backups automáticos / PITR y esquema de respaldo separado para los buckets privados de Storage (`project-contracts`, `project-documents`, `project-photos`, `quote-blinds-private`).

### Paso 4 — Vercel (`prj_VjLjbYG3Tb0H9Ey4S45RznKTDqGs`), Proveedores Externos y GitHub
- [ ] **Vercel (`portal-alfa`):**
  - Confirmar qué **commit SHA** está actualmente desplegado en producción (`alfait.com.mx` / `portal.alfait.com.mx`).
  - Auditar presencia (sin imprimir secretos) de variables críticas en Producción:
    - `CRON_SECRET` (obligatorio para que los crons fallen cerrados al desplegar `lib/cronAuth.ts`).
    - `QUOTE_VOICE_SECRET` (separado de `CRON_SECRET`).
    - `TURNSTILE_SECRET_KEY` y `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
    - `ALFA_BANK_CLABE`, `ALFA_BANK_ACCOUNT`, `ALFA_BANK_BENEFICIARY`, `ALFA_COMPANY_RFC` (confirmar que NO esté cayendo al fallback ficticio `012180015894123567` / `AIT180612ABC` de `lib/bankAccounts.ts`).
    - `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` y si `NEXT_PUBLIC_GTM_ID` / `GA` / `META_PIXEL_ID` están definidos (riesgo de fuga de URLs con `[token]`).
    - `FACTURAMA_ENV` y `FACTURAMA_ENABLE_PRODUCTION`.
- [ ] **GitHub, Stripe, Facturama y Resend:**
  - Confirmar visibilidad privada del repositorio en GitHub, lista de colaboradores, branch protection sobre `main` y 2FA obligatorio en GitHub, Vercel, Supabase, Stripe, Facturama, Resend y registrador DNS.

### Paso 5 — Secuencia Segura de Remediación en Código (Sin Perder Trabajo del Worktree)
1. **Respaldar y separar el worktree actual antes de cualquier merge/checkout:**
   - Separar en ramas limpias:
     - **Rama A (Seguridad Urgente + Deps):** Parches `2026-09-16` del worktree + actualización de `next@16.4.3`, `eslint-config-next@16.4.3`, `sharp@^0.35.5` y cierre de los 7 CVEs de `npm audit` + cierre de `/vigia` y `/suppliers` en `proxy.ts`/páginas + exclusión de rutas `/public/*` y `/auth/*` en `AnalyticsScripts`/`utmTracking` + fail-closed en `lib/bankAccounts.ts` en producción.
     - **Rama B (Inventario + Compras `2026-10-25`):** Código de `inventory` y compras, **corrigiendo antes** `sql/20261025_inventory.sql` (`using (public.is_internal_user())` + `revoke all ... from authenticated; grant select ... to authenticated;`), `registerPurchaseLeftoverAction` (tope `<=` cantidad comprada) y `events/[eventId]/route.ts` (ignorar solo error de esquema faltante).
2. **Endurecimiento coordinado de BD/RLS en Sandbox primero (`pkqwlvqosooewbejbktx`):**
   - Migración aditiva reproducible para `handle_new_user_profile()` / `ensure_current_user_profile()` (deny-by-default coordinado con `POST /api/admin/users`), cierre de políticas `authenticated` abiertas a `client`/`contractor`, `security_invoker` / revocación en vistas `vigia_v_*` y limpieza de políticas heredadas en `storage.objects`.
3. **Validación completa antes de producción:**
   - `npm audit`, `npm run test:security`, `npm run test:inventory`, `npm run test:purchases`, `npx tsc --noEmit`, `npm run build`, `git diff --check` y matriz de pruebas reales en sandbox (`anon`, `client` A/B, `contractor` A/B, interno sin rol, perfil inactivo y `admin`).

---

## 7. Estado tras la remediacion (Claude, 2026-10-26, noche)

Rama `fix/auditoria-seguridad-20261026`, publicada en `origin` y **sin merge a `main`** (un merge despliega a produccion). Ningun SQL se aplico en ningun entorno.

### 7.1 Verificado en vivo (solo lectura)

| Superficie | Resultado |
|---|---|
| Supabase Auth produccion (`/auth/v1/settings`) | `disable_signup: true`, solo email. AUTH-01 contenido mientras se aplica la migracion. |
| Supabase advisors produccion | 22 vistas `vigia_v_*` SECURITY DEFINER (ERROR); 7 funciones SECURITY DEFINER ejecutables por `anon`; proteccion de contrasenas filtradas apagada; 17 tablas con RLS sin policies (deny-all, sin riesgo). |
| Vercel produccion (nombres de variables) | Existen `CRON_SECRET`, `QUOTE_VOICE_SECRET`, Stripe, Facturama, Google. **No existen `ALFA_BANK_*` ni `ALFA_COMPANY_RFC`** (se mostraba a clientes una CLABE con digito verificador invalido y una razon social/RFC que no son los de ALFA). **No existen claves de Turnstile** ni GTM/GA/Meta. |
| DNS `alfait.com.mx` | SPF `include:_spf.google.com ~all`; Resend envia desde `send.alfait.com.mx` (SPF amazonses + DKIM `resend._domainkey`); DKIM Google presente; **DMARC `p=none`**. |
| GitHub / Stripe / Facturama / Google Admin | Sin acceso desde esta sesion. |

### 7.2 Resuelto en codigo (rama)

- GIT-01: los parches del 2026-09-16 quedaron comiteados (`fc7c69f`), separados del inventario, compras y cotizaciones.
- DEPS-01: `next`/`eslint-config-next` 16.4.3, `sharp` 0.35.5, `puppeteer-core` ^25.16; `npm audit` = 0.
- DB-NEW-01/02/03 y DB-HEREDADOS: migraciones propuestas con rollback (`20261001*`, `20261025_inventory` corregido, `20261026_profile_bootstrap_deny_by_default`); portal ya lee con service role (`ctx.db`).
- AUTHZ-01..05, AUTH-URL-01, AUTH-MFA-01 (TOTP opcional), FIN-01, FIN-02, INV-01, SSRF-01, UPLOAD-01, EMAIL-01 y repo (respaldos y `tmp/` fuera de Git, `.gitignore`).
- Validacion: `npm run test:security` 81/81, `test:inventory` 9/9, `test:purchases` 19/19, `test:quote-blinds` 14/14, `test:draft-builder` 10/10, `npx tsc --noEmit` OK, `npm run build` OK (58 paginas), `npm audit` 0, `git diff --check` OK, humo en `localhost` (rutas internas redirigen a login; API sensibles 401/400 sin sesion).

### 7.3 Pendiente para Leo (en orden)

1. **Vercel produccion (urgente):** agregar `ALFA_BANK_NAME`, `ALFA_BANK_BENEFICIARY`, `ALFA_BANK_CLABE`, `ALFA_BANK_ACCOUNT`, `ALFA_COMPANY_RFC` con los datos reales de SISTEMAS ESPECIALES ALFA IT. Mientras falten, la rama muestra "solicita los datos a direccion@" en lugar de datos falsos. Agregar `TURNSTILE_SECRET_KEY` y `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (hoy los formularios publicos funcionan sin CAPTCHA).
2. **Revisar y mergear la rama** (preview de Vercel primero). Decisiones incluidas que conviene confirmar: direccion firma contratos como ALFA con su propio nombre; comercial ya no ve `/quotes/brand-rules`; el PDF de contrato interno queda para admin/direccion/comercial; imagenes de producto `http://` ya no salen en el PDF premium; se quito la captura de GPS en firmas (venia del parche del 09-16).
3. **Supabase:** activar TOTP en Auth > Multi-Factor y la proteccion de contrasenas filtradas. Aplicar en sandbox y luego produccion, despues del deploy: `20261001_quotes_rls_internal_only`, `20261001e`, `20261001f`, `20261001d`, `20261001g`, `20261026_profile_bootstrap_deny_by_default`; `20261025_inventory` solo al liberar inventario. Revisar antes las rutas fiscales `/api/invoices/[id]/*` y `/api/payment-complements/[id]/*`, que tras `20261001e` responden 404 a usuarios de portal.
4. **Google Workspace (`admin.google.com`, sin usar enlaces del correo):** identificar la cuenta sin 2SV y forzar 2SV para toda la organizacion; activar protecciones avanzadas de Gmail; revisar apps OAuth (el calendario usa Service Account, no se rompe); segundo super admin con llave; DLP basico.
5. **DNS:** tras revisar los reportes `rua`, subir DMARC a `p=quarantine` y luego `p=reject`.
6. **Atajo de Siri:** mandar el secreto en `Authorization: Bearer` y despues quitar `?key=` de `draft-from-intent`.

### 7.4 Abierto (no resuelto esta noche)

- Los respaldos con datos reales siguen en el historial de Git; purgarlos exige reescribir historia.
- Scripts de importacion con `service_role` sin guardia de entorno; costos Lutron y apellido de "Casa ER" en `scripts/`.
- Rate limit en memoria por instancia (no hay Redis configurado).
- Monto de Checkout distinto entre admin/cron (sin IVA) y pagina de firma (con IVA): decision de negocio; el webhook acepta ambos.
- Tope de sobrantes y convenio de contratista unico: falta la restriccion atomica en SQL.
- Server Actions limitadas a 1 MB por defecto (afecta fotos/INE grandes; ya pasaba antes).
- Enlace de WhatsApp para contratistas con `token_hash` en query string.
- 5 errores de ESLint preexistentes (`any`, `setState` en efecto) en archivos tocados.
