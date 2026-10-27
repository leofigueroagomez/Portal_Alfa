# Modulo: Inventario/Almacen

Contexto operativo para agentes que modifiquen existencias, kardex, sobrantes de compras de proyecto o consumos de almacen. Antes de tocar SQL, RLS, funciones o server actions, revisar [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md) y el modulo de compras dentro de [`../proyectos/MODULE_CONTEXT.md`](../proyectos/MODULE_CONTEXT.md).

Estado: codigo listo en repo (2026-10-25). Aplicada en **sandbox** el 2026-10-25 (variante sin FK de proveedor, ver Validacion). **Pendiente de aplicar en produccion**; mientras no se aplique, `/inventory` muestra el aviso de modulo no instalado y la pantalla de compras funciona igual que antes (sin botones de almacen).

## Que Hace

Lleva el material propio de ALFA en bodega: existencias por producto y ubicacion, con costo promedio ponderado en MXN y un kardex de movimientos `in | out | adjust`.

Caso que lo motivo: en Genki Poke (proyecto 25) se compro una bobina de 305 m de LP218-FIRE-M (producto 229, Adises, WEB-612566, $2,045.50 MXN, evento 123). Al proyecto se le cargaron 50 m a $6.71 y los 255 m restantes no quedaban registrados en ningun lado.

## Mapa Por Flujo

| Flujo | Archivos confirmados | Responsabilidad |
| --- | --- | --- |
| Existencias y kardex | `app/(admin)/inventory/page.tsx`, `lib/inventory.ts` | Lista de existencias (`inventory_v_stock`), busqueda (incluye sin saldo), kardex por item con saldo y promedio resultantes, origen/destino ligados a proyecto. |
| Alta de entrada | `app/(admin)/inventory/InventoryEntryButton.tsx`, `actions.ts#registerInventoryEntryAction` | Entrada directa de material (producto del catalogo, ubicacion, costo USD/MXN con TC, proveedor, factura). |
| Ajuste | `app/(admin)/inventory/InventoryAdjustButton.tsx`, `actions.ts#adjustInventoryAction` | Conteo fisico: captura la cantidad contada y registra el delta. Motivo obligatorio. Un ajuste negativo sale al promedio; uno positivo entra al costo capturado o al promedio. |
| Sobrante a almacen | `app/(admin)/projects/[id]/purchases/InventoryPurchaseActions.tsx#LeftoverToInventoryButton`, `actions.ts#registerPurchaseLeftoverAction` | Desde un evento de compra del proyecto: entrada con `source_purchase_event_id`. **No toca** el evento ni la linea: el costo ya cargado al proyecto se queda igual. Avisa si ese evento ya tiene sobrante registrado (posible doble captura). |
| Consumir de almacen | `InventoryPurchaseActions.tsx#ConsumeFromInventoryButton`, `actions.ts#consumeInventoryToProjectAction` | Salida a una linea de compra del proyecto: la funcion SQL crea la salida y un `project_purchase_events` en MXN al costo promedio; la app recalcula los totales de la linea con `recalculatePurchaseLineTotals`. |
| Acceso | `components/AdminShell.tsx` (Operacion → Almacen), boton "Almacen" en `/projects/[id]/purchases`, `proxy.ts` (`/inventory`) | Visible solo con `canManagePurchases` (`admin`, `direccion`, `project_manager`, `compras`). |

## Responsabilidad De Archivos Clave

| Archivo | Responsabilidad | Cuando modificar | Riesgos |
| --- | --- | --- | --- |
| `sql/20261025_inventory.sql` | Tablas, indices, RLS, vista `inventory_v_stock` y funciones `inventory_*`. | Cambios de contrato de datos o reglas de costo. | Alto: el saldo y el promedio solo son correctos si todo movimiento pasa por las funciones. |
| `sql/20261025_inventory_seed_genki_poke.sql` | Semilla opcional: 255 m de producto 229 a $6.7066, origen evento 123, proveedor Adises. | No deberia cambiar. | Idempotente; se omite si el evento 123 no existe en el entorno. |
| `lib/inventoryContract.ts` | Validacion de entradas, costo MXN de un evento, promedio ponderado (vista previa) y traduccion de errores SQL. | Nuevos campos o mensajes. | Bajo; las reglas duras estan en SQL. |
| `lib/inventory.ts` | Lecturas server-only (existencias, kardex, sobrantes por evento, eventos generados por consumo). | Nuevas vistas/reportes. | Bajo. |
| `app/(admin)/inventory/actions.ts` | Server actions: perfil activo + `canManagePurchases` antes de usar service role; llaman las funciones SQL por RPC. | Cualquier escritura nueva. | Alto: no quitar el guard; las funciones solo las puede ejecutar `service_role`. |
| `lib/projectPurchases.ts#recalculatePurchaseLineTotals` | Unica funcion que reescribe los totales de una linea desde todos sus eventos, convirtiendo cada evento a la moneda de la linea. La usan "Registrar compra", el PATCH de eventos y "Consumir de almacen". | Si cambia como se calculan totales de compras (lo mantiene el trabajo de correccion de moneda en compras). | Medio: afecta todos los flujos de compra a la vez (es la intencion). |
| `app/api/projects/[id]/purchases/events/[eventId]/route.ts` | Rechaza (409) editar un evento generado por consumo de almacen. | — | Si se quita, editar ese evento desalinea existencias y costo. |

