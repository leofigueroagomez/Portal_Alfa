# Guía para GrokBot: cotizar en ALFA desde el backend

Escrita por Claude el 2026-11-10 a partir de unas 30 cotizaciones armadas con Leo Figueroa (ALFA-0139 a ALFA-0195) y del código real del portal. Es todo lo que necesitas para armar un borrador de cotización directo en la base de datos, sin pasar por la pantalla del editor.

Si algo de esta guía contradice lo que Leo te diga en el momento, manda Leo. Si contradice a `.claude/skills/cotizar/SKILL.md`, manda esta guía en tarifas de mano de obra (la skill todavía cita un tabulador que Leo descartó).

## 1. Qué es esto y qué se espera de ti

ALFA IT instala tecnología de alto nivel en Guadalajara: videovigilancia, redes, audio, alarmas, control de accesos, automatización. Leo es el director y hoy arma casi todas las cotizaciones. Su meta es dejar de armarlas: que una IA prepare el borrador y él solo lo revise y lo autorice.

Leo pide las cotizaciones desde el celular, en pocas líneas o con una nota de voz. Tu trabajo:

1. Encontrar al cliente y el proyecto sin preguntarle lo que puedes buscar tú.
2. Elegir equipos del catálogo y repartir la mano de obra como él lo hace.
3. Crear el borrador con una sola sentencia SQL.
4. Generar el PDF, revisarlo y mandárselo.
5. Responderle corto: una tabla de costo y venta, los supuestos que tomaste y una sola pregunta, si hace falta.

Tú eliges cliente, productos, cantidades y actividades. La matemática no se improvisa: está en la plantilla de la sección 6 y replica al portal.

## 2. Límites que no se cruzan

| Límite | Razón |
|---|---|
| Todo lo que crees queda en `status = 'draft'`. | Leo autoriza. Un borrador no compromete nada. |
| Nunca apruebes por SQL. La aprobación se hace en el portal, con el "sí" de Leo. | El botón Aprobar también pasa el proyecto a ganado, genera partidas operativas y órdenes de trabajo y manda notificaciones. Un `update status` deja todo eso sin hacer. |
| Nunca timbres, canceles, envíes correos al cliente ni marques pagos sin el "sí" explícito de Leo en ese momento. | Un CFDI timbrado es fiscal e irreversible: solo se corrige cancelándolo. |
| No modifiques por SQL cotizaciones aprobadas ni facturas timbradas. | Compras y operación cuelgan de sus partidas; editarlas a mano duplicó cantidades en Compras (proyecto 48). Si hay que cambiar una aprobada, se crea una versión nueva desde el portal. |
| No toques esquema, RLS, políticas de storage ni credenciales. | Fuera de tu alcance; requieren sandbox, respaldo y la confirmación de Leo. |
| No escribas contraseñas ni llaves. Si el portal pide sesión, pídele a Leo que entre. | |
| `QUOTE_PDF_SERVICE_TOKEN` solo baja el PDF Premium. | No autoriza SQL, aprobar, facturar ni leer otros datos. No lo pegues en el chat ni en la URL. |
| Si un dato no lo confirmó Leo ni el catálogo, dilo como supuesto. No lo presentes como hecho. | Leo decide con lo que le reportas. |

## 3. Entorno

- **Base de producción:** Supabase, proyecto `jcdnfjitvyfizcsjvwww` ("Alfa IT"). Es la que usa el portal. El proyecto `pkqwlvqosooewbejbktx` es un sandbox con el esquema incompleto: no sirve para cotizar.
- **Portal:** `https://portal.alfait.com.mx`. Detalle `/quotes/<id>`, editor `/quotes/<id>/edit`. El PDF sin llaves locales es `GET /api/quotes/<id>/pdf-premium` (paso 5).
- **Usuario de Leo** para `created_by`: `fead6231-91ea-4807-8616-d8412abdf634`.
- **Aliados** (`commercial_partners`): 1 = HQE, 2 = Kybit.
- **Syscom** es el proveedor principal. Los costos se validan ahí en MXN sin IVA o en USD, el mismo día que cotizas. DSC no está en Syscom: su lista (proveedor Adises) ya vive en `products` con marca `DSC`, en USD.
- **Tipo de cambio:** `https://open.er-api.com/v6/latest/USD`, campo `rates.MXN`. Se guarda en la cotización con `exchange_rate_source = 'open.er-api.com USD/MXN'` y la fecha.

## 4. El método de Leo

### 4.1 Precio

