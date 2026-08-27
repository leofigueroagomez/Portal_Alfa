const fs = require('fs');
const path = require('path');

const csvData = `Modelo,Marca,Título,Precio Lista,Precio Especial,Su Precio,Código Fiscal,Descripción
LUBP1,LUTRON RADIORA 3,"Adaptador de barril a terminal para controlador Lumaris tunable white, juego de 3, sistema Lutron Tape Light",54.00,47.51,29.55,39112403,"Juego de 3 adaptadores de barril a terminal, accesorio de alimentación del sistema Lutron Tape Light para tira LED. Permite conectar fuente de poder directamente a terminales Lumaris sin cortar cables ni soldar."
LUCK1TW,LUTRON RADIORA 3,"Conector wire-to-tape de 3 pines para tira LED, paquete de 10, sistema Lutron Tape Light",33.75,29.39,18.28,39112403,"Conectores wire-to-tape de 3 pines para unión sin soldadura de cable con segmentos de tira LED tunable white Lutron en RadioRA 3 y HomeWorks QSX."
LUMK1,LUTRON RADIORA 3,"Clip de montaje superficial para tira LED tunable white, 10 mm, paquete de 20, sistema Lutron Tape Light",54.00,47.51,29.55,39112403,"Paquete de 20 clips de montaje superficial de 10 mm para fijar tira LED tunable white Lutron directamente sobre superficies."
LUPH3A,LUTRON RADIORA 3,"Interfaz de alimentación cableada para tira LED Lumaris, hasta 3 controladores inalámbricos, sistema RadioRA 3",393.75,342.97,213.35,39112403,"Interfaz de alimentación cableada de 120-277 V a 24 V, energiza hasta 3 controladores inalámbricos Lumaris y hasta 15 m de tira LED."
LUT05DL,LUTRON RADIORA 3,"Cinta LED Lumaris de luz de día ajustable (2500K-5000K), carrete de 5 m, 24 V, compatible con RadioRA 3 y HomeWorks QSX",337.50,303.58,188.85,39112403,"Cinta de luz blanca ajustable Lumaris de 2 canales (2500K a 5000K), carrete de 5 m, 24 V CD, 200 lm/pie, CRI 90+."
LUT05SW,LUTRON RADIORA 3,"Cinta LED Lumaris de blanco cálido ajustable (1800K-3000K), carrete de 5 m, 24 V, compatible con RadioRA 3 y HomeWorks QSX",337.50,296.91,184.70,39112403,"Cinta LED Lumaris blanco cálido ajustable de 1800K a 3000K, carrete de 5 m, 24 V CD, 200 lm/pie, CRI 90+."
LUT30DL,LUTRON RADIORA 3,"Cinta LED Lumaris de luz de día ajustable (2500K-5000K), carrete de 30 m, 24 V, compatible con RadioRA 3 y HomeWorks QSX",1800.00,1720.00,1069.97,39112403,"Cinta LED Lumaris luz de día ajustable (2500K-5000K), carrete de 30 m para recorridos largos, 24 V CD, CRI 90+."
LUT30SW,LUTRON RADIORA 3,"Cinta LED Lumaris de blanco cálido ajustable (1800K-3000K), carrete de 30 m, 24 V, compatible con RadioRA 3 y HomeWorks QSX",1800.00,1567.84,975.32,39112403,"Cinta LED Lumaris blanco cálido ajustable de 1800K a 3000K, carrete de 30 m para recorridos largos, 24 V CD, CRI 90+."
LUWK1TW,LUTRON RADIORA 3,"Cable de 3 conductores 22 AWG de 50 ft para tira LED tunable white, sistema Lutron Tape Light",112.50,97.99,60.95,39112403,"Cable de 3 conductores 22 AWG (15.2 m) para cableado entre controlador inalámbrico y tira LED tunable white Lutron Tape Light."
RRLCD4WHTW,LUTRON RADIORA 3,"Downlight empotrable sin carcasa Lumaris Tunable White 4 pulg (1800K-4000K), 8.5W, 800 lm, Clear Connect Type X",250.00,225.00,139.96,39112403,"Downlight empotrable canless de 4 pulgadas con luz blanca ajustable (1800K a 4000K), 8.5 W, 800 lúmenes, atenuación continua hasta 0.1%, RF Type X."
RRLCD6WHTW,LUTRON RADIORA 3,"Downlight empotrable sin carcasa Lumaris Tunable White 6 pulg (1800K-4000K), 8.5W, 800 lm, Clear Connect Type X",250.00,225.00,139.96,39112403,"Downlight empotrable canless de 6 pulgadas con luz blanca ajustable (1800K a 4000K), 8.5 W, 800 lúmenes, atenuación sin parpadeo hasta 0.1%, RF Type X."
RRLTLKDL,LUTRON RADIORA 3,"Kit de tira LED Lumaris de blanco ajustable 2500K-5000K con controlador inalámbrico, para RadioRA 3",787.50,682.50,424.56,39112403,"Kit completo nativo de RadioRA 3: tira LED de 5 m blanco ajustable (2500K-5000K), controlador inalámbrico con drivers integrados, fuente de poder y conectores."
RRLTLKSW,LUTRON RADIORA 3,"Kit de tira LED Lumaris regulable 1800K-3000K con controlador inalámbrico, para RadioRA 3",787.50,672.22,418.17,39112403,"Kit completo nativo RadioRA 3: tira LED de 5 m blanco cálido (1800K-3000K), controlador inalámbrico con drivers integrados, fuente de poder y accesorios."
RRLTWCLWH,LUTRON RADIORA 3,"Controlador inalámbrico Lumaris de blanco ajustable para tiras LED regulables, para RadioRA 3",450.00,388.00,241.36,39112403,"Controlador inalámbrico Lumaris de 2 canales para tiras LED ajustables en RadioRA 3, tecnología Clear Connect Type X, carga máxima 32 W, atenuación a 0.1%."
RRLTWCWH,LUTRON RADIORA 3,"Controlador inalámbrico Lumaris con fuente de poder incluida, para tiras LED regulables de RadioRA 3",562.50,512.60,318.87,39112403,"Controlador inalámbrico Lumaris con fuente de alimentación directa incluida (100-240 V CA a 24 V), soporte hasta 32 W de carga, Clear Connect Type X."
RRPROC3CW,LUTRON RADIORA 3,"Procesador (hub) RadioRA 3 con adaptador de empotrar y de caja de conexiones, alimentado por PoE",592.88,527.00,327.83,39112403,"Procesador central hub RadioRA 3 con adaptadores de montaje empotrado y caja de conexión, alimentación PoE, gestión de hasta 100 dispositivos Type X y 95 Type A."
RRPROC3KIT,LUTRON RADIORA 3,"Kit de procesador principal para sistema RadioRA 3 con inyector PoE y cables Ethernet",620.71,593.13,368.97,39112403,"Kit procesador central RadioRA 3 completo: procesador, inyector PoE, adaptador de repisa y cables de red. Hasta 100 dispositivos Type X y 95 Type A por procesador."
RRST8ANSDE,LUTRON RADIORA 3,"Apagador inteligente Sunnata on/off, 8 A iluminación y 5.8 A motor, acabado Deep Sea, para RadioRA 3",246.94,208.53,129.72,39112403,"Apagador inteligente Sunnata on/off de pared con neutro, conmuta 8 A en iluminación o 5.8 A en motor, acabado satinado Deep Sea, RF Clear Connect Type X."
RRST8ANSMN,LUTRON RADIORA 3,"Apagador electrónico Sunnata on/off, 8 A iluminación y motor 1/4 HP, acabado Midnight, para RadioRA 3",248.17,237.13,147.51,39112403,"Apagador electrónico Sunnata de pared con neutro, 8 A de carga de iluminación o 1/4 HP motor, acabado negro Midnight satinado, RF Clear Connect Type X."
RRST8ANSPB,LUTRON RADIORA 3,"Apagador de pared táctil con neutro para iluminación 8 A y motores 5.8 A, acabado Pebble, RadioRA 3",241.45,241.45,150.20,39112403,"Apagador inteligente Sunnata táctil de pared con neutro, 8 A iluminación, 5.8 A motor, acabado satinado Pebble, barra LED localizadora, RadioRA 3."
RRST8ANSSW,LUTRON RADIORA 3,"Interruptor táctil on/off Sunnata con cable neutro, 8 A iluminación y 5.8 A motor, acabado Nieve, RadioRA 3",246.94,222.80,138.59,39112403,"Interruptor Sunnata táctil on/off con barra de luz indicadora, 8 A iluminación, 5.8 A motor, acabado satinado Nieve (Snow), RadioRA 3."
RRST8ANSTP,LUTRON RADIORA 3,"Apagador inteligente Sunnata on/off, 8 A iluminación y 5.8 A motor, acabado Taupe, para RadioRA 3",246.94,246.94,153.61,39112403,"Apagador inteligente Sunnata on/off de pared con neutro, 8 A iluminación o 1/4 HP motor, acabado satinado Taupe, barra LED con MyLevel, RadioRA 3."
RRST8ANSWH,LUTRON RADIORA 3,"Apagador electrónico Sunnata on/off, 8 A iluminación y motor 1/4 HP, acabado Blanco brillante, para RadioRA 3",250.65,239.51,148.99,39112403,"Apagador electrónico Sunnata on/off de pared con neutro, 8 A iluminación, 1/4 HP motor, acabado blanco brillante, RF Clear Connect Type X."
RRSTANFPB,LUTRON RADIORA 3,"Control de ventilador de pared táctil de 4 velocidades para ventilador de techo AC, acabado Pebble, RadioRA 3",315.48,315.48,196.25,39112403,"Control de ventilador Sunnata táctil de 4 velocidades silenciosas para motores de CA de hasta 1.5 A, barra de luz interactiva, acabado Pebble, RadioRA 3."
RRSTANFWH,LUTRON RADIORA 3,"Control de ventilador de techo táctil de 4 velocidades para ventilador tipo paleta AC, acabado Blanco, RadioRA 3",283.79,260.39,161.98,39112403,"Control de ventilador de techo Sunnata de 4 velocidades silenciosas para motor de CA de hasta 1.5 A, barra de luz localizadora, acabado Blanco, RadioRA 3."
RRSTHN2BBL,LUTRON RADIORA 3,"Botonera Sunnata híbrida negro, 2 botones con dimmer integrado, requiere neutro, para RadioRA 3",515.35,515.35,320.58,39112403,"Botonera híbrida Sunnata de 2 botones con atenuador integrado (150 W LED / 450 W Inc), carátulas intercambiables, acabado Negro, RadioRA 3."
RRSTHN2BWH,LUTRON RADIORA 3,"Botonera híbrida Sunnata RF de 2 botones con dimmer integrado, acabado Blanco, para RadioRA 3",515.35,476.00,296.11,39112403,"Botonera híbrida Sunnata de 2 botones con dimmer integrado para control de carga directa y escenas en RadioRA 3, acabado Blanco brillante."
RRSTHN3RLBL,LUTRON RADIORA 3,"Botonera Sunnata híbrida negro 3 escenas y 2 botones subir/bajar, dimmer integrado, para RadioRA 3",527.30,527.30,328.02,39112403,"Botonera híbrida Sunnata de 3 botones de escena más control subir/bajar con atenuador de carga integrado, acabado Negro, RadioRA 3."
RRSTHN3RLLA,LUTRON RADIORA 3,"Botonera híbrida Sunnata de 3 botones con subir/bajar y atenuador integrado, color Almendra claro, RadioRA 3",527.30,527.30,328.02,39112403,"Botonera híbrida Sunnata de 3 botones de escena más subir/bajar con dimmer integrado para carga de 120 V, acabado Almendra claro, RadioRA 3."
RRSTHN3RLMN,LUTRON RADIORA 3,"Botonera híbrida Sunnata con 3 botones de escena y barra subir/bajar, acabado Midnight, RadioRA 3",527.07,473.18,294.35,39112403,"Botonera híbrida Sunnata de pared con 3 botones de escena y barra subir/bajar con atenuador de carga integrado, acabado Midnight, RadioRA 3."
RRSTHN3RLSW,LUTRON RADIORA 3,"Botonera híbrida Sunnata de 3 botones con subir/bajar y dimmer integrado, acabado Nieve, para RadioRA 3",527.07,449.76,279.78,39112403,"Botonera híbrida Sunnata de 3 escenas + subir/bajar con atenuador integrado para no requerir chalupa adicional, acabado Nieve (Snow), RadioRA 3."
RRSTHN3RLWH,LUTRON RADIORA 3,"Botonera híbrida Sunnata con 3 botones de escena y barra subir/bajar, acabado Blanco brillante, RadioRA 3",527.07,469.62,292.14,39112403,"Botonera híbrida Sunnata de 3 botones de escena + subir/bajar con atenuador integrado de 120 V, acabado Blanco brillante, RadioRA 3."
RRSTHN4BBL,LUTRON RADIORA 3,"Botonera híbrida Sunnata con dimmer integrado, 4 botones de escena, acabado Negro brillante, RadioRA 3",527.30,527.30,328.02,39112403,"Botonera híbrida Sunnata de 4 botones con dimmer de carga integrado para remodelaciones, grabado retroiluminado, acabado Negro brillante."
RRSTHN4BMN,LUTRON RADIORA 3,"Botonera híbrida Sunnata con 4 botones de escena y dimmer integrado, acabado Midnight, para RadioRA 3",527.06,473.38,294.48,39112403,"Botonera híbrida Sunnata de 4 botones de escena con dimmer integrado, botones retroiluminados personalizables, acabado Midnight, RadioRA 3.",
RRSTHN4BPB,LUTRON RADIORA 3,"Teclado híbrido Sunnata RF de 4 botones con atenuador integrado, acabado Pebble, para RadioRA 3",515.35,515.35,320.58,39112403,"Teclado híbrido Sunnata RF de 4 botones con atenuador integrado, barras LED retroiluminadas, acabado satinado Pebble, RadioRA 3."
RRSTHN4BSW,LUTRON RADIORA 3,"Botonera híbrida Sunnata de 4 botones con dimmer integrado, acabado Nieve satinado, para RadioRA 3",535.94,482.61,300.22,39112403,"Botonera híbrida Sunnata de 4 botones con dimmer integrado para activación de escenas y ajuste fino, acabado Nieve (Snow), RadioRA 3."
RRSTHN4BTF,LUTRON RADIORA 3,"Botonera híbrida de 4 botones con atenuador integrado para RadioRA 3, acabado satinado color Truffle",527.06,527.06,327.87,39112403,"Botonera híbrida Sunnata de 4 botones de escena con atenuador cableado integrado, acabado satinado color Truffle, RadioRA 3."
RRSTHN4BWH,LUTRON RADIORA 3,"Botonera híbrida Sunnata con 4 botones de escena y dimmer integrado, acabado Blanco brillante, RadioRA 3",527.06,475.55,295.83,39112403,"Botonera híbrida Sunnata de 4 botones con dimmer integrado para activar escenas y controlar iluminación en RadioRA 3, acabado Blanco brillante."
RRSTPRONDE,LUTRON RADIORA 3,"Atenuador táctil Sunnata PRO con neutro para RadioRA 3, 250 W LED / 500 W Inc, color Deep Sea",246.94,210.72,131.08,39112403,"Atenuador táctil Sunnata PRO LED+ con neutro, barra de luz interactiva con MyLevel, 250 W LED o 500 W Inc/Hal/ELV, acabado Deep Sea, RadioRA 3."
RRSTPRONMN,LUTRON RADIORA 3,"Atenuador de pared táctil Sunnata Pro LED+ con barra de luz, 250 W LED, acabado negro Midnight, RadioRA 3",250.65,239.51,148.99,39112403,"Atenuador táctil Sunnata Pro LED+ de pared con neutro, barra deslizante de luz, 250 W LED / 500 W Inc, acabado negro Midnight, RadioRA 3."
RRSTPRONPB,LUTRON RADIORA 3,"Atenuador de pared táctil Sunnata Pro con neutro para LED hasta 250 W, acabado Pebble, RadioRA 3",241.45,221.70,137.91,39112403,"Atenuador táctil Sunnata Pro con neutro, tecnología RTISS de compensación de voltaje, 250 W LED / 500 W Inc, acabado Pebble, RadioRA 3."
RRSTPRONSW,LUTRON RADIORA 3,"Atenuador táctil Sunnata Pro LED+ con barra de luz, cable neutro, acabado Nieve satinado, RadioRA 3",246.94,228.40,142.08,39112403,"Atenuador táctil Sunnata Pro LED+ de pared con neutro, atenuación suave y silenciosa, 250 W LED / 500 W Inc, acabado Nieve (Snow), RadioRA 3."
RRSTPRONTF,LUTRON RADIORA 3,"Atenuador de pared táctil Sunnata Pro con neutro para RadioRA 3, 250 W LED / 500 W Inc, color Trufa",246.99,246.99,153.64,39112403,"Atenuador táctil Sunnata Pro con neutro, control táctil con barra interactiva, 250 W LED / 500 W Inc/Hal/ELV, acabado satinado Trufa, RadioRA 3."
RRSTPRONWH,LUTRON RADIORA 3,"Atenuador de pared táctil Sunnata Pro LED+ con barra de luz, 250 W LED / 500 W Inc, color Blanco brillante, RadioRA 3",250.65,239.51,148.99,39112403,"Atenuador táctil Sunnata Pro LED+ de pared con neutro, barra deslizante interactiva, 250 W LED / 500 W Inc/Hal/ELV, acabado Blanco brillante, RadioRA 3."
RRSTRDBL,LUTRON RADIORA 3,"Atenuador auxiliar Sunnata companion con panel táctil RF, 120 V, para 3 vías o escalera, acabado Negro, RadioRA 3",119.90,119.90,74.58,39112403,"Atenuador auxiliar compañero para control de atenuación multilocación (3 vías o escalera) emparejado con dimmer principal Sunnata, acabado Negro."
RRSTRDMN,LUTRON RADIORA 3,"Atenuador auxiliar Sunnata companion para 3 vías o escalera, 120 V, acabado Midnight, RadioRA 3",128.77,116.17,72.26,39112403,"Atenuador auxiliar compañero cableado para control multipunto de dimmer principal Sunnata LED+, acabado negro mate Midnight, RadioRA 3."
RRSTRDPB,LUTRON RADIORA 3,"Atenuador auxiliar companion de pared para control multilocación 3 vías, acabado Pebble, RadioRA 3",125.91,125.91,78.32,39112403,"Atenuador auxiliar companion para dimmer principal Sunnata en pasillos y escaleras, no requiere neutro local, acabado Pebble, RadioRA 3."
RRSTRDWH,LUTRON RADIORA 3,"Atenuador auxiliar companion de pared para control multilocación (3 vías o más), acabado Blanco, RadioRA 3",128.77,120.01,74.65,39112403,"Atenuador auxiliar companion para dimmer principal Sunnata, control de hasta 5 puntos en escaleras y pasillos, acabado Blanco brillante, RadioRA 3."
RRSTRSMN,LUTRON RADIORA 3,"Apagador auxiliar Sunnata companion para control de 3 vías o escalera, acabado Midnight, RadioRA 3",128.77,108.74,67.64,39112403,"Apagador auxiliar compañero cableado para switch principal Sunnata RF (RRST-8ANS), hasta 4 auxiliares por circuito, acabado Midnight, RadioRA 3."
RRSTRSPB,LUTRON RADIORA 3,"Apagador auxiliar companion de pared para control multilocación 3 vías, acabado Pebble, RadioRA 3",125.91,125.91,78.32,39112403,"Apagador auxiliar companion para switch principal Sunnata, retardo de apagado 30 s, no requiere neutro local, acabado Pebble, RadioRA 3."
RRSTRSSW,LUTRON RADIORA 3,"Apagador auxiliar Sunnata companion para control de 3 vías o escalera, acabado Nieve satinado, RadioRA 3",128.77,111.05,69.08,39112403,"Apagador auxiliar compañero cableado para switch principal Sunnata RF, control desde múltiples puntos, acabado blanco mate Nieve (Snow), RadioRA 3."
RRSTRSTP,LUTRON RADIORA 3,"Apagador auxiliar companion para control multi-ubicación, línea Sunnata, acabado Satin Taupe, RadioRA 3",128.77,117.33,72.98,39112403,"Apagador auxiliar companion para switch principal Sunnata, sincronización de luz indicadora, sin requerir neutro, acabado Satin Taupe, RadioRA 3."
RRSTRSWH,LUTRON RADIORA 3,"Apagador auxiliar Sunnata companion para control de 3 vías o escalera, acabado Blanco brillante, RadioRA 3",130.71,124.90,77.69,39112403,"Apagador auxiliar compañero cableado para switch principal Sunnata RF, hasta 4 auxiliares por circuito, acabado blanco brillante, RadioRA 3."
RRSTW2BMN,LUTRON RADIORA 3,"Teclado de pared Sunnata de 2 botones para escenas con barra luminosa, acabado Midnight, RadioRA 3",400.50,343.38,213.60,39112403,"Teclado de pared Sunnata RF de 2 botones para activación de escenas completas de iluminación y persianas, barra luminosa, acabado Midnight, RadioRA 3."
RRSTW2BPB,LUTRON RADIORA 3,"Botonera de pared Sunnata con 2 botones de escena, RF 2.4 GHz, color Pebble, para sistema RadioRA 3",391.60,391.60,243.60,39112403,"Botonera de pared Sunnata de 2 botones programables para escenas, RF Clear Connect Type X a 2.4 GHz, barras LED indicadoras, acabado Pebble, RadioRA 3."
RRSTW2BSW,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 2 botones con barra luminosa localizadora, acabado Nieve satinado, RadioRA 3",400.50,338.20,210.38,39112403,"Teclado Sunnata RF de 2 botones para pares de escenas (Bienvenido/Lejos), control de grupos de iluminación y audio, acabado Nieve (Snow), RadioRA 3."
RRSTW2BWH,LUTRON RADIORA 3,"Teclado de pared Sunnata de 2 botones para escenas de luces y persianas, acabado Blanco brillante, RadioRA 3",405.00,377.65,234.92,39112403,"Teclado de pared Sunnata RF de 2 botones de escena con barra luminosa localizadora, comunicación Clear Connect Type X, acabado Blanco brillante, RadioRA 3."
RRSTW3RLLA,LUTRON RADIORA 3,"Botonera Sunnata de 3 botones con subir/bajar para escenas de iluminación, color Almendra claro, RadioRA 3",400.68,400.68,249.25,39112403,"Botonera Sunnata de pared con 3 botones de escena programables más control subir/bajar para ajuste fino, 120-277 V, acabado Almendra claro, RadioRA 3."
RRSTW3RLMN,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 3 botones con subir y bajar, comunicación Clear Connect, acabado Midnight, RadioRA 3",400.50,358.85,223.23,39112403,"Teclado de pared Sunnata de 3 botones de escena más subir/bajar, barras LED indicadoras por botón, 120-277 V, acabado satinado Midnight, RadioRA 3."
RRSTW3RLPB,LUTRON RADIORA 3,"Botonera de pared Sunnata con 3 botones de escena y subir/bajar, RF 2.4 GHz, acabado Pebble, RadioRA 3",391.60,391.60,243.60,39112403,"Botonera Sunnata de 3 botones de escena más subir/bajar, comunicación RF Clear Connect Type X, barras LED de estado, acabado Pebble, RadioRA 3."
RRSTW3RLSW,LUTRON RADIORA 3,"Teclado inalámbrico Sunnata RF de 3 botones con subir/bajar para escenas de iluminación, acabado Nieve, RadioRA 3",402.50,366.72,228.12,39112403,"Teclado inalámbrico Sunnata RF de 3 botones para escenas más subir/bajar para ajuste de intensidad, acabado Nieve (Snow), RadioRA 3."
RRSTW3RLWH,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 3 botones con subir y bajar, comunicación Clear Connect, acabado Blanco brillante, RadioRA 3",401.00,357.07,222.12,39112403,"Teclado de pared Sunnata de 3 botones de escena más subir/bajar, barras LED indicadoras, comunicación Clear Connect Type X, acabado Blanco brillante, RadioRA 3."
RRSTW4BMN,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 4 botones, comunicación Clear Connect, acabado Midnight, para sistema RadioRA 3",402.50,384.61,239.25,39112403,"Teclado de pared Sunnata de 4 botones de escena independientes, barras LED indicadoras, 120-277 V, acabado satinado Midnight, RadioRA 3."
RRSTW4BPB,LUTRON RADIORA 3,"Botonera Sunnata de pared con 4 botones para escenas, comunicación RF Clear Connect 2.4 GHz, acabado Pebble, RadioRA 3",391.60,391.60,243.60,39112403,"Botonera Sunnata inalámbrica de 4 botones para activación de escenas predefinidas, RF Clear Connect Type X a 2.4 GHz, acabado Pebble, RadioRA 3."
RRSTW4BSW,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 4 botones con barra luminosa localizadora, acabado Nieve satinado, RadioRA 3",402.50,384.61,239.25,39112403,"Teclado Sunnata de 4 botones para escenas independientes (Despertar/Cocinar/Cenar/Apagar), barra luminosa localizadora, acabado Nieve, RadioRA 3."
RRSTW4BWH,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 4 botones, comunicación Clear Connect, acabado Blanco brillante, RadioRA 3",402.50,384.61,239.25,39112403,"Teclado de pared Sunnata de 4 botones de escena independientes, barras LED indicadoras, comunicación Clear Connect Type X, acabado Blanco brillante, RadioRA 3."
ST6ANSPB,LUTRON RADIORA 3,"Interruptor de pared Sunnata on/off sin regulación, 6 A iluminación / 3 A motor, acabado Pebble, RadioRA 3",164.89,164.89,102.57,39112403,"Interruptor de pared Sunnata de encendido/apagado, conmuta 6 A iluminación o 3 A motor/ventilador, luz indicadora MyLevel, acabado Pebble, RadioRA 3."`;