## Contratos De Datos

### `inventory_items`

- `id`, `product_id` (FK `products`, restrict), `location` (default `Almacén principal`), `quantity_available numeric(14,2) >= 0`, `average_cost_mxn numeric(14,4) >= 0`, `last_movement_at`, `notes`, `created_at`, `updated_at`.
- Unico por `(product_id, location)`.

### `inventory_movements` (kardex, append-only)

- `movement_type in ('in','out','adjust')`. `quantity` positiva para `in/out`; con signo para `adjust`.
- Costo: `unit_cost numeric(14,4)`, `cost_currency USD|MXN`, `exchange_rate` (obligatorio si USD), `unit_cost_mxn`, `total_cost_mxn` (valor absoluto del movimiento).
- Saldo resultante: `quantity_after`, `average_cost_mxn_after`.
- Trazabilidad: `source_purchase_event_id` (entrada por sobrante), `client_project_id` + `project_purchase_line_id` + `project_purchase_event_id` (salida a proyecto; el evento es unico por movimiento), `supplier_id`, `invoice_reference`, `notes`, `created_by_user_id` (auth.users), `created_at`.
- El proyecto de origen de un sobrante se obtiene por `source_purchase_event_id → project_purchase_lines.client_project_id`.

### `inventory_v_stock`

Vista `security_invoker` sobre `inventory_items` + `products`: cantidad, promedio, `stock_value_mxn`, marca/modelo/nombre/unidad/sku. `select` solo para `authenticated`; revocada a `anon`.

### Funciones (solo `service_role`)

| Funcion | Que hace |
| --- | --- |
| `inventory_register_entry(...)` | Bloquea/crea el item, recalcula promedio `(q·prom + q_in·costo_mxn)/(q+q_in)` (si el saldo era 0, toma el costo de la entrada) e inserta el movimiento `in`. Valida que `source_purchase_event_id` sea del mismo producto. |
| `inventory_adjust(...)` | Delta con signo; motivo obligatorio; nunca deja saldo negativo. |
| `inventory_consume_to_project(...)` | Bloquea linea e item; valida linea del proyecto, mismo producto, cantidad <= pendiente de la linea y <= existencia; inserta `project_purchase_events` (`MXN`, `unit_cost = round(promedio, 2)`, proveedor `Almacén ALFA`, `warehouse_status = received`, referencia `INV-MOV-{id}`) y el movimiento `out`. No toca totales de la linea. |
| `inventory_lock_item(...)` | Interna: crea si no existe y bloquea `FOR UPDATE`. |

Errores: las funciones lanzan codigos `INVENTORY_*` que `getInventoryErrorMessage` traduce a espanol.

## Reglas De Costo

- Todo se valua en MXN. Una entrada en USD se convierte con su TC al momento de la entrada.
- Salidas y ajustes negativos salen al costo promedio y no lo cambian.
- **Sobrante**: el costo del proyecto no se modifica. El sobrante entra al costo real (sugerido: costo del evento en MXN; para la bobina, $2,045.50 / 305 = $6.7066).
- **Consumo**: el proyecto recibe un evento en MXN al promedio redondeado a 2 decimales (`project_purchase_events.unit_cost` es `numeric(14,2)`); el kardex guarda el promedio con 4 decimales. La diferencia es de centavos y queda en el valor de inventario.
- Vigia: `vigia_v_cst01_purchase_overrun` y `vigia_v_cst05_project_purchase_overrun_total` leen el evento de consumo como costo real en MXN contra el estimado del item operativo. No se modificaron vistas de Vigia.
- Totales de la linea: despues del consumo se llama `recalculatePurchaseLineTotals`, que recalcula desde todos los eventos y convierte cada uno a la moneda de la linea. El evento de consumo es MXN sin `exchange_rate`; en una linea en USD se convierte con el TC de referencia de la partida operativa (conversion aproximada, `fx_exact = false`; el total en MXN queda exacto en `total_purchased_cost_mxn` cuando esa columna existe).

## Reglas De Visibilidad Y Seguridad

- RLS: `inventory_items` e `inventory_movements` tienen solo `beta_authenticated_select`. **Deliberadamente mas estricto** que las `beta_authenticated_*` de compras: sin policies de insert/update/delete para que nadie mueva saldos fuera de las funciones.
- Las funciones `inventory_*` estan revocadas a `public`, `anon` y `authenticated`; solo `service_role` las ejecuta, desde server actions que primero validan perfil activo y `canManagePurchases`.
- `/inventory` agregado a `proxy.ts`; la pagina vuelve a validar el permiso en servidor.
- No es portal cliente: ningun dato de inventario se expone a `/portal`.

## Archivos Que Suelen Cambiar Juntos

