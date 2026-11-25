# Cómo cotizamos en ALFA

**Lectura obligatoria** para cualquier agente de IA (GrokBot, Claude, Codex u otro) antes de armar, corregir o revisar una cotización, por el portal o por SQL. Si no leíste este documento completo, no cotices.

Este documento explica **cómo pensamos** la cotización: qué es un sistema, qué es una ubicación, dónde va la mano de obra y cómo se decide el precio. El **cómo se ejecuta** (SQL, PDF, tarifas vigentes, aliados) está en [`../../ai/GUIA_COTIZAR_GROKBOT.md`](../../ai/GUIA_COTIZAR_GROKBOT.md). Si los dos documentos se contradicen en estructura o precio, manda este. Si Leo te dice otra cosa en el momento, manda Leo.

Escrito el 2026-11-25 a partir del editor del portal (`app/(admin)/quotes/new/page.tsx`), del PDF Premium (`lib/quotePremiumPdfHtml.ts`) y de las cotizaciones que Leo armó a mano en el portal (referencia: ALFA-0218, ALFA-0221 y ALFA-0134).

## 1. La idea en un minuto

Una cotización de ALFA se lee en tres niveles, siempre en este orden:

```
Cotización
└── Sistema                 qué disciplina se instala      (sección, de catálogo cerrado)
    └── Ubicación           en qué lugar de la obra queda  (texto libre, palabras del cliente)
        └── Partida         qué equipo y cuántos
            └── Mano de obra   qué se le hace a ese equipo (actividades dentro de la partida)
```

El cliente primero quiere saber **qué le estamos vendiendo** (videovigilancia, red, audio) y cuánto cuesta cada cosa por separado, porque así decide qué aprueba. Después quiere reconocer **su casa o su negocio** dentro de cada sistema: "Caja", "Fachada", "Recámara principal". Por eso el sistema es el nivel de arriba y la ubicación el de abajo, nunca al revés.

Tres reglas resumen todo lo demás:

1. **Las secciones son sistemas, no lugares.** El lugar va en la ubicación de cada partida.
2. **La mano de obra vive dentro del equipo que se instala**, no en una sección aparte.
3. **El precio del equipo no se decide en la cotización.** Lo decide el catálogo, producto por producto, con uno de dos métodos: margen objetivo o precio de lista.

## 2. Sistemas

Un sistema es una disciplina técnica completa. En la base es una fila de `quote_sections`; su `name` debe ser **exactamente** el nombre de un sistema activo del catálogo `quotable_systems`. El editor solo deja elegir de esa lista y el PDF rotula cada sección con la etiqueta "Sistema".

Catálogo al 2026-11-25 (consúltalo siempre, puede cambiar):

```sql
select id, name, code from quotable_systems where is_active order by sort_order, name;
```

| Sistema (`name` exacto) | Qué entra |
|---|---|
| Audio Distribuido y Alta Fidelidad | Amplificadores, streamers, bocinas de plafón, muro o exterior, subwoofers. |
| Videovigilancia y CCTV | Cámaras, grabador, disco, fuentes, baluns, cajas de conexión y el switch PoE que solo alimenta cámaras. |
| Alarma de Intrusión y Pánico | Panel, teclados, sensores, sirenas, botones de pánico. |
| Redes, Cableado Estructurado y WiFi | Access points, switches, routers, nodos de red, gabinetes, fibra, patch panels. |
| Control de Iluminación Arquitectónica | Atenuadores, teclados, módulos y procesadores Lutron. |
| Persianas y Cortinas Motorizadas | Persianas, motores, cortineros. Tiene su propio tipo de cotización (`/quotes/blinds`). |
| Video, Cine en Casa y Entretenimiento | Pantallas, soportes, barras de sonido, proyectores, receptores AV. |
| Control de Accesos e Intercomunicación | Cerraduras, lectores, videoporteros, motores de portón. |
| Automatización e Integración Centralizada | Procesadores, controles, integración entre sistemas. |
| Energía y Respaldo (UPS / Acondicionamiento) | UPS, reguladores, acondicionadores de línea. |
| Acondicionamiento Acústico y Confort | Paneles y tratamiento acústico. |
| Conmutador, Telefonía IP y Comunicaciones | Conmutador, teléfonos IP, troncales. |
| Optimización de Sistemas en Bar | Caso especial ya existente; no lo uses para otra cosa. |