| Concepto | Regla |
|---|---|
| Equipo | Precio de catálogo: `products.calculated_sale_price`. Leo no ajusta margen por cotización. |
| Margen del catálogo | 30% sobre precio: `venta = costo / 0.70` (`pricing_method = 'target_margin'`, `target_margin = 30`). |
| Mano de obra | Venta = 2 × costo, salvo que Leo diga el precio. |
| "Cóbrale X por…" | Exactamente X + IVA. |
| IVA | 16% sobre el subtotal. |
| Costo indirecto | `company_settings.indirect_cost_percent`. Hoy es 0 y ninguna cotización histórica lo usa. |

- **Una sola moneda por producto.** `sale_currency` siempre es igual a `cost_currency`; hay un CHECK en la base. Si Leo da el costo en pesos, el producto va en MXN. Mezclar monedas ya costó dinero: un Sonos con costo de MXN 758 se cotizó a USD 947.
- Equipos de Syscom van en USD y la mano de obra siempre en MXN. El PDF muestra equipos en USD y el total en MXN; es normal.
- "Ambos nos costaron X" significa X por el total y sin IVA, salvo que diga otra cosa. Compáralo con Syscom para confirmar.
- Si Leo da un costo distinto al del catálogo, usa el suyo, actualiza `cost_price`, `calculated_sale_price` y `cost_updated_at` en `products`, y avísale.
- **Ubiquiti:** el margen de 30% no es alcanzable; el costo de canal queda apenas 3.8% por debajo del precio público de Ubiquiti México. Si cotizas Ubiquiti, adviértelo.
- **Sonos:** el precio de lista incluye IVA; se cotiza a `lista / 1.16`. El margen de canal es de 20%.

### 4.2 Mano de obra

Tarifas vigentes (Leo, 2026-11-09). Costo / venta en MXN:

| Actividad | Costo | Venta | `labor_activity_id` |
|---|---|---|---|
| Cableado de punto A a punto B, por punto | 300 | 600 | 10 |
| Colocación de equipo, por equipo | 150 | 300 | 11 |
| Cámara con su cableado | 450 | 900 | 11 o 15 + 10 |
| NVR: instalación | 150 | 300 | 11 |
| Disco duro: instalación | 150 | 300 | 9 |
| Configuración de NVR y vista remota | 500 | 1,200 | 17 |
| Programación de alarma (servicio `SERV-PROG-ALARMA`) | 1,000 | 2,000 | producto 8134 |

- El catálogo `labor_activity_catalog` trae la cámara (id 15) a 200/400. Leo la bajó a 150/300: usa 150/300 aunque el catálogo diga otra cosa.
- **No uses el tabulador de René López** (`.claude/skills/cotizar/tabulador-mo-rene.md`). Leo lo descartó: inflaba voz y datos en más de MXN 23,000 en El Palomar 284.
- **La mano de obra va dentro del equipo que se instala**, como filas de `quote_item_labor_activities` de esa partida. Nunca armes una sección "Mano de obra" con servicios sueltos, aunque el pedido venga así. Leo corrigió esto en ALFA-0181.
- Cable, conectores, cajas de conexión y bobinas van sin mano de obra.
- Solo la programación o puesta en marcha global va como servicio ALFA aparte.
- La cantidad de cada actividad debe ser igual a la cantidad de la partida. No se sincroniza sola.
- **Recargo por altura:** Leo confirmó que existe, pero no los montos. Se han usado como propuesta 3 m sin recargo, 5 m +300, 6 m +500, 7 m o más +1,000 por cámara. Si lo aplicas, dile que el monto es propuesta.

### 4.3 Estructura

- **Secciones por área física** (General, Fachada, Cocina, Site, Planta alta), no por tipo de equipo. Con varios sistemas en una cotización, el nombre lleva el sistema: `CCTV · Terraza`.
- `General` lleva lo compartido: grabador, disco, cajas de conexión, bobina de cable.
- **Opcionales:** el portal no tiene partidas opcionales. Un opcional va como otra cotización en el mismo proyecto (ALFA-0190, ALFA-0193). Dos alternativas (opción A y B) también son dos cotizaciones.
- **Equipo del cliente** (reubicar, reutilizar): partida con `existing_customer_equipment = true`, equipo en 0 y la mano de obra dentro. Usa un producto de referencia inactivo con costo 0, por ejemplo modelo `DH-IPC-HFW2841T-AS (cliente)`.
- **Nunca dejes `product_id` nulo.** La pantalla de edición ya lo tolera, pero una partida sin producto no tiene clave SAT ni costo y estorba al facturar y al comprar.

### 4.4 Cuando falta información

- **Peor caso.** Si no sabes la altura, los metros o el modelo existente, cotiza el peor caso razonable y escribe el supuesto en las notas para ajustar a la baja. Cobrar de más y bajar es fácil; quedarse corto frente al cliente y al aliado se ve mal.
- **No asumas nada del equipo existente.** Si no se conoce el grabador del cliente, se cotiza uno nuevo (Paseo Solares 225).
- **ALFA no hace trabajos eléctricos.** La alimentación se le pide al cliente en los supuestos. No cotices acometidas, circuitos ni contactos.
- La canalización suele dejarla la obra; si es así, va como supuesto y `includes_conduit = false`.
- "Al cliente lo que pida, para que se sienta escuchado": si pide no llevar algo, no se lo agregues por criterio propio; menciónaselo a Leo.

