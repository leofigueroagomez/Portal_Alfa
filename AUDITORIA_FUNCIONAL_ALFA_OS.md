# Auditoria funcional ALFA OS

Fecha: 2026-06-04

Objetivo: inventariar lo existente antes de construir nuevos modulos, separando funcionalidad terminada, parcial, redundante o pendiente.

## Resumen ejecutivo

| Modulo | Estado | Lectura rapida |
| --- | --- | --- |
| Comercial | Parcial | Landing, leads, clientes, productos y cotizaciones existen. Falta cerrar duplicidad CRM/ingenieria y endurecer conversion lead-cliente-proyecto. |
| Operaciones | Parcial | Proyectos, visitas, base operativa, ordenes de trabajo, entregas de material y evidencias existen. Falta agenda, cambios y automatizaciones programadas. |
| Compras | Parcial | Lineas de compra, eventos, avance y variaciones existen. Falta orden de compra/proveedor formal, aprobaciones y recepcion contable. |
| Contratistas | Parcial | Catalogo, movimientos, asignacion en OT y estado de cuenta existen. Falta liquidacion/aprobacion y flujo de pago completo. |
| Facturacion | Parcial | Facturas internas, conceptos, SAT, Facturama, PDF/XML y formas de pago existen. Falta cobranza/complementos y cancelacion completa. |
| Rentabilidad | Parcial | Calculo, reporte, historico y correo a direccion existen. Falta cierre financiero integral y validaciones de costos incompletos. |
| Postventa | Parcial | Entregas, garantias, PDFs, correo a cliente, links publicos y tablero postventa existen. Falta mantenimiento recurrente y tickets postventa. |
| Portal Cliente | Parcial | Existe pantalla de detalle cliente, pero usa tablas legacy y datos hardcodeados. Requiere reconstruccion sobre `client_projects`. |
| Direccion | Parcial | Dashboard general y direccion existen. Falta consolidacion ejecutiva con permisos, metas y reportes exportables. |

## 1. Comercial

Estado: Parcial

Rutas:
- Publicas: `/`, `/servicios/audio-video`, `/servicios/cctv`, `/servicios/control-de-acceso`, `/servicios/redes`, `/alfa-os`.
- ERP: `/leads`, `/clients`, `/clients/new`, `/clients/[id]`, `/clients/[id]/edit`, `/customers` redirige a `/clients`.
- Cotizaciones comerciales: `/quotes`, `/quotes/new`, `/quotes/[id]`, `/quotes/[id]/edit`, `/quotes/[id]/print`.
- Ingenieria comercial/tecnica: `/engineering`, `/engineering-quotes`, `/engineering-quotes/new`, `/engineering-quotes/[id]`, `/engineering-quotes/[id]/edit`, `/engineering-quotes/[id]/print`.
- Productos: `/products`, `/products/new`, `/products/[id]/edit`, `/product-categories`, `/product-tags`.

Tablas:
- Usadas o extendidas: `leads`, `clients`, `client_projects`, `quotes`, `quote_groups`, `quote_sections`, `quote_items`, `engineering_quotes`, `products`, `product_categories`, `product_tags`.
- Nuevas/extendidas por SQL: `leads`, campos fiscales y comerciales en `clients`, campos fiscales/costos en `products`, `labor_activity_catalog`, `quote_item_labor_activities`.

Funciones:
- Captura publica de leads en `app/api/leads/route.ts`.
- Aprobacion de cotizacion comercial en `ApproveQuoteVersionButton`.
- Aprobacion de cotizacion de ingenieria en `ApproveEngineeringQuoteButton`.
- Calculo de mano de obra de cotizaciones en `lib/quoteLaborActivities.ts`.
- Calculo de propuestas de servicio en `lib/serviceProposal.ts`.
- Validaciones fiscales de clientes/productos en `lib/fiscalData.ts` y `lib/productFiscalData.ts`.

Correos:
- No hay correo comercial de lead o cotizacion detectado.
- Si se aprueba una cotizacion comercial, se dispara notificacion interna WhatsApp por `/api/notifications/quote-approved`.

