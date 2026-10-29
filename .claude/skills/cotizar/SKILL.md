---
name: cotizar
description: Arma una cotización de ALFA como la hace Leo (cliente, proyecto, costos, margen, mano de obra, cláusulas de peor caso), genera el PDF Premium y, si Leo lo autoriza, la aprueba, factura y timbra desde el portal. Usar cuando Leo pida "cotiza…", "hazme una cotización…", "cobra X por…", "factura…" o mande equipos con costo y mano de obra, incluso desde el celular.
---

# Cotizar como Leo

Leo suele pedirlo desde el celular, en pocas líneas y a veces dictado. Responde corto: una tabla de costo/venta, los supuestos que tomaste y una sola pregunta. No pidas datos que puedas encontrar tú.

## 0. Entorno

- Base de producción: Supabase `jcdnfjitvyfizcsjvwww` (herramienta `execute_sql`). Es la que usa el portal.
- Portal: `https://portal.alfait.com.mx` en el panel del navegador. Aprobar, facturar, timbrar y enviar se hace ahí, con la sesión de Leo. Si pide login, pídele que entre; nunca escribas contraseñas.
- Syscom: `mcp__syscom__search_syscom_products` con `moneda: "MXN"` e `incluir_iva: false` para validar costos, descripción e imagen.
- `created_by` de las cotizaciones de Leo: `fead6231-91ea-4807-8616-d8412abdf634`.

## 1. Encontrar cliente y proyecto

Busca primero, sin preguntar:

```sql
select c.id, c.name, c.company_name, c.tax_rfc, c.tax_business_name,
  (select json_agg(json_build_object('id',p.id,'name',p.name,'stage',p.sales_stage)) from client_projects p where p.client_id=c.id) projects,
  (select json_agg(json_build_object('id',q.id,'n',q.quote_number,'st',q.status,'tot',q.total_mxn) order by q.id desc) from quotes q where q.client_id=c.id) quotes
from clients c
where row_to_json(c)::text ilike any (array['%<nombre>%','%<empresa>%']);
```

- Si el proyecto no existe, pregunta si va en uno existente o se crea.
- Avisa si el cliente no tiene datos fiscales (`tax_rfc`, `tax_business_name`, `tax_regime`, `tax_zip_code`): sin ellos el portal no deja timbrar.

## 2. Precio: el método de Leo

| Concepto | Regla |
|---|---|
| Equipo | Margen 30% sobre precio: `venta = costo / 0.70` (`pricing_method='target_margin'`, `target_margin=30`). |
| Mano de obra | Venta = 2 × costo, salvo que Leo diga el precio de venta. |
| Servicio ya cotizado por Leo ("cóbrale X") | Usa exactamente X + IVA. |
| IVA | 16% sobre el subtotal. |
| Costo indirecto | `company_settings.indirect_cost_percent` (hoy 0). |

- "Ambos/los dos nos costaron X" = X por el total, sin IVA, salvo que diga otra cosa. Compáralo con Syscom: si el costo unitario se parece al precio + IVA de Syscom, es costo sin IVA.
- **Una sola moneda por producto:** `sale_currency == cost_currency`. Si Leo da el costo en pesos, el producto va en MXN.
- **Peor caso:** si falta información (altura, metros, panel existente, etc.), cotiza el peor caso razonable y deja la suposición en las notas `SUPUESTOS`.
- CCTV: una sección por área física. Mano de obra MXN 1,000 por cámara (instalación 400 + cableado 600), NVR 300, disco 300. Caja de conexión genérica Gewiss y bobina completa de cable.

## 3. Catálogo

- Busca el producto por modelo (`row_to_json(p)::text ilike '%<modelo>%'`). Si no existe, dalo de alta con el costo real de Leo, nombre y foto de Syscom, clave SAT de productos similares, `H87`/`PZA`, `fiscal_object='02'` y `tax_rate=16`.
- Foto: descárgala del CDN de Syscom y súbela al bucket `product-images` como `products/syscom-<modelo>.png` (patrón de `scripts/import-syscom.mjs`).
- Servicios sin equipo: producto marca `ALFA`, costo 0 en MXN, unidad `E48` "Unidad de servicio", clave SAT `81111800`, y el costo y la venta de la mano de obra en `labor_unit_cost` / `labor_unit_sale_price`. Ejemplo: `SERV-MANT-DVR` (id 8122).
- **Nunca `product_id` null** en `quote_items`: la pantalla de edición rompe la cotización. Para equipo del cliente usa un producto de referencia inactivo con costo 0 y `existing_customer_equipment = true`.