### 4.5 Criterios de equipo

| Sistema | Criterio |
|---|---|
| CCTV IP | Interior discreto: torre o turret. Fachada: bala IP67. Cocina: bala metálica (el policarbonato se opaca con grasa). Caja: más resolución, ahí ocurren las mermas. |
| Grabador | NVR con PoE integrado para no comprar switch. Revisa el presupuesto PoE contra la ficha: el DS-7608NI-Q1/8P(E) no alcanzó para 8 cámaras de 8.5 W. |
| Disco | Retención objetivo de unos 30 días. Peor caso: 8 MP en H.265 a 4 Mbps son 43.2 GB por día por cámara. |
| Cajas de conexión | Genérica Gewiss GW-44-024, una por cámara, en vez de la de marca. |
| Cable | Bobina completa de 305 m, no metros sueltos. |
| Residencial sensible a precio | TurboHD HiLook con baluns; piezas sueltas salen más baratas que el kit. |
| Hikvision comercial | Turret DS-2CD1343G3-LIUF, bala DS-2CD1043G3-LIUF, NVR DS-7608NI-Q1/8P(E). |
| Alarma | Hikvision AX PRO, modelos terminados en `-WB` para México. Con alcance equivalente, DSC salió unos MXN 24,000 más caro. |
| Audio | Sonos AMP + KEF de plafón (Ci160ER). Para sobreponer en muro, B&W AM-1. |
| Red | Cobre en Panduit cuando Leo lo pide. Jacks y ciegos Linked Pro (LP-KJ-505-WH, LP-AP-01) entran en el chasis Leviton QuickPort. |
| Auto-tracking | La DS-2SE4C425MWG-E no lo hace; la DS-2SE7C425MWG-EB sí, pero pide Hi-PoE de 60 W. Lee la ficha antes de prometer seguimiento. |

No afirmes compatibilidad física ni eléctrica sin la ficha del fabricante. Si el dato viene de una inferencia, dilo.

### 4.6 Notas de la cotización

`quotes.notes` lleva dos bloques, con viñetas `•`:

```
ALCANCE
• Videovigilancia con 8 cámaras en terraza, cochera y fachada, con grabación y vista desde el celular.

SUPUESTOS
• La canalización y los registros los entrega la obra, con guía y sin obstrucciones.
• La alimentación eléctrica en cada punto la entrega el cliente.
```

- Lenguaje del cliente: describe el resultado, no el equipo.
- Cada supuesto de peor caso va aquí.
- Si el servicio ya se hizo, dilo.
- En cotización con aliado, las notas no mencionan a ALFA: usa "de nuestra parte".
- Máximo 5,000 caracteres.

### 4.7 Aliados (HQE, Kybit)

Regla confirmada por Leo para todos los aliados: primero el descuento al cliente; la utilidad que queda (`precio al cliente − costo`) se reparte con el aliado, 50/50 por defecto, en equipo y en mano de obra. El aliado se lleva un porcentaje de la **utilidad**, nunca del precio.

Verificado en ALFA-0195 (quote 257):

- Por partida de equipo: `partner_discount_mxn = (venta − costo) × cantidad × TC × 50%`.
- Mano de obra: `(venta − costo interno) × 50%` por actividad; se suma en el encabezado.
- Encabezado: `is_partner_quote = true`, `commercial_partner_id`, `partner_profit_share_percent = 50`, `partner_equipment_discount_mxn`, `partner_labor_discount_mxn`, `partner_total_discount_mxn`.
- `subtotal_mxn` es el precio al cliente final. `taxable_base_mxn = subtotal_mxn − partner_total_discount_mxn`. `iva_mxn` y `total_mxn` salen de esa base: es lo que cobra ALFA.
- `partner_equipment_discount_percent` y `partner_labor_discount_percent` guardan el porcentaje efectivo sobre precio; son informativos.
- Productos con `partner_discount_eligible = false` no reparten utilidad de equipo. Sonos tiene tope de 0% de descuento al cliente en `brand_commercial_rules`.

La plantilla de la sección 6 crea cotizaciones directas. Para una de aliado, crea el borrador y luego aplica estos campos en la misma versión, o asigna el aliado en el editor del portal y guarda (el portal calcula el reparto). Repórtale a Leo los dos números: precio al cliente y neto para ALFA.

## 5. Flujo rápido, paso a paso

### Paso 1. Cliente y proyecto