Automatizaciones:
- Al aprobar cotizacion comercial: archiva versiones aprobadas previas, marca la version actual como aprobada, actualiza `quote_groups.approved_quote_id`, sincroniza base operativa y dispara notificacion interna.
- Captura de lead publica guarda con `supabaseAdmin` y hace fallback si faltan columnas nuevas.

Reportes:
- Listados de leads, clientes, productos y cotizaciones.
- PDF/print de cotizacion comercial e ingenieria.
- Dashboard general incluye leads, clientes, cotizaciones abiertas y ventas estimadas.

Observaciones:
- `customers` es alias redundante de `clients`.
- Conviven `quotes` y `engineering_quotes`; puede ser intencional, pero el flujo de traspaso entre ingenieria y cotizacion comercial no esta totalmente claro.
- No se ve automatizacion de seguimiento comercial, recordatorios, pipeline por responsable o conversion formal lead -> cliente -> proyecto.

## 2. Operaciones

Estado: Parcial

Rutas:
- `/projects`, `/projects/[id]`.
- Visitas: `/projects/[id]/site-visits`, `/new`, `/[visitId]`, `/edit`, `/print`.
- Base operativa/traduccion: `/projects/[id]/translation`.
- Ordenes de trabajo: `/projects/[id]/work-orders`, `/new`, `/[workOrderId]`, `/print`.
- Entregas de material: `/projects/[id]/material-deliveries`, `/new`, `/[deliveryId]`, `/print`.
- Admin operativo: `/admin/operations`.

Tablas:
- `client_projects`, `project_site_visits`, `project_site_visit_notes`, `project_site_visit_note_photos`.
- `project_operational_items`, `project_operational_item_labor_activities`, `project_translation_changes`.
- `work_orders`, `work_order_activities`.
- `project_material_deliveries`, `project_material_delivery_items`.
- Legacy/mixto: `documents` para planos autorizados.

Funciones:
- `syncProjectOperationalItems()` y `syncAllApprovedProjectOperationalItems()` en `lib/projectOperationalItems.ts`.
- `getWorkOrderProgress()`, labels y URLs de fotos en `lib/workOrders.ts`.
- `getPurchaseDeliveryStatus()` y disponibilidad en `lib/materialDeliveries.ts`.
- Edicion de datos de sitio, visitas, notas, fotos, OT, avance de actividades y entrega de material en paginas/componentes del modulo.

Correos:
- No hay correo operativo directo para visitas/OT/material detectado.
- Visita creada puede disparar WhatsApp interno por `/api/notifications/site-visit-created`.

Automatizaciones:
- Regenerar base operativa desde cotizaciones aprobadas.
- Marcar items obsoletos como `deleted` si desaparecen de una cotizacion aprobada editada.
- Generar actividades de mano de obra desde actividades de cotizacion o legacy "Mano de obra general".
- Boton admin para regenerar base operativa historica.
- Subida de plano autorizado dispara notificacion interna.

Reportes:
- Prints de visita de obra, orden de trabajo, entrega de material y lista de equipo.
- Vista de proyecto con conteos operativos, ultimas visitas, plano autorizado y accesos a submodulos.

Observaciones:
- `futureModules` en proyecto declara pendientes: Agenda y Control de cambios.
- Las automatizaciones son mayormente acciones por boton o por aprobacion en cliente; no se detectan jobs programados.
- `documents` y `project-documents` conviven con entidades nuevas de entregas y evidencias; conviene normalizar.

## 3. Compras

Estado: Parcial

Rutas:
- `/projects/[id]/purchases`.
- Acciones cliente: `ProjectPurchaseActions`, `RecalculatePurchaseLinesButton`.
- Consumo en direccion: `/director-dashboard`.

Tablas:
- `project_purchase_lines`.
- `project_purchase_events`.
- Campos agregados por entregas de material: `quantity_delivered`, `delivery_status` en `project_purchase_lines`.