const IMAGES = {
  PROC3_KIT: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=85',
  PROC3_CW: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=85',

  DIMMER_WHITE: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=85',
  DIMMER_MIDNIGHT: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85',
  DIMMER_DEEP_SEA: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1000&q=85',
  DIMMER_PEBBLE: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85',
  DIMMER_SNOW: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1000&q=85',
  DIMMER_TRUFFLE: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=85',

  KEYPAD_WHITE: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=85',
  KEYPAD_MIDNIGHT: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85',
  KEYPAD_PEBBLE: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85',
  KEYPAD_SNOW: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1000&q=85',
  KEYPAD_ALMOND: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=85',

  LUMARIS_TAPE: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&w=1000&q=85',
  LUMARIS_KIT: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=85',
  LUMARIS_DOWNLIGHT: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=1000&q=85',
  LUMARIS_CONTROLLER: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=85',

  FAN_CONTROL: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1000&q=85',
  HARDWARE: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=85',
};

function getAestheticImage(model, name) {
  const m = (model || '').toUpperCase();

  // Processors
  if (m.includes('PROC3KIT')) return IMAGES.PROC3_KIT;
  if (m.includes('PROC3')) return IMAGES.PROC3_CW;

  // Downlights
  if (m.includes('RRLCD')) return IMAGES.LUMARIS_DOWNLIGHT;

  // Lumaris Tape / Kits
  if (m.includes('RRLTLK')) return IMAGES.LUMARIS_KIT;
  if (m.includes('LUT05') || m.includes('LUT30')) return IMAGES.LUMARIS_TAPE;
  if (m.includes('RRLTW') || m.includes('LUPH3')) return IMAGES.LUMARIS_CONTROLLER;
  if (m.includes('LUBP') || m.includes('LUCK') || m.includes('LUMK') || m.includes('LUWK')) return IMAGES.HARDWARE;

  // Fan Controls
  if (m.includes('STANF')) return IMAGES.FAN_CONTROL;

  // Keypads
  if (m.includes('STW') || m.includes('STHN')) {
    if (m.endsWith('MN') || m.endsWith('BL')) return IMAGES.KEYPAD_MIDNIGHT;
    if (m.endsWith('PB')) return IMAGES.KEYPAD_PEBBLE;
    if (m.endsWith('SW')) return IMAGES.KEYPAD_SNOW;
    if (m.endsWith('LA')) return IMAGES.KEYPAD_ALMOND;
    return IMAGES.KEYPAD_WHITE;
  }

  // Dimmers & Switches
  if (m.endsWith('MN') || m.endsWith('BL')) return IMAGES.DIMMER_MIDNIGHT;
  if (m.endsWith('DE')) return IMAGES.DIMMER_DEEP_SEA;
  if (m.endsWith('PB')) return IMAGES.DIMMER_PEBBLE;
  if (m.endsWith('SW')) return IMAGES.DIMMER_SNOW;
  if (m.endsWith('TF') || m.endsWith('TP')) return IMAGES.DIMMER_TRUFFLE;

  return IMAGES.DIMMER_WHITE;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    let inQuotes = false;
    let currentField = '';
    const fields = [];

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        if (inQuotes && line[c + 1] === '"') {
          currentField += '"';
          c++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField);

    results.push({
      model: fields[0] ? fields[0].trim() : '',
      brand: fields[1] ? fields[1].trim() : 'Lutron',
      title: fields[2] ? fields[2].trim() : '',
      listPrice: parseFloat(fields[3]) || 0,
      specialPrice: parseFloat(fields[4]) || 0,
      costPrice: parseFloat(fields[5]) || 0,
      satCode: fields[6] ? fields[6].trim() : '39112403',
      description: fields[7] ? fields[7].trim() : '',
    });
  }
  return results;
}