```sql
select c.id, c.name, c.company_name, c.tax_rfc, c.tax_business_name, c.tax_regime, c.tax_zip_code,
  (select json_agg(json_build_object('id', p.id, 'name', p.name, 'stage', p.sales_stage))
     from client_projects p where p.client_id = c.id) as proyectos,
  (select json_agg(json_build_object('id', q.id, 'n', q.quote_number, 'st', q.status, 'tot', q.total_mxn) order by q.id desc)
     from quotes q where q.client_id = c.id) as cotizaciones
from clients c
where row_to_json(c)::text ilike any (array['%<nombre>%', '%<empresa>%']);
```

- Si el proyecto no existe, pregunta si va en uno existente o se crea. Al crear: `clients.client_number` y `client_projects.project_number` no tienen default (cliente: máximo + 1; proyecto: consecutivo por cliente).
- Avisa si faltan datos fiscales (`tax_rfc`, `tax_business_name`, `tax_regime`, `tax_zip_code`). Se puede cotizar sin ellos, pero no timbrar.

### Paso 2. Productos

```sql
select p.id, p.brand, p.model, p.name, p.is_active, p.cost_price, p.cost_currency,
       p.calculated_sale_price, p.sale_currency,
       round(100 * (1 - p.cost_price / nullif(p.calculated_sale_price, 0)), 1) as margen_real,
       (now() - p.cost_updated_at) > interval '30 days' as costo_viejo,
       p.sat_product_service_code, p.image_url is not null as tiene_foto
from products p
where p.model ilike any (array['%<modelo1>%', '%<modelo2>%'])
order by p.is_active desc, p.id;
```

- `costo_viejo = true`: valida el costo en Syscom hoy. El editor del portal bloquea el guardado con costos de más de 30 días; por SQL no hay bloqueo, así que la revisión es tuya.
- `margen_real` lejos de 30: avísale a Leo antes de cotizar. Hay productos con el precio desfasado del costo.
- Hay modelos duplicados; usa el activo. El Leviton 41644-00W (ids 409 y 479) está capturado en USD y es MXN: no lo uses sin corregirlo con Leo.
- **Producto nuevo de Syscom:** `node scripts/import-syscom.mjs --modelos <MODELO-CON-GUIONES> --dry` y después sin `--dry`. Trae nombre, foto, clave SAT y costo.
- **Producto nuevo a mano:** costo real, `calculated_sale_price = round(costo / 0.70, 2)`, `sale_currency = cost_currency`, clave SAT de un producto similar, unidad `H87` "Pieza", `fiscal_object = '02'`, `tax_rate = 16`, foto en el bucket `product-images`.
- **Servicio sin equipo:** producto marca `ALFA`, modelo `SERV-…`, costo 0 en MXN, unidad `E48` "Unidad de servicio", clave SAT `81111800`, con `labor_unit_cost` y `labor_unit_sale_price`. Ya existen, entre otros: `SERV-PROG-ALARMA` (8134), `SERV-MANT-DVR` (8122), `SERV-INST-TV` (8123), `SERV-RECABLEADO` (8181), `SERV-DIAG-ALARMA` (8183), `SERV-RENTA-ANDAMIO` (8147). En la cotización, su precio va como actividad de mano de obra de esa partida.

### Paso 3. Crear el borrador

Llena los tres bloques de datos de la plantilla de la sección 6 y ejecútala una vez.

### Paso 4. Verificar

Corre la consulta de la sección 7. Todas las columnas de control deben salir limpias.

### Paso 5. PDF

El PDF lo baja el portal ya desplegado. Es el PDF Premium oficial: el mismo snapshot, el mismo HTML y el mismo render Chromium que el botón "PDF Premium" (`getQuotePdfSnapshot`, `buildQuotePremiumPdfHtml`, `renderQuotePremiumPdf`). Incluye borradores. En una cotización de aliado sale el formato ALFA, no la marca blanca.

No uses el repo ni `.env.local`. Esas llaves no te corresponden. El valor de `QUOTE_PDF_SERVICE_TOKEN` tiene que estar en el entorno del proceso que corre el comando; no lo escribas en el chat, en esta guía ni en la URL. El portal ignora el query string.

```bash
QUOTE_ID=258
mkdir -p docs/audits/quotes
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer ${QUOTE_PDF_SERVICE_TOKEN}" \
  --output "docs/audits/quotes/cotizacion-${QUOTE_ID}.pdf" \
  --write-out "\nHTTP %{http_code}\n" \
  "https://portal.alfait.com.mx/api/quotes/${QUOTE_ID}/pdf-premium"
head -c 5 "docs/audits/quotes/cotizacion-${QUOTE_ID}.pdf"
echo
```

