# Modulo: El Vigia de ALFA OS

Contexto operativo para agentes que quieran entender, mantener o ampliar la capa autonoma de vigilancia. Antes de tocar SQL, RLS o rutas API, revisar [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md).

Estado inferido: activo desde 2026-08-31. Fase 1 en marcha (frentes: integridad de datos y costos/margenes). Riesgo: medio — no toca datos de negocio, pero sus tablas y su cron corren en produccion y envian correo.

Plan completo (vision, fases, bandeja de decision): artifact "El Vigia de ALFA OS" - https://claude.ai/code/artifact/321f9ba1-a6ee-471a-a4e5-f05279cf74a4

## Que Hace

Corre en calendario (Vercel Cron diario) un conjunto de **sensores** deterministas que revisan el negocio. Cada sensor lee una **vista de deteccion** (`public.vigia_v_*`) y produce **hallazgos** que se guardan en `public.vigia_findings` con deduplicacion. Al terminar, arma un **brief** (correo dos niveles) y lo envia. Toda la actividad queda en `public.vigia_audit_log`.

Hoy el Vigia solo **detecta y recomienda**. No ejecuta cambios en tablas de negocio. Las acciones propuestas (`vigia_findings.proposed_action`) se aplican a mano; la capa de ejecutores automaticos es Fase 2 (bandeja de decision con botones autorizar/denegar).

## Arquitectura

```
Sensores (vistas SQL)  ->  Runner  ->  vigia_findings  ->  Brief (correo)  ->  Bandeja /vigia
                              |                                |                    |
                              |                                +-> Ejecutores B1 (1 clic + revertir)
                              |                                +-> Investigar a fondo B2 (playbook + 1 llamada a Claude -> correo aparte)
                              +--------------->  vigia_audit_log  <----------------------+
```

| Pieza | Archivo | Responsabilidad |
| --- | --- | --- |
| Contratos y tipos | `lib/vigia/types.ts` | `Sensor`, `RawFinding`, dominios, carriles, severidad, `severityFromImpact()`. |
| Sensores | `lib/vigia/sensors.ts` | Un `Sensor` por check; cada uno lee su vista `vigia_v_*` y mapea filas a `RawFinding`. Registro en `SENSORS[]`. |
| Enriquecimiento | `lib/vigia/enrich.ts` | Resuelve nombres legibles (proyecto + cliente, producto, cotizacion) y reescribe titulo/resumen para no dejar el numero pelon. Llena `entity_label`. |
| Runner | `lib/vigia/runner.ts` | Corre los sensores, deduplica por `(sensor_id, fingerprint)`, auto-resuelve lo que ya no aparece, reabre lo que reaparece, respeta `descartado`, escribe la bitacora. |
| Brief | `lib/vigia/brief.ts` | Lee hallazgos abiertos, arma el HTML (carriles: Aplicado / Requiere autorizacion / Prestar atencion / Senales por confirmar), lo envia con Resend. `renderVigiaBrief()` devuelve el HTML sin enviar. |
| Endpoint / cron | `app/api/vigia/cron/daily/route.ts` | GET+POST. Auth por `CRON_SECRET`. Params: `?dry=1` (no envia correo ni investiga), `?preview=1` (devuelve el HTML del brief), `?sensors=INT-01,CST-05` (subconjunto). Tras el brief corre `runAutoInvestigations()`. |
| Cron | `vercel.json` | `{ "crons": [{ "path": "/api/vigia/cron/daily", "schedule": "0 13 * * *" }] }` = 07:00 CDMX. Vercel manda el header `Authorization: Bearer $CRON_SECRET` solo -no requiere codigo extra-. |
| Ejecutores (B1) | `lib/vigia/executors.ts`, `app/(admin)/vigia/execute-actions.ts` | Correcciones de 1 clic reversibles desde la Bandeja. Cada ejecutor: `canApply()` (candado de seguridad), `apply()` (guarda snapshot en `vigia_action_backups`), `revert()`. Gate de rol `admin`/`direccion`. |
| Investigar a fondo (B2) | `lib/vigia/investigate/*`, `app/(admin)/vigia/investigate-actions.ts`, `app/api/vigia/investigate/route.ts` | Hibrido: un **playbook** determinista (`playbooks.ts`, solo lectura) arma un expediente + **una** llamada a Claude (`interpret.ts`, structured output) lo interpreta. Resultado en `vigia_investigations` + correo aparte (`email.ts`). Candado de costo mensual (`budget.ts`). Disparo: boton en la Bandeja, `POST /api/vigia/investigate {findingId}` (CRON_SECRET o sesion admin/direccion), o automatico para `severity=critico` en el cron (`runAutoInvestigations()`). |