const products = parseCSV(csvData);

const mapped = products.map((p, idx) => {
  const model = p.model;
  const name = p.title;
  const titlePart = slugify(name.split(',')[0].slice(0, 30));
  const slug = ('lutron-radiora3-' + slugify(model) + '-' + titlePart).replace(/-+/g, '-');
  const shortDesc = p.description.slice(0, 300);
  const imageUrl = getAestheticImage(model, name);
  const seoTitle = name.slice(0, 55) + ' (' + model + ') | Cotización México | ALFA';
  const seoDesc = 'Cotiza el modelo ' + model + ' de Lutron RadioRA 3 en México (' + name.slice(0, 80) + '). Suministro oficial, asesoría técnica e instalación con ALFA.';

  return {
    id: 100 + idx,
    slug,
    brand_id: 1,
    brand_name: "Lutron",
    brand_slug: "lutron",
    brand_logo_url: "/logos/brands/lutron.png",
    brand_partner_tier: "Distribuidor e Integrador Especialista Certificado",
    model,
    name,
    sku: model,
    short_description: shortDesc,
    description: shortDesc,
    category: "Control e Iluminación",
    category_id: 1,
    image_url: imageUrl,
    specifications: {
      "Sistema": "Lutron RadioRA 3",
      "Modelo Oficial": model,
      "Tecnología": "Clear Connect Type X",
      "Garantía Oficial": "1 a 5 años según modelo",
      "Integración": "ALFA OS / Control4 / Crestron / Apple Home"
    },
    highlights: [
      "Ecosistema oficial Lutron RadioRA 3",
      "Garantía oficial y suministro directo en México",
      "Integración y programación respaldada en ALFA OS",
      "Asesoría técnica y cálculo de cargas sin costo adicional"
    ],
    warranty_years: 3.0,
    is_favorite: model.includes("PROC3") || model.includes("PRONWH") || model.includes("HN4BWH"),
    is_public: true,
    is_active: true,
    seo_title: seoTitle,
    seo_description: seoDesc,
    seo_keywords: ["Lutron RadioRA 3", model, "Lutron " + model, "RadioRA 3 Mexico", "Lutron cotizacion"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
});

const fileContent = `import { Brand, CatalogProduct } from "./catalog";

export const STATIC_BRANDS: Brand[] = [
  {
    id: 1,
    name: "Lutron",
    slug: "lutron",
    tagline: "Control de Iluminación Arquitectónica y Persianas Motorizadas de Lujo",
    description:
      "Líder mundial indiscutible en sistemas de control de iluminación residencial y comercial. Creadores de RadioRA 3, HomeWorks QSX, botoneras de autor (Sunnata, Palladiom, Alisse), sombreado automatizado ultra silencioso y ecosistemas de confort visual como Ketra y Lumaris.",
    logo_url: "/logos/brands/lutron.png",
    hero_image_url: "/projects/residencia-premium.jpeg",
    website_url: "https://www.lutron.com",
    origin_country: "Estados Unidos",
    focus_areas: [
      "RadioRA 3",
      "HomeWorks QSX",
      "Botoneras Sunnata & Palladiom",
      "Persianas Motorizadas",
      "Lumaris Tunable White",
    ],
    authorized_partner_tier: "Distribuidor e Integrador Especialista Certificado",
    seo_title: "Lutron México | RadioRA 3, HomeWorks y Persianas | Distribuidor ALFA",
    seo_description:
      "Diseño, especificación y suministro oficial de sistemas Lutron RadioRA 3 y HomeWorks en México. Dimmers Sunnata, procesadores PoE y persianas con garantía ALFA.",
    seo_keywords: [
      "Lutron Mexico",
      "Lutron RadioRA 3",
      "Lutron distribuidor",
      "Lutron Sunnata",
      "Lutron Guadalajara",
      "Lutron Zapopan",
    ],
    is_active: true,
    sort_order: 1,
  },
  {
    id: 2,
    name: "Sonos",
    slug: "sonos",
    tagline: "Audio Multiroom de Alta Fidelidad para Residencias",
    description:
      "El sistema de sonido inalámbrico multiroom por excelencia. Diseñado para llenar cada espacio de tu hogar con audio brillante y control intuitivo.",
    logo_url: "/logos/brands/sonos.png",
    hero_image_url: "/projects/residencia-premium.jpeg",
    website_url: "https://www.sonos.com",
    origin_country: "Estados Unidos",
    focus_areas: ["Audio Multiroom", "Home Theater", "Sonos Amp", "Arquitectura Acústica"],
    authorized_partner_tier: "Integrador Certificado",
    seo_title: "Sonos México | Audio Multiroom y Sistemas Residenciales | ALFA",
    seo_description: "Integración profesional de sistemas de audio Sonos en México.",
    seo_keywords: ["Sonos Mexico", "Sonos Amp", "Sonos Arc", "Audio multiroom"],
    is_active: true,
    sort_order: 2,
  },
  {
    id: 3,
    name: "Shelly",
    slug: "shelly",
    tagline: "Automatización Modular y Monitoreo Energético Europeo",
    description:
      "Soluciones profesionales de automatización modular, medición energética y control inteligente con estándares de ingeniería europeos.",
    logo_url: "/logos/brands/shelly.png",
    hero_image_url: "/projects/residencia-premium.jpeg",
    website_url: "https://www.shelly.com",
    origin_country: "Unión Europea",
    focus_areas: ["Automatización Modular", "Monitoreo Eléctrico", "Relays WiFi/Zigbee"],
    authorized_partner_tier: "Distribuidor Internacional Oficial",
    seo_title: "Shelly México | Distribución Oficial y Automatización | ALFA",
    seo_description: "Distribución oficial de módulos y relevadores Shelly en México con respaldo ALFA.",
    seo_keywords: ["Shelly Mexico", "Shelly distribuidor", "Automatizacion Shelly"],
    is_active: true,
    sort_order: 3,
  },
];

export const STATIC_CATALOG_PRODUCTS: CatalogProduct[] = ${JSON.stringify(mapped, null, 2)};
`;

const outputPath = path.join(__dirname, '..', 'lib', 'catalogData.ts');
fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log('Successfully regenerated catalogData.ts with aesthetic photography for ' + mapped.length + ' products');