El archivo queda en `docs/audits/quotes/cotizacion-<id>.pdf`, relativo al directorio donde corriste `curl`. `head -c 5` debe imprimir `%PDF-`. Si no, ese archivo es el JSON del error: bórralo.

Para 259 y 260 cambia `QUOTE_ID` y vuelve a correr el mismo comando.

| Señal | Qué significa | Qué hacer |
|---|---|---|
| `HTTP 200` y el archivo empieza con `%PDF-` | PDF listo. | Revisa las páginas de partidas y de condiciones antes de mandarlo. |
| `HTTP 401` | El token no está en el entorno, no coincide, tiene menos de 32 caracteres, o este despliegue tiene el endpoint apagado. Preview siempre responde 401: la variable existe solo en Production. Un 401 no dice cuál de esos casos es. | No reintentes en bucle. Confirma que la variable está definida en ese proceso (`[ -n "$QUOTE_PDF_SERVICE_TOKEN" ]`). |
| `HTTP 400` | El id no es un entero positivo. | Usa el `quote_id` numérico, por ejemplo `258`, no el folio `ALFA-0195`. |
| `HTTP 404` | No hay cotización con ese id. | Verifica el id en la base. |
| `HTTP 429` | Más de 10 descargas en un minuto desde la misma IP, o más de 20 en total. | Espera un minuto y reintenta una vez. |
| `HTTP 500` | Falló el render. El JSON trae `requestId` y no explica la causa. | Avísale a Leo con ese `requestId`. No es el token. No reintentes en bucle. |
| `HTTP 000`, o curl sin la línea `HTTP` | No hubo respuesta del portal. | Revisa la red y la URL. No es un rechazo del token. |
| Exit code 22 | `--fail-with-body` vio un HTTP de error. El código va en la línea `HTTP`. | Lee esa línea. El archivo de `--output` no es un PDF. |

El token solo autoriza este GET. No lo mandes como `?token=` ni `?key=`: no se acepta y quedaría en registros.

Quien sí tiene el repo y `.env.local` (Claude Code en la máquina de Leo) puede seguir usando el comando local, que arma el mismo HTML:

```bash
npx tsx --conditions=react-server scripts/render-quote-pdf.mts <quote_id>
```

Ese comando no es para ti: pide la service role dentro de `.env.local`.

### Paso 6. Reportar a Leo

Tabla corta por sección (equipo, mano de obra, total), subtotal, IVA y total; margen global; supuestos; qué quedó por confirmar. Una sola pregunta.

## 6. Plantilla SQL: un borrador en una sentencia

Todo se inserta en una sola sentencia, así que queda completo o no queda nada. El editor del portal y `lib/quotes/draftBuilder.ts` hacen inserciones separadas y pueden dejar borradores a medias; esta plantilla no.

Solo editas `params`, `lines` y `acts`:

- `lines`: una fila por partida. `sec` es el orden de la sección, `pos` el orden dentro de la sección. `existing = true` para equipo del cliente.
- `acts`: una fila por actividad de mano de obra, ligada a su partida por `(sec, pos)`. `qty` nulo significa "igual a la cantidad de la partida".
- El precio de equipo sale de `products.calculated_sale_price`. No lo escribas a mano.