Reglas:

- **Un sistema aparece una sola vez por cotización.** Si hay cámaras en seis áreas, es una sección "Videovigilancia y CCTV" con seis ubicaciones, no seis secciones.
- **No inventes nombres de sección.** "General", "Fachada", "CCTV · Terraza", "Cámaras", "Mano de obra", "Programación", "Cable" o "Site" no son sistemas. Si el trabajo no cabe en ningún sistema del catálogo, pregúntale a Leo; él da de alta sistemas nuevos en `/settings/systems`.
- **Cada equipo va en el sistema al que sirve**, no en el sistema al que se parece. El switch PoE que alimenta las cámaras va en Videovigilancia (así está en ALFA-0218); el access point va en Redes. El cable, los conectores y las cajas de conexión van en el sistema que los consume.
- **La programación o puesta en marcha de un sistema** va dentro de ese sistema, como partida de servicio ALFA (`SERV-…`) con su actividad de mano de obra. En ALFA-0221 es `SERV-PROG-SONOS`, dentro de "Video, Cine en Casa y Entretenimiento".
- **El orden de los sistemas** es el orden en que el cliente los pidió o, si no hay pista, el más importante primero.
- Si Leo pide un opcional o dos alternativas (opción A y B), siguen siendo cotizaciones separadas en el mismo proyecto. Los sistemas no se usan para separar opciones.

## 3. Ubicaciones

La ubicación dice **en qué lugar físico de la obra queda cada pieza**. No es una sección: es un dato de la partida.

Dónde se guarda:

| Dónde | Para qué |
|---|---|
| `quote_item_area_allocations` (`area`, `quantity`, `supply_type`) | La forma normal. Una fila por ubicación de esa partida. Es lo que captura el editor en "Distribución por área". |
| `quote_items.area` | Atajo antiguo: una sola ubicación para toda la partida. Si hay filas de distribución, mandan las filas. |

Cómo se ve: dentro de cada sistema, el PDF agrupa las partidas por ubicación y le pone a cada una su subtotal. Agrupa por **texto exacto**, así que "Fachada", "fachada exterior" y "Fachada Exterior" salen como tres grupos distintos.

Reglas:

- **Toda partida tiene ubicación.** Si una sola partida del sistema la tiene, el PDF agrupa todo el sistema, y las que no tengan caen en un grupo "General" que no le dice nada al cliente.
- **Usa las palabras del cliente y del plano:** "Caja", "Piso de Ventas", "Recámara principal", "Portón Trasero". No uses códigos internos ni nombres de equipo.
- **Escribe cada ubicación igual todas las veces**, en todos los sistemas de la cotización. Antes de crear una nueva, revisa las que ya usaste.
- **"Site"** es la ubicación del equipo central y de lo que se comparte: grabador, disco, fuentes, switch principal, bobina de cable, conectores, cajas de conexión, renta de andamio. Si hay un cuarto de equipos secundario, nómbralo como lo conoce el cliente ("IDF Taller").
- **La suma de las cantidades por ubicación debe ser igual a la cantidad de la partida.** El editor bloquea el guardado si no cuadra; por SQL nadie te detiene.
- **Mismo equipo en varias ubicaciones.** Hay dos formas válidas:
  - *Una partida con distribución:* 24 atenuadores, 3 en cada una de 8 salas (ALFA-0134). Úsala cuando la mano de obra por pieza es idéntica en todas las ubicaciones.
  - *Una partida por ubicación:* la misma cámara repetida como partida en "Caja", "Taller" y "Fachada Trasera" (ALFA-0218). Úsala cuando la mano de obra cambia según el lugar (altura, distancia de cableado, recargos). Motivo: el portal reparte la mano de obra de una partida en partes iguales por pieza entre sus ubicaciones, así que un recargo que solo aplica a un lugar quedaría repartido entre todos.
  - En la duda, una partida por ubicación: nunca reparte mal.