### SQL versionado

| Archivo | Contenido |
| --- | --- |
| `sql/20260830_vigia_phase0.sql` | Tablas `vigia_sensor_runs`, `vigia_findings`, `vigia_audit_log` + RLS + vistas INT-01..04, CST-01..03. |
| `sql/20260831_vigia_phase1_batch2.sql` | Vistas INT-05..10, CST-04..05. |
| `sql/20260831_vigia_snooze.sql` | Columna `snooze_until` + status `pospuesto`. |
| `sql/20260901_vigia_action_backups.sql` | Tabla `vigia_action_backups` (snapshots de los ejecutores B1). |
| `sql/20260901_vigia_investigations.sql` | Tabla `vigia_investigations` (expedientes + diagnostico de B2). |
| `sql/20260901_vigia_phase1_sprint_c.sql` | Vistas VTA-01..03 (Ventas) y SRV-01..02 (Postventa/Servicios). |
| (migracion `vigia_findings_entity_label`) | `alter table vigia_findings add column entity_label text`. |

Las migraciones se aplicaron a produccion via el flujo de Supabase; son **aditivas** (solo objetos nuevos `vigia_*`). No tocan ninguna tabla, columna, RLS ni dato de negocio.

## Tablas

| Tabla | Rol | Notas |
| --- | --- | --- |
| `vigia_sensor_runs` | Una fila por corrida de un sensor | `status` running/ok/error, `findings_count`, `resolved_count`, `error`. |
| `vigia_findings` | Un hallazgo. Unico por `(sensor_id, fingerprint)` | `lane` (auto_aplicado / requiere_autorizacion / prestar_atencion), `severity`, `confidence`, `status` (abierto / reconocido / descartado / resuelto / auto_aplicado / expirado), `evidence` jsonb, `impact_mxn`, `entity_type` + `entity_id` + `entity_label`, `proposed_action` jsonb, `first_seen_at` / `last_seen_at` / `seen_count`, `decided_by` / `decided_at` / `decision_note`. |
| `vigia_audit_log` | Bitacora append-only | `event_type` (finding_created / finding_reopened / finding_resolved / sensor_error / run_completed / brief_sent / action_applied / action_reverted / investigation_started / investigation_completed / investigation_failed / investigation_skipped_budget / investigation_emailed), `payload` jsonb. |
| `vigia_action_backups` | Snapshot previo de cada correccion de 1 clic (B1) | `action_type`, `snapshot` jsonb, `applied_at`, `reverted_at`. |
| `vigia_investigations` | Un expediente + diagnostico por investigacion a fondo (B2) | `trigger` (manual / auto_critico), `status` (running / completada / error / sin_presupuesto), `playbook`, `dossier` jsonb, `interpretation` jsonb, `model`, `input_tokens` / `output_tokens`, `cost_usd`. El gasto del mes = suma de `cost_usd` con `started_at` dentro del mes. |

**RLS:** las tres tablas tienen RLS activo con una sola policy: `select` para `authenticated`. Toda escritura la hace el runner con el cliente admin (`createSupabaseAdminClient`, service_role), que salta RLS. La bandeja UI (Fase 2) escribira decisiones por API con guard de rol, no por RLS abierta.