```sql
with params as (
  select 66::bigint  as client_id,
         112::bigint as project_id,
         18.630883::numeric as tc,
         'open.er-api.com USD/MXN'::text as tc_source,
         current_date as tc_date,
         'fead6231-91ea-4807-8616-d8412abdf634'::uuid as created_by,
         false as includes_conduit,
         true  as includes_cabling,
         $n$ALCANCE
• …

SUPUESTOS
• …$n$::text as notes
),
lines(sec, sec_name, pos, product_id, qty, existing) as (values
  (0, 'General', 0, 71::bigint, 1::numeric, false),
  (1, 'Fachada', 0, 45,         2,          false)
),
acts(sec, pos, act_pos, labor_activity_id, name, unit, cost, sale, qty) as (values
  (0, 0, 0, 11::bigint, 'Colocación de equipo',          'equipo', 150::numeric, 300::numeric, null::numeric),
  (1, 0, 0, 11,         'Colocación de equipo',          'equipo', 150,          300,          null),
  (1, 0, 1, 10,         'Cableado de punto A a punto B', 'punto',  300,          600,          null)
),
act_calc as (
  select a.sec, a.pos, a.act_pos, a.labor_activity_id, a.name, a.unit, a.cost, a.sale,
         coalesce(a.qty, l.qty) as q
  from acts a join lines l using (sec, pos)
),
labor as (select sec, pos, sum(q * sale) as labor_total from act_calc group by sec, pos),
priced as (
  select l.*, p.brand, p.model, p.name, p.image_url,
         upper(coalesce(p.sale_currency, 'USD')) as cur,
         case when l.existing then 0 else p.calculated_sale_price end as unit_sale,
         coalesce(lb.labor_total, 0) as labor_total
  from lines l join products p on p.id = l.product_id left join labor lb using (sec, pos)
),
calc as (
  select pr.*,
         round(case when cur = 'MXN' then unit_sale / tc       else unit_sale            end, 2) as unit_usd,
         round(case when cur = 'MXN' then unit_sale * qty / tc else unit_sale * qty      end, 2) as eq_usd,
         round(case when cur = 'MXN' then unit_sale * qty      else unit_sale * qty * tc end, 2) as eq_mxn
  from priced pr cross join params
),
ok as (
  select (select count(*) from calc) = (select count(*) from lines)
     and (select count(*) from act_calc) = (select count(*) from acts)
     and not exists (select 1 from calc
                     where unit_sale is null or (not existing and unit_sale <= 0 and labor_total <= 0))
     and coalesce((select indirect_cost_percent from company_settings limit 1), 0) = 0 as pass
),
tot as (
  select round(sum(eq_usd), 2) as eq_usd, sum(labor_total) as labor,
         round(sum(eq_mxn + labor_total), 2) as subtotal
  from calc
),
grp as (
  insert into quote_groups (base_number, created_by)
  select 'ALFA-' || lpad((coalesce(max((regexp_match(base_number, 'ALFA-(\d+)'))[1]::int), 0) + 1)::text, 4, '0'),
         (select created_by from params)
  from quote_groups
  having (select pass from ok)
  returning id, base_number
),
q as (
  insert into quotes (quote_group_id, quote_base_number, version, quote_number, is_latest, status, currency, quote_type,
    client_id, client_project_id, created_by, exchange_rate, exchange_rate_source, exchange_rate_date,
    equipment_total, labor_total, discount_type, discount_percent, discount_amount_mxn,
    indirect_cost_percent, indirect_cost_mxn, misc_total_mxn,
    subtotal_mxn, taxable_base_mxn, iva_mxn, total_mxn, grand_total,
    includes_travel_expenses_detail, travel_fuel_mxn, travel_tolls_mxn, travel_food_mxn, travel_total_mxn,
    is_partner_quote, commercial_partner_id, partner_equipment_discount_percent, partner_labor_discount_percent,
    partner_equipment_discount_mxn, partner_labor_discount_mxn, partner_total_discount_mxn, partner_profit_share_percent,
    notes, include_diagnostic_context)
  select g.id, g.base_number, 1, g.base_number || '-V1', true, 'draft', 'USD', 'standard',
    p.client_id, p.project_id, p.created_by, p.tc, p.tc_source, p.tc_date,
    t.eq_usd, t.labor, 'none', 0, 0,
    0, 0, 0,
    t.subtotal, t.subtotal, round(t.subtotal * 0.16, 2),
    t.subtotal + round(t.subtotal * 0.16, 2), t.subtotal + round(t.subtotal * 0.16, 2),
    false, 0, 0, 0, 0,
    false, null, 0, 0, 0, 0, 0, 50,
    p.notes, false
  from grp g cross join params p cross join tot t
  returning id, quote_number, subtotal_mxn, total_mxn
),
sec as (
  insert into quote_sections (quote_id, name, sort_order, equipment_total, labor_total, total)
  select q.id, min(c.sec_name), c.sec, round(sum(c.eq_usd), 2), sum(c.labor_total),
         round(sum(c.eq_mxn + c.labor_total), 2)
  from calc c cross join q
  group by q.id, c.sec
  returning id, sort_order
),
it as (
  insert into quote_items (quote_id, quote_section_id, product_id, quantity, sale_currency,
    unit_equipment_price, unit_equipment_price_usd, unit_labor_price, equipment_total, equipment_total_usd,
    labor_total, line_total, product_brand, product_model, product_name, product_image_url,
    invoice_description_snapshot, existing_customer_equipment, sort_order)
  select q.id, s.id, c.product_id, c.qty, c.cur,
    c.unit_sale, c.unit_usd, round(c.labor_total / c.qty, 2), c.eq_usd, c.eq_usd,
    c.labor_total, c.eq_mxn + c.labor_total,
    coalesce(c.brand, 'Sin marca'), coalesce(c.model, 'Sin modelo'), c.name, c.image_url,
    concat_ws(' ', c.brand, c.model, c.name), c.existing, c.pos
  from calc c cross join q join sec s on s.sort_order = c.sec
  returning id, quote_section_id, sort_order
),
la as (
  insert into quote_item_labor_activities (quote_item_id, labor_activity_id, name_snapshot, quantity, unit,
    internal_unit_cost_mxn, sale_unit_price_mxn, internal_total_mxn, sale_total_mxn, sort_order)
  select it.id, a.labor_activity_id, a.name, a.q, a.unit, a.cost, a.sale, a.q * a.cost, a.q * a.sale, a.act_pos
  from act_calc a
  join sec s on s.sort_order = a.sec
  join it on it.quote_section_id = s.id and it.sort_order = a.pos
  returning id
),
terms as (
  insert into quote_terms_settings (quote_id, payment_100_equipment, labor_payment_mode, payment_100_advance,
    is_local_guadalajara, includes_travel_expenses, includes_conduit, includes_cabling)
  select q.id, true, '50_50', false, true, false, p.includes_conduit, p.includes_cabling
  from q cross join params p
  returning id
)
select (select pass from ok) as creada, q.id as quote_id, q.quote_number, q.subtotal_mxn, q.total_mxn,
       (select count(*) from it) as partidas, (select count(*) from la) as actividades
from (select 1) x left join q on true;
```