Funciones:
- `summarizePurchaseTotalsByCurrency()`.
- `summarizePendingBySupplier()`.
- `getPurchaseProgressPercent()`.
- `getPurchaseLineVariation()` y `summarizePurchaseVariationMxn()`.

Correos:
- No detectados para solicitud/aprobacion/recepcion de compras.

Automatizaciones:
- Lineas de compra derivan de base operativa/cotizaciones.
- Eventos de compra acumulan cantidad comprada, costo real, moneda, tipo de cambio y estatus almacen.
- Entregas de material calculan disponibilidad/estado contra compras.

Reportes:
- Avance de compras por proyecto.
- Resumen por proveedor y moneda.
- Variacion estimado vs real en MXN.
- Dashboard direccion consume compras y variaciones.

Observaciones:
- No existe entidad formal de orden de compra, proveedor maestro, autorizacion de compra, factura de proveedor ni pago proveedor.
- La compra esta modelada por linea/evento, suficiente para control operativo pero parcial para ERP financiero.

## 4. Contratistas

Estado: Parcial

Rutas:
- `/contractors`, `/contractors/new`, `/contractors/[id]`, `/contractors/[id]/edit`, `/contractors/[id]/statement/print`.
- Relacion con OT: `/projects/[id]/work-orders/[workOrderId]`, boton `ApplyContractorChargeButton`.

Tablas:
- `contractors`.
- `contractor_account_movements`.
- Campos en `work_orders`: `contractor_id`, `contractor_amount_mxn`, `contractor_payment_status`.

Funciones:
- `getContractorMovementLabel()`.
- `getContractorPaymentStatusLabel()`.
- `getSignedContractorMovementAmount()`.
- `getContractorBalance()` y `getContractorBalanceLabel()`.
- Acciones server en `app/(admin)/contractors/[id]/actions.ts`.

Correos:
- No detectados.

Automatizaciones:
- Aplicar cargo de contratista desde orden de trabajo.
- Estado de cuenta calcula cargos/pagos/ajustes desde movimientos.

Reportes:
- Estado de cuenta imprimible por contratista.
- Listado y detalle de contratistas.

Observaciones:
- Falta flujo de aprobacion de pago, dispersion/registro de pago real, documentos fiscales de contratista y conciliacion.
- Posible duplicidad conceptual entre costo de OT (`contractor_amount_mxn`) y movimientos de cuenta si no se controla idempotencia.

## 5. Facturacion

Estado: Parcial

Rutas:
- `/invoices`.
- `/projects/[id]/invoices`.
- APIs: `/api/invoices/[id]/pdf`, `/api/invoices/[id]/xml`.
- Catalogos SAT: `/api/sat-catalogs/product-services`, `/units`, `/tax-objects`, `/payment-forms`, `/fiscal-regimes`, `/cfdi-uses`.

Tablas:
- `project_invoices`, `project_invoice_items`.
- `sat_product_service_catalog`, `sat_unit_catalog`, `tax_object_catalog`, `sat_payment_form_catalog`.
- `fiscal_regime_catalog`, `cfdi_use_catalog`.
- Campos fiscales en `clients` y `products`.

Funciones:
- `stampProjectInvoice()` en `app/(admin)/invoices/actions.ts`.
- `stampFacturamaInvoice()` y `downloadFacturamaInvoiceFile()` en `lib/facturama.ts`.
- `getNextInternalInvoiceFolio()` en `lib/invoiceFolios.ts`.
- Validaciones CFDI/RFC/SAT en `lib/fiscalData.ts`, `lib/productFiscalData.ts`, `lib/rfc.ts`, `lib/paymentTerms.ts`.
- Helpers de estatus y totales en `lib/invoices.ts`.

Correos:
- No se detecta envio de factura por correo.

Automatizaciones:
- Timbrado con Facturama.
- Guardado de `facturama_id`, `sat_uuid`, `pdf_url`, `xml_url`, `last_error`, `facturama_response`.
- Validacion estricta de RFC, regimen, uso CFDI, CP fiscal, conceptos, formas y metodos de pago.

