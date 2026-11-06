# Tabulador de mano de obra — René López (subcontratista)

Fuente: Google Sheet "Tabulador de Mano de Obra de Rene Lopez", Drive `ALFA IT/Lista de Precios`
(id `1m6h7sSsqFd_mR-LgemFQLjyetyn22FIdf6cAAZvrvR4`, última edición 2026-07-17).
Entregado por Leo el 2026-11-06.

**Regla de Leo:** estos montos son nuestro **COSTO** de mano de obra (MXN, sin IVA).
**Venta = 2 × costo** (`labor_unit_cost` = PU de René, `labor_unit_sale_price` = 2 × PU).
Si Leo da otro precio de venta, manda el de Leo.

## Canalización

| # | Concepto | Unidad | Costo René | Venta ALFA |
|---|---|---|---:|---:|
| 1 | Escalerilla electrosoldada 54/100 (acarreo, accesorios, limpieza) | m | 248.67 | 497.34 |
| 2 | Escalerilla electrosoldada 54/200 | m | 283.33 | 566.66 |
| 3 | Escalerilla electrosoldada 54/300 | m | 306.67 | 613.34 |
| 4 | Escalerilla electrosoldada 54/400 | m | 347.33 | 694.66 |
| 5 | Tubo Liquaflex 32 mm (conectores, registros, limpieza) | m | 75.60 | 151.20 |
| 6 | Tubo Liquaflex 38 mm | m | 81.60 | 163.20 |
| 7 | Tubo Zapa 13 mm | m | 50.00 | 100.00 |
| 13 | Tubo Zapa 19 mm | m | 60.27 | 120.54 |
| 10 | Tubo pared gruesa 19 mm (coples, conectores, registros) | m | 98.00 | 196.00 |
| 11 | Tubo pared gruesa 25 mm | m | 112.27 | 224.54 |
| 12 | Tubo pared gruesa 38 mm | m | 143.07 | 286.14 |
| 14 | Tubo pared gruesa 51 mm | m | ⚠️ 80.00 (error) | — |
| 8 | Registro tipo Himel 30×25×15 | pza | 477.33 | 954.66 |
| 9 | Registro tipo Himel 40×30×20 | pza | 591.33 | 1,182.66 |
| 15 | Fabricación de soporte para escalerilla (varilla roscada 1/4, mordaza, clip/pera, columpio con unicanal; cada 1.5 m, doble altura) | pza | 127.33 | 254.66 |
| 16 | Fabricación de soporte para tubería 19–25 mm (cada 1.5 m) | pza | 103.33 | 206.66 |
| 17 | Fabricación de soporte para tubería 32–38 mm (cada 1.5 m) | pza | 127.33 | 254.66 |

**Tubo de 51 mm: el 80.00 es un error de captura (Leo lo confirmó el 2026-11-06). No usarlo.** Si una cotización lo necesita, pídele a Leo el precio real de René. Si no lo tiene a la mano, cotiza el peor caso con un estimado que no baje de los 143.07 del tubo de 38 mm (por ejemplo, costo 180, venta 360) y deja la suposición en `SUPUESTOS`.

## Nodos de red

| # | Concepto | Unidad | Costo René | Venta ALFA |
|---|---|---|---:|---:|
| 18 | Nodo de red hasta 90 m (cableado, conexión, pruebas) — proyectos CBRE-IBM | pza | 1,000.00 | 2,000.00 |
| 24 | Nodo de red hasta 90 m — en cuarto de site propio | pza | 796.80 | 1,593.60 |
| 25 | Reubicación de nodo (desmantelar, reubicar, pruebas) | pza | 833.33 | 1,666.66 |
| 23 | Desmantelamiento de nodo (incluye retiro de UTP) | pza | 500.00 | 1,000.00 |

## Fibra óptica

| # | Concepto | Unidad | Costo René | Venta ALFA |
|---|---|---|---:|---:|
| 19 | Fusión de fibra monomodo o multimodo LC | pza | 554.00 | 1,108.00 |

## Access points

| # | Concepto | Unidad | Costo René | Venta ALFA |
|---|---|---|---:|---:|
| 20 | Instalación de AP en producción (plafón, doble altura, base, etiquetado) | pza | 546.00 | 1,092.00 |
| 21 | Instalación de AP en oficinas (viga/lámina/muro a altura media) | pza | 510.00 | 1,020.00 |
| 22 | Desmantelamiento de AP en plafón a doble altura (recuperación y entrega) | pza | 474.00 | 948.00 |

## Obra civil

| # | Concepto | Unidad | Costo René | Venta ALFA |
|---|---|---|---:|---:|
| 24b | Preparación de muro / ranura para tubo 25–38 mm a altura media | pza | 500.00 | 1,000.00 |

(La hoja repite el número 24 para nodo en site y para la ranura en muro.)

## Cómo usarlo

- Aplica cuando el trabajo lo hace René: cableado estructurado, canalización, fibra, APs, obra civil.
- La MO va **dentro de la partida del equipo** que se instala (`quote_item_labor_activities`), por área física; nunca un grupo "Mano de obra" aparte.
- Canalización y soportes sin equipo propio: servicio ALFA (`E48`, SAT `81111800`, costo 0) con la MO en `labor_unit_cost` / `labor_unit_sale_price`.
- Soportes: 1 cada 1.5 m de escalerilla o tubería → `ceil(metros / 1.5)`.
- Las tarifas de `labor_activity_catalog` (cableado 300/600, cámara 200/400, etc.) son más bajas que las de René. Si la obra la hace René, usar este tabulador para que el costo real quede cubierto.