## Como agregar un sensor

1. **Vista de deteccion.** Nueva migracion en `sql/` con `create or replace view public.vigia_v_<id>_<slug> as ...`. La logica pesada (joins, group by, umbrales) vive en SQL para que sea revisable. La vista devuelve las columnas que el sensor necesita para armar el hallazgo. Terminar con `notify pgrst, 'reload schema';`. Aplicar la migracion.
2. **Sensor.** En `lib/vigia/sensors.ts`, agregar un `Sensor` con `id` (`INT-XX`, `CST-XX`, `VTA-XX`, `SRV-XX`), `domain`, `run()` que consulta la vista y devuelve `RawFinding[]`. Registrarlo en `SENSORS[]`.
3. **Fingerprint.** Clave estable que identifique el mismo problema del mundo real entre corridas (ej. `INT-01:cp:48:prod:351:colision_quote_item`). Si cambia el fingerprint, el hallazgo viejo se auto-resuelve y nace uno nuevo.
4. **Carril y confianza.** `requiere_autorizacion` si hay una accion clara que implica criterio; `prestar_atencion` si solo hay que mirar; `auto_aplicado` reservado para Fase 2. `confidence` baja manda el hallazgo a "Senales por confirmar" (seccion colapsada del brief).
5. **Probar.** `GET /api/vigia/cron/daily?dry=1&sensors=<TU-ID>` (local o prod). Revisar `vigia_findings` y `vigia_audit_log`.
6. **Documentar.** Agregar el sensor a la lista de abajo.

## Como agregar un playbook de investigacion (B2)

1. En `lib/vigia/investigate/playbooks.ts`, agregar un `Playbook` con `sensorId` (el `INT-XX` / `CST-XX` que atiende) y `run()` que arma un `InvestigationDossier` **solo con consultas de lectura**. Registrarlo en `PLAYBOOKS[]`.
2. El dossier lleva `bloques` (datos crudos con titulo) y `senales` (pistas deterministas — NO la conclusion; eso lo pone el modelo).
3. Si no hay playbook para el sensor, se usa `genericPlaybook` (contexto de entidad + evidencia + bitacora).
4. El modelo se llama **una sola vez** por investigacion (`interpret.ts`). No agregar mas llamadas: el costo se controla por el candado mensual, no por playbook.
5. Probar tras deploy: boton "Investigar" en un hallazgo de ese sensor en `/vigia`, o revisar `vigia_investigations`.

## Sensores actuales

| ID | Dominio | Detecta |
| --- | --- | --- |
| INT-01 | integridad_datos | Partidas operativas duplicadas (misma partida/producto activa dos veces en un proyecto). |
| INT-02 | integridad_datos | Lineas de compra huerfanas con historial de compras. |
| INT-03 | integridad_datos | Partidas operativas de una version de cotizacion ya superada. |
| INT-04 | integridad_datos | Lineas de compra que piden mas que la base operativa activa. |
| INT-05 | integridad_datos | Compra en USD sin tipo de cambio. |
| INT-06 | integridad_datos | Partida operativa en USD sin tipo de cambio, con compra pendiente. |
| INT-07 | integridad_datos | Cotizacion aprobada sin proyecto vinculado. |
| INT-08 | integridad_datos | Proyecto ganado/entregado sin cotizacion aprobada. |
| INT-09 | integridad_datos | Total estimado de la linea de compra desincronizado del calculo. |
| INT-10 | integridad_datos | Cantidad de la partida operativa distinta a la del quote_item vigente. |
| CST-01 | costos_margenes | Sobrecosto real de compra vs estimado operativo (por evento). |
| CST-02 | costos_margenes | Costo de proveedor sin actualizar en producto por comprarse o en cotizacion aprobada vigente. |
| CST-03 | costos_margenes | Deriva entre el TC cotizado y el TC real al que se compro. |
| CST-04 | costos_margenes | Producto de equipo sin costo alimentando un margen falso (excluye servicios ALFA). |
| CST-05 | costos_margenes | Sobrecosto acumulado de compras a nivel proyecto (rollup de CST-01). |
| VTA-01 | ventas_pipeline | Leads nuevos desatendidos (> 24h sin primer contacto o asignación). |
| VTA-02 | ventas_pipeline | Cotizaciones dormidas de alto valor (> $100k MXN, > 7 días en borrador/enviada). |
| VTA-03 | ventas_pipeline | Proyectos ganados ('won') sin anticipo registrado (> 10 días). |
| SRV-01 | postventa_servicios | Proyectos con garantía por vencer en < 45 días sin póliza de mantenimiento activa. |
| SRV-02 | postventa_servicios | Tickets o reportes de servicio estancados (> 72h sin actualización técnica). |