Reportes:
- Listado global de facturas.
- Facturas por proyecto.
- Descarga PDF/XML.
- Estado de cuenta de proyecto consume facturacion/pagos.

Observaciones:
- Estatus contempla `draft`, `issued`, `cancelled`, `paid`, pero no se ve flujo completo de cancelacion SAT.
- Existen campos de complemento de pago (`requires_payment_complement`, `payment_complement_status`), pero no se detecta generacion/timbrado de complemento.
- No se detecta envio automatico al cliente ni control de cobranza vencida.

## 6. Rentabilidad

Estado: Parcial

Rutas:
- `/projects/[id]/profitability`.
- `/projects/[id]/profitability/print`.

Tablas:
- `project_profitability_reports`.
- Fuentes: `quotes`, `project_purchase_lines`, `work_orders`, `project_payments`.

Funciones:
- `calculateProjectProfitability()` y `getLatestProfitabilityReport()` en `lib/projectProfitability.ts`.
- `createOrUpdateProfitabilityReport()` y `sendProfitabilityReportToDirector()` en acciones de rentabilidad.
- `getMarginClassification()` para semaforo de margen.

Correos:
- Envio de reporte a direccion con Resend.
- Requiere `DIRECTOR_EMAILS`, `RESEND_API_KEY`, `EMAIL_FROM`.
- Guarda estatus, destinatarios, error y fecha en `project_profitability_reports`.

Automatizaciones:
- Calcula venta aprobada, compras realizadas, costos de OT, otros costos, utilidad y margen.
- Genera/actualiza snapshot historico de rentabilidad.

Reportes:
- Pantalla de rentabilidad.
- Print de rentabilidad.
- Correo ejecutivo a direccion.

Observaciones:
- El calculo advierte si faltan compras o costos OT, pero aun permite reporte.
- No incluye todos los posibles costos reales: gastos indirectos, viaticos, garantias, facturas proveedor, pagos contratista liquidados.
- No se detecta cierre financiero/aprobacion final de rentabilidad.

## 7. Postventa

Estado: Parcial

Rutas:
- `/post-sale`.
- Entregas: `/projects/[id]/deliveries`, `/new`, `/[deliveryId]`, `/print`.
- Garantias: `/projects/[id]/warranty`, `/new`, `/[warrantyId]`, `/print`.
- Links publicos: `/public/documents/[token]`, `/public/documents/[token]/pdf`.
- APIs PDF: `/api/projects/[id]/deliveries/[deliveryId]/pdf`, `/api/projects/[id]/warranty/[warrantyId]/pdf`.
- Servicios: `/services`, `/services/new`, `/services/[id]`, `/services/[id]/edit`, `/services/[id]/print`, `/services/[id]/proposal`, `/proposal/print`.

Tablas:
- `project_deliveries`, `project_delivery_evidences`, `project_delivery_pending_items`.
- `project_delivery_systems`, `project_delivery_email_history`, `public_document_links`.
- `project_warranties`.
- `service_reports`, `service_report_photos`.

Funciones:
- `generateProjectDeliveryPdf()` y `generateWarrantyLetterPdf()` en `lib/postSalePdf.tsx`.
- `getProjectDeliverySystemsForDisplay()` en `lib/projectDeliverySystems.ts`.
- `previewProjectDeliveryEmail()` y `sendProjectDeliveryEmail()`.
- `syncPostSaleProjectStages()`.
- `formatServiceDate()`, `getSolutionLabel()`, `resolveServicePhotoUrl()`.

Correos:
- Correo formal de entrega/garantia al cliente con Resend.
- Adjunta PDF de acta de entrega y carta garantia.
- Guarda historial en `project_delivery_email_history`.
- Usa CC por `POSTSALE_CC_EMAILS`.

Automatizaciones:
- Crear links publicos tokenizados para entrega y garantia.
- Validar URLs publicas antes de enviar correo.
- Sincronizar proyectos a `delivered` o `warranty` desde entregas/garantias.
- Calcular proximo mantenimiento sugerido desde frecuencia.