- **Equipo que ya tiene el cliente** (reubicar, reutilizar): la fila de distribución lleva `supply_type = 'client_existing'`. El equipo va en 0 y la mano de obra se cobra. El equipo nuevo lleva `'new_equipment'`. Una misma partida puede mezclar las dos: 4 cámaras, 3 nuevas y 1 del cliente.
- **La ubicación no describe trabajo.** "640 m: 16 cables de 40 m" o "Fin de cada línea" no son ubicaciones. Eso va en la nota visible de la partida (`customer_visible_note`), en el nombre de la actividad de mano de obra o en `SUPUESTOS`.

## 4. Partidas y mano de obra

- **Una partida es un producto del catálogo.** Nunca `product_id` nulo: sin producto no hay clave SAT ni costo, y estorba al facturar y al comprar.
- **La mano de obra va dentro de la partida del equipo que se instala**, como actividades (`quote_item_labor_activities`): colocación, cableado, recargos. El PDF muestra por partida cantidad, equipo en USD, mano de obra en MXN y total en MXN, con las actividades listadas debajo del equipo. El cliente ve qué se le hace a cada cosa.
- **Nunca armes una sección ni una partida suelta de "Mano de obra".** Leo rehízo ALFA-0181 por eso.
- **Material sin instalación propia va sin mano de obra:** cable, conectores, cajas de conexión, bobinas. Su instalación ya está cobrada en el cableado del equipo al que sirven.
- **Servicios sin equipo** (programación, mantenimiento, diagnóstico): producto de marca `ALFA`, modelo `SERV-…`, equipo en 0 y el precio como actividad de mano de obra de esa partida.
- **La cantidad de cada actividad es la cantidad de la partida**, salvo que el trabajo sea por otra unidad (un servicio por sistema). No se sincroniza sola.
- **Regla de precio de la mano de obra:** venta = 2 × costo (margen de 50%), salvo que Leo dé el precio. Las tarifas vigentes y sus `labor_activity_id` están en la sección 4.2 de la guía de GrokBot; no las copies aquí.

## 5. Precio del equipo: margen o precio de lista

### 5.1 Dónde se decide

En el **catálogo**, no en la cotización. Cada producto tiene `pricing_method` y de ahí sale `calculated_sale_price`, que es el precio que toma la cotización. El editor no tiene un campo para "ponerle otro precio" a una partida; lo que existe son descuentos.

| Método (`products.pricing_method`) | Fórmula | Cuándo |
|---|---|---|
| `target_margin` (margen objetivo) | `venta = costo / (1 − margen/100)`. Con el 30% estándar: `costo / 0.70`. | Es el caso normal: equipo sin precio público de referencia. Todo lo de Syscom (Hikvision, Panduit, Ruijie, Linked Pro, DSC, Epcom…). 8,220 de los 8,286 productos activos. |
| `public_price` (precio de lista) | `venta = public_price`. El margen es **el que resulte**; `target_margin` se ignora. | Marcas con precio de lista o precio público sugerido, que el cliente puede consultar por su cuenta. Hoy: Sonos, KEF, B&W, Sonance, Marantz, Episode, Crown, JBL Professional, Biamp, Bose Professional, Shure, WattBox, Panamax, parte de Lutron y de Leviton, Samsung, persianas (Select, Sheer Elegance). |

### 5.2 Cómo pensarlo

