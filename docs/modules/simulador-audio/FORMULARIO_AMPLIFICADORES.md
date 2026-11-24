# Formulario de amplificadores y datos de bocinas para el simulador de audio

Este formulario es para quien tenga acceso a los portales de Dextra y de Biamp (hoy GrokBot). Sirve para que el simulador de `/simulador-audio` pueda proponer amplificadores además del Sonos AMP, y para destrabar las bocinas que hoy no entran por falta de un dato del fabricante.

Entrega: un archivo CSV por distribuidor, o las tablas llenas en este mismo documento.

## Lo que ya se sabe (2026-11-23)

Los dos catálogos se pueden ver sin iniciar sesión, así que las especificaciones no hace falta copiarlas a mano: basta el modelo y la liga. Lo que no se ve desde fuera es qué modelos se consiguen en México, con qué clave y si hay existencia.

- **Dextra** (dextra.com.mx): tiene amplificadores de Marantz, Denon, Arcam, Episode, Crown, JBL Professional, Bose Professional, LEA y Mark Levinson, entre otros. No maneja Sonos ni Biamp.
- **Biamp** (products.biamp.com): las familias útiles para audio distribuido son REVAMP (baja impedancia y versiones T de 70/100 V), CHAMP, MA (mezcladores), Voltera y Tesira. Varios modelos están marcados como no disponibles en Estados Unidos y Canadá; falta confirmar México.
- **En el catálogo de ALFA** ya están Sonos Amp, Biamp MA120 y Biamp MA240.

Por eso lo más útil es una **lista corta**: los 5 a 10 modelos por distribuidor que ALFA sí cotizaría, con su clave y disponibilidad. Los demás campos son opcionales si viene la liga a la ficha.

## Reglas

1. **Sin precios ni costos.** El simulador es público y no muestra precios. No los incluyas.
2. **Solo datos que estén escritos en la ficha.** Si un dato no aparece, deja la celda vacía. No lo calcules ni lo copies de un modelo parecido.
3. **Siempre la liga a la ficha técnica del fabricante** (PDF o página de especificaciones). Con esa liga se verifica cada número antes de publicarlo.
4. **Unidades:** potencia en watts RMS por canal, impedancia en ohms.

## Parte 1. Amplificadores

Alcance: los modelos que ALFA cotizaría de verdad para audio distribuido en casas, restaurantes, oficinas y terrazas. Hasta unos 15 modelos por distribuidor. Incluye amplificadores estéreo, multicanal o multizona, con streaming integrado, y mezcladores de 70/100 V. No incluyas receptores de cine en casa.

Una fila por modelo. Los valores de la columna de ejemplo son inventados, solo muestran el formato:

| Campo | Qué poner | Ejemplo |
| --- | --- | --- |
| `distribuidor` | Dextra o Biamp (RDA) | Dextra |
| `marca` | Marca del equipo | Marca X |
| `modelo` | Modelo exacto, como viene en la ficha | ABC-100 |
| `sku_distribuidor` | Clave con la que se pide | |
| `tipo` | `estereo`, `multicanal`, `streaming` o `mezclador_70v` | streaming |
| `canales` | Número de canales de salida | 2 |
| `potencia_por_canal_w` | Potencia continua por canal | 100 |
| `impedancia_de_esa_potencia_ohms` | A qué impedancia está medida esa potencia | 8 |
| `potencia_por_canal_4ohm_w` | Si la ficha la da a 4 Ω | 125 |
| `impedancia_minima_ohms` | Carga mínima que acepta por canal | 4 |
| `potencia_70v_100v_w` | Solo si tiene salida de línea; potencia total | |
| `zonas_independientes` | Cuántas zonas con fuente o volumen propio | 1 |
| `streaming_integrado` | `no`, o la plataforma (AirPlay, HEOS, Sonos, Spotify Connect…) | AirPlay 2 |
| `entradas` | Las principales, separadas por coma | HDMI eARC, óptica, RCA, red |
| `puenteable` | `si` o `no`; si aplica, potencia en puente | no |
| `salida_subwoofer` | `si` o `no` | si |
| `unidades_rack` | Alto en unidades de rack, o `no es de rack` | no es de rack |
| `liga_ficha_fabricante` | URL de la ficha técnica | |
| `liga_distribuidor` | URL del producto en el portal del distribuidor | |
| `disponibilidad` | `en existencia`, `sobre pedido` o `descontinuado` | en existencia |
| `notas` | Lo que no quepa arriba | |

Encabezado CSV, listo para copiar:

```csv
distribuidor,marca,modelo,sku_distribuidor,tipo,canales,potencia_por_canal_w,impedancia_de_esa_potencia_ohms,potencia_por_canal_4ohm_w,impedancia_minima_ohms,potencia_70v_100v_w,zonas_independientes,streaming_integrado,entradas,puenteable,salida_subwoofer,unidades_rack,liga_ficha_fabricante,liga_distribuidor,disponibilidad,notas
```

## Parte 2. Datos de bocinas que faltan

El simulador solo publica una bocina cuando el fabricante da su ángulo de cobertura. Estas están en el catálogo de ALFA y hoy no entran. Pídele el dato al distribuidor o al fabricante; sirve cualquiera de estas tres cosas: el ángulo de cobertura nominal (horizontal y vertical, a −6 dB), la gráfica polar, o el archivo EASE/CLF/GLL.

| Marca | Modelo | Proveedor | Qué falta |
| --- | --- | --- | --- |
| Bowers & Wilkins | AM-1 | Dextra | Cobertura horizontal y vertical. Es la de muro que más usa ALFA. |
| Bowers & Wilkins | CCM665 | Dextra | Ángulo de cobertura (plafón). |
| Sonance | VPXT6R | Tecso | Ángulo de cobertura (plafón). Sonance lo marca como descontinuado; confirmar si el reemplazo es VXXT6R. |
| Klipsch | CS-18C | Electrónica y Equipos para la Integración | Ángulo de cobertura (plafón). |

Una fila por modelo:

```csv
marca,modelo,cobertura_horizontal_grados,cobertura_vertical_grados,criterio,liga_o_archivo_fuente,quien_lo_confirmo,notas
```

- `criterio`: cómo lo define el fabricante, por ejemplo `-6 dB, 1 a 4 kHz` o `nominal`.
- `quien_lo_confirmo`: nombre y empresa de quien dio el dato, si llegó por correo y no por ficha.

## Parte 3. Bocinas nuevas (opcional)

Si Dextra o Biamp tienen bocinas de plafón o de muro que ALFA quiera ofrecer en el simulador, agrégalas con este encabezado. Aplican las mismas reglas.

```csv
distribuidor,marca,modelo,sku_distribuidor,montaje,tamano_woofer_pulgadas,cobertura_horizontal_grados,cobertura_vertical_grados,sensibilidad_db,impedancia_ohms,potencia_recomendada_w,transformador_70v_100v,uso_exterior,liga_ficha_fabricante,disponibilidad,notas
```

- `montaje`: `plafon`, `muro_empotrada` o `muro_sobrepuesta`.
- `uso_exterior`: `si` o `no`, y la clasificación IP si la ficha la trae.