- Contrato de datos: `sql/20261025_inventory.sql`, `lib/inventory.ts`, `lib/inventoryContract.ts`, `scripts/smoke-inventory.sql`.
- Flujos de proyecto: `app/(admin)/projects/[id]/purchases/page.tsx`, `InventoryPurchaseActions.tsx`, `app/(admin)/inventory/actions.ts`, `lib/projectPurchases.ts`.
- Totales de compra: `lib/projectPurchases.ts#recalculatePurchaseLineTotals`, `ProjectPurchaseActions.tsx`, `app/api/projects/[id]/purchases/events/[eventId]/route.ts`, `actions.ts#consumeInventoryToProjectAction`.

## Validacion Especifica

- Unitarias (sin base): `npm run test:inventory`.
- SQL (solo sandbox, despues de aplicar la migracion; termina en `ROLLBACK`):
  `psql "$SANDBOX_DB_URL" -v ON_ERROR_STOP=1 -f scripts/smoke-inventory.sql`.
  Verifica promedio MXN/USD, rechazo USD sin TC, consumo (evento MXN recibido, referencia), lectura por `vigia_v_cst01`, rechazo por pendiente/existencia/proyecto ajeno, ajustes, vista y kardex.
- 2026-10-25 se valido localmente en PGlite (Postgres 17 WASM) con stubs + `sql/20260527_project_purchases.sql` + vistas `vigia_v_cst01/cst05` reales: migracion dos veces (idempotente), semilla dos veces (idempotente; evento 123 y linea 444 intactos, 255 m a $6.7066 = $1,710.18), smoke completo, grants (solo `service_role` ejecuta; `anon` sin acceso).
- 2026-10-25 en sandbox (`alfa-os-sandbox`, migracion `inventory_20261025_sandbox_no_supplier_fk`): el sandbox esta atrasado respecto a produccion (no tiene `suppliers`, ni vistas de Vigia, y `tax_object_catalog` esta vacio), asi que se aplico el SQL del repo con una sola diferencia: `inventory_movements.supplier_id` sin FK a `suppliers`. Smoke completo en verde (el paso de Vigia se omite si la vista no existe; el fixture siembra `tax_object_catalog '02'` dentro de la transaccion) y el `ROLLBACK` no dejo filas. Verificado con roles reales: `authenticated` recibe `42501` al insertar directo (RLS) y al ejecutar `inventory_adjust`; `anon` sin acceso a tablas, vista ni funciones. Advisors de seguridad sin hallazgos de `inventory_*`.
- Manual en sandbox:
  - `/inventory` lista existencias, busca, abre kardex; alta y ajuste funcionan;
  - en `/projects/[id]/purchases`, "Sobrante a almacen" en un evento no cambia los totales de la linea;
  - "Consumir de almacen" crea evento "Almacén ALFA", sube "Comprado" y baja existencia;
  - el evento generado muestra "Salió del almacén", no ofrece "Editar" y el PATCH responde 409;
  - un usuario sin `canManagePurchases` no ve el menu ni puede usar `/inventory`.

## Riesgos

- Mover saldos fuera de las funciones (SQL manual, nuevas policies de escritura) rompe kardex y promedio.
- Borrar un `project_purchase_events` generado por consumo deja la salida sin evento (FK `set null`) y el material fuera del almacen.
- El ejecutor de Vigia "fusionar linea huerfana" mueve eventos entre lineas; `inventory_movements.project_purchase_line_id` de un consumo puede quedar apuntando a la linea vieja (solo trazabilidad).
- Si la actualizacion de totales de la linea falla despues del consumo, la salida queda registrada y la accion devuelve un aviso con el numero de movimiento; cualquier recalculo posterior de la linea (otra compra o edicion) la corrige porque se calcula desde todos los eventos.

## Pendientes De Confirmar

- Aplicar `sql/20261025_inventory.sql` (tal cual, con FK a `suppliers`) en produccion; luego, opcionalmente, `sql/20261025_inventory_seed_genki_poke.sql`.
- Si el sandbox se iguala a produccion (tabla `suppliers`), agregar ahi la FK faltante: `alter table public.inventory_movements add constraint inventory_movements_supplier_id_fkey foreign key (supplier_id) references public.suppliers(id) on delete set null;`.
- La tabla `suppliers` no esta versionada en `sql/` (existe en produccion, no en sandbox).
- Probar la UI (`/inventory` y botones en compras) en un entorno con la migracion aplicada; no se ha probado en navegador.
- Reverso de un consumo (devolver al almacen y cancelar el evento del proyecto): no existe; hoy se corrige con ajuste de inventario y revision manual de la linea.
- Consumir material para un producto que no esta en las lineas de compra del proyecto: no soportado.
- Transferencias entre ubicaciones: no soportado (se haria con ajuste − / ajuste +).

## Documentos Relacionados

- [`../../ai/AI_CONTEXT.md`](../../ai/AI_CONTEXT.md)
- [`../../ai/MODULE_INDEX.md`](../../ai/MODULE_INDEX.md)
- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
- [`../proyectos/MODULE_CONTEXT.md`](../proyectos/MODULE_CONTEXT.md)
- [`../vigia/MODULE_CONTEXT.md`](../vigia/MODULE_CONTEXT.md)