## Variables de entorno

| Var | Uso |
| --- | --- |
| `CRON_SECRET` | Candado del endpoint. Vercel lo manda solo como Bearer en el cron. Requerido en produccion. |
| `RESEND_API_KEY` | Envio del brief (ya existe para otros correos del repo). |
| `VIGIA_BRIEF_TO` | Destinatario(s) del brief, separados por coma. Default `leo@alfait.com.mx`. |
| `VIGIA_BRIEF_FROM` | Remitente. Default `ALFA - El Vigia <soporte@alfait.com.mx>`. |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Enlaces del brief. Cae a `getAppBaseUrl()` (`lib/appUrl.ts`). |
| `ANTHROPIC_API_KEY` | Investigar a fondo (B2). Es la unica pieza del Vigia que llama a un modelo. Facturacion por tokens en console.anthropic.com (no es la suscripcion Claude Pro). Si falta, la investigacion falla con mensaje claro y el resto del Vigia sigue igual. |
| `VIGIA_INVESTIGATE_MONTHLY_CAP_USD` | Tope mensual duro de gasto en investigaciones. Default `25`. Al alcanzarlo, las investigaciones quedan `sin_presupuesto` y no se llama al modelo. |
| `VIGIA_INVESTIGATE_MAX_PER_RUN` | Investigaciones automaticas por corrida del cron. Default `3`. |
| `VIGIA_INVESTIGATE_AUTO` | `"0"` apaga la investigacion automatica de criticos (la manual sigue). Default: encendida. |
| `VIGIA_INVESTIGATE_MODEL` | Override del modelo. Default `claude-sonnet-5`. |
| `VIGIA_INVESTIGATE_TO` | Destinatario del correo de investigacion. Cae a `VIGIA_BRIEF_TO`. |
| `VIGIA_PRICE_INPUT_USD_PER_MTOK` / `VIGIA_PRICE_OUTPUT_USD_PER_MTOK` | Precios para calcular `cost_usd`. Default `3` / `15` (Sonnet). |

Vercel plan Pro: cron a cualquier frecuencia, `maxDuration` hasta 300s (el cron y la pagina `/vigia` lo declaran). El cron diario corre sensores + brief + hasta 3 investigaciones automaticas dentro de esa ventana.

## Restricciones

- Los sensores y los playbooks de investigacion son **solo lectura** sobre tablas de negocio. Nunca escribir desde ahi.
- El modelo (B2) solo interpreta el expediente y **propone**. Nunca aplica cambios: su salida es texto que llega por correo y queda en `vigia_investigations`.
- Fiscal / facturacion: la investigacion nunca recomienda tocar CFDI ni datos fiscales (lo dice el system prompt de `interpret.ts`).
- No relajar la RLS de las tablas `vigia_*` ni la auth del endpoint para depurar.
- Un sensor ruidoso erosiona la confianza. Preferir alcance estrecho y `confidence` honesta; calibrar con el historial de `descartado`.
- Toda estructura nueva va en migracion revisable en `sql/` y se refleja aqui.