Reportes:
- Acta de entrega PDF.
- Carta garantia PDF.
- Pantalla postventa con vencimiento de garantia, proximo mantenimiento y saldo.
- Reportes/prints de servicio y propuesta.

Observaciones:
- No existe agenda/recordatorio real de mantenimiento preventivo.
- No se detectan tickets postventa conectados a garantias.
- Servicios existen, pero parecen operar como reportes/propuestas separados, no como ciclo completo de postventa recurrente.

## 8. Portal Cliente

Estado: Parcial

Rutas:
- `/dashboard/projects/[id]` dentro de `app/(client)`.

Tablas:
- Usa tablas legacy: `projects`, `documents`, `project_photos`, `project_updates`, `profiles`.
- El ERP principal usa `client_projects`, `project_site_visits`, `project_deliveries`, `project_warranties`, `project_payments`, `public_document_links`.

Funciones:
- Componentes legacy: `UploadProjectPhoto`, `UploadDocument`, `AddProjectUpdate`.
- Muestra timeline, evidencias, documentos, responsable y datos del proyecto.

Correos:
- No detectados desde portal cliente.

Automatizaciones:
- Subida de fotos/documentos legacy.
- Agregar actualizacion de proyecto.

Reportes:
- No detectados.

Observaciones:
- Hay datos hardcodeados: `user.id`, saldo pendiente, fecha compromiso.
- Riesgo alto de duplicidad de datos por uso de `projects` vs `client_projects` y `documents/project_photos` vs entidades nuevas.
- No se ve proteccion especifica por cliente/proyecto mas alla del middleware general para `/dashboard`.
- Recomendacion: reconstruir este modulo sobre el modelo actual antes de exponerlo a clientes.

## 9. Direccion

Estado: Parcial

Rutas:
- `/dashboard`.
- `/director-dashboard`.
- `/projects/[id]/profitability`.
- `/projects/[id]/account-statement`.

Tablas:
- Consulta transversal: `leads`, `clients`, `quotes`, `client_projects`, `service_reports`, `contractors`.
- Direccion financiera: `project_payments`, `project_purchase_lines`, `project_purchase_events`, `quote_items`.
- Rentabilidad: `project_profitability_reports`.

Funciones:
- Dashboard general con KPIs comerciales y operativos.
- Dashboard direccion con proyectos, compras, pagos, variaciones y datos de sitio.
- `getProjectFinancialSummary()` para aprobado/pagado/pendiente.
- `summarizePurchaseVariationMxn()` para variacion de compras.

Correos:
- Reporte de rentabilidad a direccion desde modulo de rentabilidad.

Automatizaciones:
- No hay jobs ni alertas ejecutivas programadas detectadas.
- Los dashboards calculan en lectura.

Reportes:
- Dashboard general.
- Dashboard direccion.
- Estado de cuenta por proyecto y print.
- Rentabilidad por proyecto y print.

Observaciones:
- Existe informacion directiva, pero aun fragmentada entre dashboard, director-dashboard, rentabilidad y estados de cuenta.
- Falta vista consolidada de cartera, margen, cobranza, compras pendientes, proyectos en riesgo y acciones recomendadas.

## Duplicidades y redundancias detectadas

- `/customers` redirige a `/clients`; mantener solo si se necesita compatibilidad de URLs.
- `quotes` y `engineering_quotes` tienen rutas y aprobaciones separadas; falta definir si ingenieria es pre-cotizacion, version tecnica o modulo independiente.
- Portal cliente usa `projects`, mientras ERP usa `client_projects`; es la duplicidad mas riesgosa.
- Documentos/planos usan `documents` y storage `project-documents`, mientras postventa usa `project_delivery_evidences`, `public_document_links` y PDFs generados.
- Fotos/evidencias conviven como `project_photos`, `project_site_visit_note_photos`, `service_report_photos`, `project_delivery_evidences`.
- Costos de contratista pueden vivir en `work_orders.contractor_amount_mxn` y en `contractor_account_movements`; requiere regla de idempotencia.
- Estado financiero se reparte entre `project_payments`, `project_invoices`, rentabilidad y dashboard direccion.