Cómo leer el resultado:

- `creada = true` con `quote_id`: listo.
- `creada = false`: no se insertó nada. Causas: un `product_id` que no existe, una actividad ligada a una partida que no está en `lines`, un producto sin `calculated_sale_price` y sin mano de obra, o el costo indirecto de la empresa dejó de ser 0 (la plantilla no lo calcula; en ese caso usa el editor del portal).

Qué significa cada columna, porque los nombres engañan:

| Columna | Contenido |
|---|---|
| `quote_items.unit_equipment_price` | Precio unitario en la moneda del producto (`sale_currency`). |
| `quote_items.unit_equipment_price_usd` | Precio unitario en USD. |
| `quote_items.equipment_total` y `equipment_total_usd` | Total de equipo en **USD**, las dos. |
| `quote_items.unit_labor_price`, `labor_total` | Mano de obra en MXN, por pieza y total. |
| `quote_items.line_total` | Equipo en MXN + mano de obra, en **MXN**. |
| `quote_sections.equipment_total` | USD. `labor_total` y `total` en MXN. |
| `quotes.equipment_total` | USD. `labor_total`, `subtotal_mxn`, `iva_mxn`, `total_mxn`, `grand_total` en MXN. |
| `quotes.currency` | Siempre `'USD'`. |
| `quote_items.invoice_description_snapshot` | Marca + modelo + nombre: así sale el concepto en la factura. |
| `quote_terms_settings` | Una fila por cotización. Sin ella, el PDF dice "No incluye canalizaciones ni cableados" aunque el alcance sí los incluya. |

Estado de la plantilla: validada contra producción con `EXPLAIN` el 2026-11-10 (nombres de columnas y tipos correctos) y sus fórmulas coinciden al centavo con ALFA-0188, ALFA-0192 y ALFA-0195. No se ejecutó de punta a punta para no crear una cotización de prueba en producción: revisa con cuidado la primera que hagas con ella.

Límites de la plantilla: una cotización directa, sin descuento, sin viáticos, sin misceláneos y sin costo indirecto. La numeración toma el máximo + 1; no lances dos creaciones al mismo tiempo.

## 7. Verificación después de crear o corregir

```sql
select q.id, q.quote_number, q.status,
  q.subtotal_mxn,
  (select round(sum(line_total), 2) from quote_items i where i.quote_id = q.id) as suma_partidas,
  (select round(sum(total), 2) from quote_sections s where s.quote_id = q.id) as suma_secciones,
  q.labor_total,
  (select sum(a.sale_total_mxn) from quote_item_labor_activities a
     join quote_items i on i.id = a.quote_item_id where i.quote_id = q.id) as suma_actividades,
  q.iva_mxn = round(q.taxable_base_mxn * 0.16, 2) as iva_ok,
  q.total_mxn = q.taxable_base_mxn + q.iva_mxn as total_ok,
  (select count(*) from quote_items i where i.quote_id = q.id and i.product_id is null) as sin_producto,
  (select count(*) from quote_items i where i.quote_id = q.id
     and i.labor_total <> coalesce((select sum(a.sale_total_mxn) from quote_item_labor_activities a
                                    where a.quote_item_id = i.id), 0)) as mo_descuadrada,
  (select count(*) from quote_items i join products p on p.id = i.product_id
     where i.quote_id = q.id and upper(i.sale_currency) <> upper(p.cost_currency)) as moneda_mezclada,
  (select count(*) from quote_items i join products p on p.id = i.product_id
     where i.quote_id = q.id and not i.existing_customer_equipment
       and p.cost_price > 0 and i.unit_equipment_price < p.cost_price) as bajo_costo,
  exists (select 1 from quote_terms_settings t where t.quote_id = q.id) as tiene_terminos
from quotes q
where q.id = <quote_id>;
```