- **Margen objetivo** responde a "¿cuánto tengo que ganar sobre lo que me cuesta?". ALFA parte del costo y pone el precio. El objetivo es 30% sobre el precio de venta (no 30% sobre el costo: `costo × 1.30` da 23% de margen y es un error).
- **Precio de lista** responde a "¿cuánto dice el fabricante que vale?". ALFA parte del precio público y acepta el margen que el canal le deja. No se vende arriba de lista, porque el cliente lo encuentra en internet y la cotización pierde credibilidad; tampoco se baja de lista sin que Leo lo decida.
- El precio de lista se captura **sin IVA** y en la moneda del costo. Sonos publica con IVA: se captura `lista / 1.16`.
- El margen por precio de lista varía por marca y es normal que no sea 30%: Sonos deja 20%, Episode, Crown y Marantz 25%, B&W 35%, KEF arriba de 40%.

### 5.3 Qué haces tú al cotizar

1. Toma `calculated_sale_price` tal cual. No lo recalcules ni lo escribas a mano.
2. Revisa el margen real de cada producto: `1 − cost_price / calculated_sale_price`.
3. Avísale a Leo **antes** de entregar si ves alguna de estas señales:
   - Producto `target_margin` con margen real lejos de 30%: el precio quedó desfasado del costo.
   - Producto `public_price` con margen de 0% o casi (precio público = costo). Hoy pasa, entre otros, con Echo Show 11, Lenovo 82XM00MJLM, Nabu Casa, Broadlink RM4 Mini, Leviton T5635-00E y los espejos de marca `Personalizado`.
   - `sale_currency` distinta de `cost_currency`.
   - Costo con más de 30 días sin verificar (`cost_updated_at`). El editor lo bloquea; por SQL la revisión es tuya.
4. **Producto nuevo:** si el fabricante o el distribuidor publica precio de lista, va como `public_price` con ese precio sin IVA; si no, `target_margin` 30. Si no sabes cuál aplica, pregunta: es una decisión comercial de Leo, no técnica.
5. **Nunca cambies el método ni el margen de un producto para que "salga" una cotización.** Si el precio no le sirve a Leo, la herramienta es el descuento (por partida, por marca o general), que queda visible y respeta los topes de `brand_commercial_rules`. Sonos tiene tope de 0% de descuento al cliente.
6. Si Leo dice "cóbrale X", es exactamente X + IVA y no aplica ninguna de las dos fórmulas.

En el reporte a Leo, marca qué partidas van a precio de lista y con qué margen; las demás se asumen a 30%.

## 6. Ejemplo: así se ve una cotización bien armada

ALFA-0218, armada por Leo en el portal (resumida). Dos sistemas, ubicaciones del cliente, mano de obra dentro de cada equipo:

| Sistema | Ubicación | Partida | Cant. | Mano de obra de la partida (venta por pieza) |
|---|---|---|---|---|
| Videovigilancia y CCTV | Site | Grabador DVR-216Q-M1/T | 1 | Colocación 300 |
| | Site | Disco WD44PURZ | 1 | Instalación de disco 300 |
| | Site | Fuente PL-8C-15DC | 2 | Instalación 300 |
| | Site | Baluns, conectores, bobinas de cable, cajas de conexión | varias | Sin mano de obra |
| | Site | Renta de andamio (`SERV-RENTA-ANDAMIO-3`) | 1 | Sin mano de obra |
| | Piso de Ventas | Cámara THC-B150-P | 4 | Colocación 300 + cableado 600 + recargo doble altura 500 |
| | Caja | Cámara THC-B150-P | 1 | Igual |
| | Fachada Exterior | Cámara THC-B150-M | 2 | Igual |
| | Taller | Cámara IPC-B141H-C | 3 | Igual |
| | IDF Taller | Gabinete PST-3040-20A | 1 | Instalación 300 |
| | IDF Taller | Switch PoE RG-ES110GS-P-L | 1 | Colocación 300 + enlace del IDF al site 600 |
| Redes, Cableado Estructurado y WiFi | Sala de Juntas | Access point RG-RAP72PRO | 1 | Colocación 300 + identificación de cable 150 |
| | Site | Inyector RG-POE-AT30 | 1 | Sin mano de obra |

Qué observar:

- La misma cámara aparece como partida separada en cada ubicación.
- Todo lo compartido está en "Site".
- El switch PoE de las cámaras está en Videovigilancia, no en Redes.
- No hay sección "General", ni "Mano de obra", ni una sección por área.