## Procesos incompletos

- Seguimiento comercial posterior al lead: tareas, responsable, recordatorios, razon de perdida y conversion auditada.
- Flujo formal lead -> cliente -> proyecto -> cotizacion aprobada.
- Agenda operativa y control de cambios.
- Compras como proceso ERP completo: proveedor, OC, autorizacion, recepcion, factura proveedor, pago.
- Contratistas: aprobacion/liquidacion/pago y documentacion fiscal.
- Facturacion: cancelacion SAT, complemento de pago, envio por correo y cobranza vencida.
- Postventa: tickets, mantenimientos recurrentes, alertas por garantia/proximo mantenimiento.
- Portal cliente: permisos por cliente, datos reales del modelo actual, entregables y pagos.
- Direccion: alertas automaticas y tablero unico de riesgos.

## A) Ya terminado o muy cercano a terminado

- Landing comercial y paginas publicas de servicios.
- Captura de leads desde landing.
- CRUD operativo de clientes, productos, cotizaciones, proyectos, visitas, ordenes de trabajo, contratistas, facturas, entregas y garantias.
- Aprobacion de cotizacion comercial con sincronizacion operativa.
- Base operativa desde cotizacion aprobada, incluyendo manejo de items obsoletos.
- Timbrado Facturama con validaciones fiscales robustas.
- PDFs/prints: cotizaciones, ingenieria, visitas, OT, entrega material, equipo, entrega, garantia, factura PDF/XML, estado de cuenta, rentabilidad.
- Correo de entrega/garantia al cliente con PDFs y links publicos.
- Reporte de rentabilidad por proyecto y correo a direccion.
- Notificaciones internas WhatsApp para eventos puntuales.

## B) Requiere optimizacion

- Unificar modelo documental y evidencias.
- Consolidar `customers`/`clients` y revisar nomenclatura de rutas.
- Definir relacion final entre cotizacion de ingenieria y cotizacion comercial.
- Mover automatizaciones criticas desde cliente/boton hacia server actions o route handlers transaccionales cuando aplique.
- Reforzar permisos por rol en acciones, no solo en navegacion.
- Reducir fallbacks por columnas faltantes una vez que migraciones esten estables.
- Normalizar estados de proyecto entre comercial, operacion, postventa y direccion.
- Mejorar observabilidad: logs de eventos de negocio, no solo errores.

## C) Falta construir

- CRM de seguimiento: actividades, responsable, proxima accion, probabilidad, perdida/ganada, SLA.
- Agenda operativa y control de cambios.
- Modulo formal de ordenes de compra y proveedores.
- Flujo completo de contratistas: autorizacion, comprobantes, pagos.
- Complementos de pago, cancelacion CFDI, envio de facturas y cobranza.
- Tickets postventa, mantenimientos programados y alertas.
- Portal cliente reconstruido sobre `client_projects` con permisos reales.
- Dashboard ejecutivo unificado con riesgos, margen, cobranza, compras pendientes y proyectos en desviacion.
- Jobs programados para notificaciones, mantenimientos, vencimientos y cobranza.

## D) Prioridad recomendada

1. Portal Cliente: bloquear exposicion o reconstruirlo sobre `client_projects`; hoy es el mayor riesgo por tablas legacy y datos hardcodeados.
2. Modelo documental/evidencias: unificar `documents`, fotos y entidades nuevas para evitar duplicidad permanente.
3. Seguridad y permisos por accion: revisar acciones cliente/server y rutas API sensibles.
4. Facturacion/cobranza: completar complementos de pago, cancelacion, envio y conciliacion con pagos.
5. Compras/proveedores: convertir lineas/eventos en flujo formal de OC y recepcion.
6. Postventa recurrente: tickets, mantenimientos y recordatorios.
7. Direccion: consolidar dashboard ejecutivo una vez normalizados finanzas/compras/postventa.
8. CRM avanzado: automatizar seguimiento comercial despues de estabilizar datos base.