Debe cumplirse: `subtotal_mxn = suma_partidas = suma_secciones`, `labor_total = suma_actividades`, `iva_ok` y `total_ok` en `true`, los cuatro contadores en 0 y `tiene_terminos` en `true`.

## 8. Corregir un borrador

Solo con `status = 'draft'`. Los totales viven en cuatro niveles (actividad, partida, sección, encabezado) y no hay triggers que los recalculen: si cambias uno, actualiza los cuatro en la misma sentencia, con `where status = 'draft'` en el encabezado, y vuelve a correr la verificación de la sección 7.

Para cambios grandes en un borrador recién creado, es más seguro borrar las secciones de esa cotización (las partidas y actividades caen en cascada) y volver a insertarlas con la misma lógica de la plantilla, conservando el número.

Si Leo guarda el borrador desde el editor del portal, el portal recalcula todo a su manera y puede haber diferencias de centavos. No las "corrijas" de vuelta.

## 9. Después del borrador

Todo esto ocurre en el portal, con la sesión de Leo y su "sí" en cada paso:

1. **Aprobar:** `/quotes/<id>` → "Aprobar versión". Debe quedar `quotes.status = 'approved'` y `client_projects.sales_stage = 'won'`.
2. **Factura:** `/projects/<proyecto>/invoices` → "Nueva factura" → origen "Cotización aprobada completa". Confirma método de pago (PUE o PPD), forma de pago (03 transferencia por defecto) y uso de CFDI. "Crear borrador" no timbra.
3. **Antes de timbrar**, enséñale a Leo receptor, concepto, clave SAT y totales, y espera su "sí".
4. **Timbrar** y verificar `project_invoices.status = 'issued'` y `sat_uuid`.
5. **Enviar por correo** solo si Leo lo pidió.

## 10. Otras entradas al backend

| Entrada | Cuándo conviene |
|---|---|
| Plantilla SQL de la sección 6 | Caso normal. Control total de secciones, áreas y actividades. |
| `buildDraftQuote()` en `lib/quotes/draftBuilder.ts` | Desde código del servidor. Recibe `client_id`, `items` y `labor`. Pone todos los productos en una sección "General" y la mano de obra suelta en una sección "Mano de obra" con `product_id` nulo, que es justo lo que Leo no quiere; sirve para paquetes simples. |
| `POST /api/quotes/draft-from-intent` con `{ "transcript": "…" }` | Texto libre a borrador. Usa un modelo por dentro, tiene tope de gasto mensual y no se ha probado de punta a punta. |
| `/quotes/templates` | Paquetes repetidos. Leo aún no define las plantillas reales. |

## 11. Errores que ya se cometieron

| Error | Consecuencia | Regla |
|---|---|---|
| Sección "Mano de obra" con servicios sueltos | Leo rehízo ALFA-0181 | La mano de obra va dentro de cada equipo. |
| Usar el tabulador de René | MXN 23,000 de más en El Palomar 284 | Cableado 300/600, colocación 150/300. |
| Darle al aliado un % del precio | Leo se alarmó | El aliado recibe % de la utilidad. |
| Mezclar moneda de costo y de venta | Ventas con pérdida y precios 20 veces arriba | Una moneda por producto. |
| `product_id` nulo en partidas | Se perdieron secciones al editar ALFA-0173 | Siempre un producto, aunque sea de referencia. |
| Asumir que el grabador existente servía | Leo pidió rehacer con NVR nuevo | Sin dato, equipo nuevo y peor caso. |
| Cambiar la cantidad de una partida sin sus actividades | Mano de obra descuadrada | Cantidad de actividad = cantidad de partida. |
| Olvidar `quote_terms_settings` | PDF contradice el alcance | Una fila por cotización. |
| Prometer auto-tracking sin leer la ficha | Hubo que cambiar de cámara y de switch | Ficha del fabricante antes de afirmar. |
| Costos viejos del catálogo | Margen real distinto al objetivo | Validar en Syscom el día que cotizas. |

## 12. Pendiente de confirmar con Leo

- Montos del recargo por altura.
- Cuándo aplican costo indirecto y misceláneos (hoy nunca se usan).
- Retención estándar de grabación (se ha usado 30 días).
- Criterio para elegir TurboHD en lugar de IP.

## Documentos relacionados

- [`../../.claude/skills/cotizar/SKILL.md`](../../.claude/skills/cotizar/SKILL.md)
- [`../modules/cotizaciones/MODULE_CONTEXT.md`](../modules/cotizaciones/MODULE_CONTEXT.md)
- [`SECURITY_RULES.md`](./SECURITY_RULES.md)
- [`../../lib/quotes/draftBuilder.ts`](../../lib/quotes/draftBuilder.ts)
- [`../../scripts/render-quote-pdf.mts`](../../scripts/render-quote-pdf.mts)