Así **no** se arma (es el error más repetido en las cotizaciones hechas por agentes):

| Mal | Bien |
|---|---|
| Secciones `General`, `Fachada`, `Cocina`, `Site` | Sección `Videovigilancia y CCTV`; ubicaciones `Site`, `Fachada`, `Cocina` |
| Secciones `CCTV · Terraza`, `Red · Terraza`, `Audio · Terraza` | Tres sistemas; cada uno con la ubicación `Terraza` |
| Sección `Mano de obra` o `Programación` | Actividades dentro de cada partida; la programación como `SERV-…` dentro de su sistema |
| Partidas sin ubicación | Cada partida con su ubicación; lo compartido en `Site` |
| Precio de equipo escrito a mano o "ajustado al 30%" en una marca de lista | `calculated_sale_price` del catálogo, sea de margen o de lista |

## 7. Comprobación antes de entregar

No entregues una cotización si no puedes contestar "sí" a todo:

1. ¿Cada sección se llama exactamente como un sistema activo de `quotable_systems` y ninguno se repite?
2. ¿Cada partida tiene ubicación, con el mismo texto cada vez que es el mismo lugar?
3. ¿La suma de ubicaciones de cada partida es igual a su cantidad?
4. ¿Toda la mano de obra está dentro de partidas de equipo o de servicios `SERV-…`, y ninguna en una sección propia?
5. ¿Todas las partidas tienen `product_id`?
6. ¿El precio de cada equipo es el `calculated_sale_price` del catálogo y sabes cuáles van a precio de lista?
7. ¿Revisaste margen real, moneda y antigüedad del costo de cada producto?
8. ¿Sigue en `status = 'draft'`?

Y en tu reporte a Leo incluye siempre, además de los totales:

- los sistemas que usaste y las ubicaciones de cada uno;
- las partidas a precio de lista, con su margen;
- los supuestos que tomaste.

Si Leo ve esa lista, sabe en diez segundos si entendiste el formato.

## 8. Pendiente de confirmar con Leo

- Criterio fino para decidir precio de lista o margen en una marca nueva. Lo de la sección 5 está inferido del catálogo (66 productos en `public_price`) y de la regla de Sonos; no hay una regla escrita por Leo.
- Qué hacer con los productos en `public_price` que hoy tienen margen 0 (precio público = costo): si son ventas al costo a propósito o capturas incompletas.
- Si conviene homologar también los nombres de ubicación (hoy es texto libre).
- Cuándo prefiere Leo una partida con distribución en varias ubicaciones y cuándo una partida por ubicación; la regla de la sección 3 sale de cómo el portal reparte la mano de obra, no de una instrucción suya.

## 9. De dónde sale cada cosa

| Tema | Fuente en el repo |
|---|---|
| Sistemas homologados | `sql/20260825_quotable_systems_catalog.sql`, `app/(admin)/settings/systems/page.tsx`, `addSection()` en `app/(admin)/quotes/new/page.tsx` |
| Ubicaciones y su reparto | `lib/quoteItemPresentation.ts`, `app/(admin)/quotes/QuoteItemAreaDistributionModal.tsx` |
| Cómo lo ve el cliente | `buildSection()` y `getAreaGroups()` en `lib/quotePremiumPdfHtml.ts` |
| Método de precio | `app/(admin)/products/new/page.tsx`, `app/(admin)/products/[id]/edit/page.tsx` |
| Descuentos y topes por marca | `lib/quoteLineDiscounts.ts`, tabla `brand_commercial_rules` |
| Antigüedad del costo | `lib/productFreshness.ts` |
| Ejecución por SQL, tarifas, PDF, aliados | [`../../ai/GUIA_COTIZAR_GROKBOT.md`](../../ai/GUIA_COTIZAR_GROKBOT.md) |
| Módulo completo | [`MODULE_CONTEXT.md`](./MODULE_CONTEXT.md) |