## 4. Crear la cotización (borrador)

Una sola sentencia con CTEs, para que todo quede o nada quede. Mismos campos y fórmulas que `app/(admin)/quotes/new/page.tsx`:

- `quote_groups.base_number` = siguiente `ALFA-NNNN` (máximo + 1). `quote_number` = `<base>-V1`, `version 1`, `is_latest true`, `status 'draft'`, `currency 'USD'`.
- Tipo de cambio: `https://open.er-api.com/v6/latest/USD` → `exchange_rate`, `exchange_rate_source 'open.er-api.com USD/MXN'`, `exchange_rate_date` = hoy.
- Partida en MXN: `unit_equipment_price` = venta MXN, `unit_equipment_price_usd = round(venta/tc, 6)`, `equipment_total(_usd) = round(venta*cant/tc, 6)`.
- `unit_labor_price` = mano de obra por pieza; `labor_total` = mano de obra × cantidad; `line_total` = equipo MXN + mano de obra.
- Una fila en `quote_item_labor_activities` por actividad, con costo interno y venta (`labor_activity_id` del catálogo: 2 Instalación, 9 Mano de obra general, etc.).
- Sección: `equipment_total` en USD, `labor_total` en MXN, `total` en MXN.
- Encabezado: `subtotal_mxn = taxable_base_mxn`, `iva_mxn = 16%`, `total_mxn = grand_total`, `equipment_total` en USD, `labor_total` en MXN, `is_partner_quote false`.
- `invoice_description_snapshot` = marca + modelo + nombre: así sale el concepto de la factura.
- `notes`: bloques `ALCANCE` y `SUPUESTOS` con viñetas `•`, en lenguaje del cliente (resultado, no equipo). Si el servicio ya se hizo, dilo.

Para corregir un borrador (ningún cliente lo ha aprobado), actualiza en la misma versión el encabezado, la sección, la partida y la actividad juntos, con `where status='draft'`. Si ya está aprobada, crea una versión nueva desde el portal.

## 5. PDF y revisión

```bash
npx tsx --conditions=react-server scripts/render-quote-pdf.mts <quote_id>
```

Ese comando deja el PDF en `docs/audits/quotes/` y muestra los totales. Revisa las páginas 2 y 3 (con Read y `pages`), mándalo con `SendUserFile` y espera a que Leo lo apruebe. El PDF muestra los equipos en USD; es normal, el total en MXN es exacto.

## 6. Aprobar, facturar, timbrar, enviar (solo con el "sí" de Leo)

Todo en el portal y nunca por SQL: el botón Aprobar también pasa el proyecto a "ganado", genera las partidas operativas y las órdenes de trabajo, y manda las notificaciones.

1. **Aprobar:** `/quotes/<id>` → "Aprobar versión". El botón usa `window.confirm`: sustitúyelo por `() => true` solo si Leo ya aprobó. Verifica `quotes.status='approved'` y `client_projects.sales_stage='won'`.
2. **Factura:** `/projects/<proyecto>/invoices` → "Nueva factura" → origen "Cotización aprobada completa". Confirma método de pago (PUE/PPD), forma de pago (03 transferencia por defecto) y uso de CFDI (el del cliente). "Crear borrador" no timbra.
3. **Antes de timbrar**, enséñale a Leo receptor, concepto, clave SAT y totales, y espera su "sí". Timbrar es irreversible: solo se corrige cancelando.
4. **Timbrar** → verifica `project_invoices.status='issued'`, `sat_uuid` y que `/api/invoices/<id>/xml` traiga los datos correctos.
5. **Enviar por correo** desde el ícono de sobre de la fila correcta, solo si Leo lo pidió. Verifica en `fiscal_document_email_logs` que el `status` sea `sent`.
6. **Archivos para WhatsApp:** con `javascript_tool`, baja `/api/invoices/<id>/pdf` y `/xml` a base64 dentro del portal y devuélvelos en una sola respuesta grande. La herramienta la guarda en `tool-results`; decodifícala con node, compara el SHA-256 con el que calculó el navegador y mándalos con `SendUserFile`. El panel del navegador no descarga a disco y el portal bloquea conexiones a localhost.

## Límites

- Nunca timbrar, cancelar, mandar correos ni marcar como pagado sin el "sí" explícito de Leo en ese momento.
- No toques cotizaciones aprobadas ni facturas timbradas por SQL.
- Si Leo da un dato que contradice el catálogo (costo distinto), usa el suyo y actualiza `cost_price` + `cost_updated_at`, avisándole.
