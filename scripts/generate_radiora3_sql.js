const fs = require('fs');
const path = require('path');

const csvData = `Modelo,Marca,Título,Precio Lista,Precio Especial,Su Precio,Código Fiscal,Descripción,Imagen Principal
LUBP1,LUTRON RADIORA 3,"Adaptador de barril a terminal para controlador Lumaris tunable white, juego de 3, sistema Lutron Tape Light",54.00,47.51,29.55,39112403,"Juego de 3 adaptadores de barril a terminal, accesorio de alimentación del sistema Lutron Tape Light para tira LED. Permite conectar fuente de poder directamente a terminales Lumaris sin cortar cables ni soldar.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238189/portada_0S2000.PNG
LUCK1TW,LUTRON RADIORA 3,"Conector wire-to-tape de 3 pines para tira LED, paquete de 10, sistema Lutron Tape Light",33.75,29.39,18.28,39112403,"Conectores wire-to-tape de 3 pines para unión sin soldadura de cable con segmentos de tira LED tunable white Lutron en RadioRA 3 y HomeWorks QSX.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238188/portada_0S2000.PNG
LUMK1,LUTRON RADIORA 3,"Clip de montaje superficial para tira LED tunable white, 10 mm, paquete de 20, sistema Lutron Tape Light",54.00,47.51,29.55,39112403,"Paquete de 20 clips de montaje superficial de 10 mm para fijar tira LED tunable white Lutron directamente sobre superficies.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238190/portada_0S2000.PNG
LUPH3A,LUTRON RADIORA 3,"Interfaz de alimentación cableada para tira LED Lumaris, hasta 3 controladores inalámbricos, sistema RadioRA 3",393.75,342.97,213.35,39112403,"Interfaz de alimentación cableada de 120-277 V a 24 V, energiza hasta 3 controladores inalámbricos Lumaris y hasta 15 m de tira LED.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238187/portada_0S1000.PNG
LUT05DL,LUTRON RADIORA 3,"Cinta LED Lumaris de luz de día ajustable (2500K-5000K), carrete de 5 m, 24 V, compatible con RadioRA 3 y HomeWorks QSX",337.50,303.58,188.85,39112403,"Cinta de luz blanca ajustable Lumaris de 2 canales (2500K a 5000K), carrete de 5 m, 24 V CD, 200 lm/pie, CRI 90+.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238088/portada_0S1000.PNG
LUT05SW,LUTRON RADIORA 3,"Cinta LED Lumaris de blanco cálido ajustable (1800K-3000K), carrete de 5 m, 24 V, compatible con RadioRA 3 y HomeWorks QSX",337.50,296.91,184.70,39112403,"Cinta LED Lumaris blanco cálido ajustable de 1800K a 3000K, carrete de 5 m, 24 V CD, 200 lm/pie, CRI 90+.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238086/portada_0S1000.PNG
LUT30DL,LUTRON RADIORA 3,"Cinta LED Lumaris de luz de día ajustable (2500K-5000K), carrete de 30 m, 24 V, compatible con RadioRA 3 y HomeWorks QSX",1800.00,1720.00,1069.97,39112403,"Cinta LED Lumaris luz de día ajustable (2500K-5000K), carrete de 30 m para recorridos largos, 24 V CD, CRI 90+.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238089/portada_0S1000.PNG
LUT30SW,LUTRON RADIORA 3,"Cinta LED Lumaris de blanco cálido ajustable (1800K-3000K), carrete de 30 m, 24 V, compatible con RadioRA 3 y HomeWorks QSX",1800.00,1567.84,975.32,39112403,"Cinta LED Lumaris blanco cálido ajustable de 1800K a 3000K, carrete de 30 m para recorridos largos, 24 V CD, CRI 90+.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238087/portada_0S1000.PNG
LUWK1TW,LUTRON RADIORA 3,"Cable de 3 conductores 22 AWG de 50 ft para tira LED tunable white, sistema Lutron Tape Light",112.50,97.99,60.95,39112403,"Cable de 3 conductores 22 AWG (15.2 m) para cableado entre controlador inalámbrico y tira LED tunable white Lutron Tape Light.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238191/portada_0S1000.PNG
RRLCD4WHTW,LUTRON RADIORA 3,"Downlight empotrable sin carcasa Lumaris Tunable White 4 pulg (1800K-4000K), 8.5W, 800 lm, Clear Connect Type X",250.00,225.00,139.96,39112403,"Downlight empotrable canless de 4 pulgadas con luz blanca ajustable (1800K a 4000K), 8.5 W, 800 lúmenes, atenuación continua hasta 0.1%, RF Type X.",http://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/LUTRONRADIORA3/RRLCD4WHTW/portada_0S2000.PNG
RRLCD6WHTW,LUTRON RADIORA 3,"Downlight empotrable sin carcasa Lumaris Tunable White 6 pulg (1800K-4000K), 8.5W, 800 lm, Clear Connect Type X",250.00,225.00,139.96,39112403,"Downlight empotrable canless de 6 pulgadas con luz blanca ajustable (1800K a 4000K), 8.5 W, 800 lúmenes, atenuación sin parpadeo hasta 0.1%, RF Type X.",http://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/LUTRONRADIORA3/RRLCD6WHTW/portada_0S2000.PNG
RRLTLKDL,LUTRON RADIORA 3,"Kit de tira LED Lumaris de blanco ajustable 2500K-5000K con controlador inalámbrico, para RadioRA 3",787.50,682.50,424.56,39112403,"Kit completo nativo de RadioRA 3: tira LED de 5 m blanco ajustable (2500K-5000K), controlador inalámbrico con drivers integrados, fuente de poder y conectores.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238083/portada_0S2000.PNG
RRLTLKSW,LUTRON RADIORA 3,"Kit de tira LED Lumaris regulable 1800K-3000K con controlador inalámbrico, para RadioRA 3",787.50,672.22,418.17,39112403,"Kit completo nativo RadioRA 3: tira LED de 5 m blanco cálido (1800K-3000K), controlador inalámbrico con drivers integrados, fuente de poder y accesorios.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238082/portada_0S2000.PNG
RRLTWCLWH,LUTRON RADIORA 3,"Controlador inalámbrico Lumaris de blanco ajustable para tiras LED regulables, para RadioRA 3",450.00,388.00,241.36,39112403,"Controlador inalámbrico Lumaris de 2 canales para tiras LED ajustables en RadioRA 3, tecnología Clear Connect Type X, carga máxima 32 W, atenuación a 0.1%.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238085/portada_0S2000.PNG
RRLTWCWH,LUTRON RADIORA 3,"Controlador inalámbrico Lumaris con fuente de poder incluida, para tiras LED regulables de RadioRA 3",562.50,512.60,318.87,39112403,"Controlador inalámbrico Lumaris con fuente de alimentación directa incluida (100-240 V CA a 24 V), soporte hasta 32 W de carga, Clear Connect Type X.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/238084/portada_0S1000.PNG
RRPROC3CW,LUTRON RADIORA 3,"Procesador (hub) RadioRA 3 con adaptador de empotrar y de caja de conexiones, alimentado por PoE",592.88,527.00,327.83,39112403,"Procesador central hub RadioRA 3 con adaptadores de montaje empotrado y caja de conexión, alimentación PoE, gestión de hasta 100 dispositivos Type X y 95 Type A.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/224862/portada_0S1000.PNG
RRPROC3KIT,LUTRON RADIORA 3,"Kit de procesador principal para sistema RadioRA 3 con inyector PoE y cables Ethernet",620.71,593.13,368.97,39112403,"Kit procesador central RadioRA 3 completo: procesador, inyector PoE, adaptador de repisa y cables de red. Hasta 100 dispositivos Type X y 95 Type A por procesador.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/204869/portada_0S1000.PNG
RRST8ANSDE,LUTRON RADIORA 3,"Apagador inteligente Sunnata on/off, 8 A iluminación y 5.8 A motor, acabado Deep Sea, para RadioRA 3",246.94,208.53,129.72,39112403,"Apagador inteligente Sunnata on/off de pared con neutro, conmuta 8 A en iluminación o 5.8 A en motor, acabado satinado Deep Sea, RF Clear Connect Type X.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/225531/portada_0S1000.PNG
RRST8ANSMN,LUTRON RADIORA 3,"Apagador electrónico Sunnata on/off, 8 A iluminación y motor 1/4 HP, acabado Midnight, para RadioRA 3",248.17,237.13,147.51,39112403,"Apagador electrónico Sunnata de pared con neutro, 8 A de carga de iluminación o 1/4 HP motor, acabado negro Midnight satinado, RF Clear Connect Type X.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/204854/portada_0S1000.PNG
RRST8ANSPB,LUTRON RADIORA 3,"Apagador de pared táctil con neutro para iluminación 8 A y motores 5.8 A, acabado Pebble, RadioRA 3",241.45,241.45,150.20,39112403,"Apagador inteligente Sunnata táctil de pared con neutro, 8 A iluminación, 5.8 A motor, acabado satinado Pebble, barra LED localizadora, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239069/portada_0S1000.PNG
RRST8ANSSW,LUTRON RADIORA 3,"Interruptor táctil on/off Sunnata con cable neutro, 8 A iluminación y 5.8 A motor, acabado Nieve, RadioRA 3",246.94,222.80,138.59,39112403,"Interruptor Sunnata táctil on/off con barra de luz indicadora, 8 A iluminación, 5.8 A motor, acabado satinado Nieve (Snow), RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/216819/portada_0S1000.PNG
RRST8ANSTP,LUTRON RADIORA 3,"Apagador inteligente Sunnata on/off, 8 A iluminación y 5.8 A motor, acabado Taupe, para RadioRA 3",246.94,246.94,153.61,39112403,"Apagador inteligente Sunnata on/off de pared con neutro, 8 A iluminación o 1/4 HP motor, acabado satinado Taupe, barra LED con MyLevel, RadioRA 3.",http://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/LUTRONRADIORA3/RRST8ANSTP/portada_0S2000.PNG
RRST8ANSWH,LUTRON RADIORA 3,"Apagador electrónico Sunnata on/off, 8 A iluminación y motor 1/4 HP, acabado Blanco brillante, para RadioRA 3",250.65,239.51,148.99,39112403,"Apagador electrónico Sunnata on/off de pared con neutro, 8 A iluminación, 1/4 HP motor, acabado blanco brillante, RF Clear Connect Type X.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/204853/portada_0S1000.PNG
RRSTANFPB,LUTRON RADIORA 3,"Control de ventilador de pared táctil de 4 velocidades para ventilador de techo AC, acabado Pebble, RadioRA 3",315.48,315.48,196.25,39112403,"Control de ventilador Sunnata táctil de 4 velocidades silenciosas para motores de CA de hasta 1.5 A, barra de luz interactiva, acabado Pebble, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239054/portada_0S1000.PNG
RRSTANFWH,LUTRON RADIORA 3,"Control de ventilador de techo táctil de 4 velocidades para ventilador tipo paleta AC, acabado Blanco, RadioRA 3",283.79,260.39,161.98,39112403,"Control de ventilador de techo Sunnata de 4 velocidades silenciosas para motor de CA de hasta 1.5 A, barra de luz localizadora, acabado Blanco, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/235998/portada_0S2000.PNG
RRSTHN2BBL,LUTRON RADIORA 3,"Botonera Sunnata híbrida negro, 2 botones con dimmer integrado, requiere neutro, para RadioRA 3",515.35,515.35,320.58,39112403,"Botonera híbrida Sunnata de 2 botones con atenuador integrado (150 W LED / 450 W Inc), carátulas intercambiables, acabado Negro, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/241105/portada_0S2000.PNG
RRSTHN2BWH,LUTRON RADIORA 3,"Botonera híbrida Sunnata RF de 2 botones con dimmer integrado, acabado Blanco, para RadioRA 3",515.35,476.00,296.11,39112403,"Botonera híbrida Sunnata de 2 botones con dimmer integrado para control de carga directa y escenas en RadioRA 3, acabado Blanco brillante.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239051/portada_0S2000.PNG
RRSTHN3RLBL,LUTRON RADIORA 3,"Botonera Sunnata híbrida negro 3 escenas y 2 botones subir/bajar, dimmer integrado, para RadioRA 3",527.30,527.30,328.02,39112403,"Botonera híbrida Sunnata de 3 botones de escena más control subir/bajar con atenuador de carga integrado, acabado Negro, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/254036/portada_0S1000.PNG
RRSTHN3RLLA,LUTRON RADIORA 3,"Botonera híbrida Sunnata de 3 botones con subir/bajar y atenuador integrado, color Almendra claro, RadioRA 3",527.30,527.30,328.02,39112403,"Botonera híbrida Sunnata de 3 botones de escena más subir/bajar con dimmer integrado para carga de 120 V, acabado Almendra claro, RadioRA 3.",http://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/LUTRONRADIORA3/RRSTHN3RLLA/portada_0S2000.PNG
RRSTHN3RLMN,LUTRON RADIORA 3,"Botonera híbrida Sunnata con 3 botones de escena y barra subir/bajar, acabado Midnight, RadioRA 3",527.07,473.18,294.35,39112403,"Botonera híbrida Sunnata de pared con 3 botones de escena y barra subir/bajar con atenuador de carga integrado, acabado Midnight, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/225524/portada_0S1000.PNG
RRSTHN3RLSW,LUTRON RADIORA 3,"Botonera híbrida Sunnata de 3 botones con subir/bajar y dimmer integrado, acabado Nieve, para RadioRA 3",527.07,449.76,279.78,39112403,"Botonera híbrida Sunnata de 3 escenas + subir/bajar con atenuador integrado para no requerir chalupa adicional, acabado Nieve (Snow), RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/225528/portada_0S2000.PNG
RRSTHN3RLWH,LUTRON RADIORA 3,"Botonera híbrida Sunnata con 3 botones de escena y barra subir/bajar, acabado Blanco brillante, RadioRA 3",527.07,469.62,292.14,39112403,"Botonera híbrida Sunnata de 3 botones de escena + subir/bajar con atenuador integrado de 120 V, acabado Blanco brillante, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/225522/portada_0S2000.PNG
RRSTHN4BBL,LUTRON RADIORA 3,"Botonera híbrida Sunnata con dimmer integrado, 4 botones de escena, acabado Negro brillante, RadioRA 3",527.30,527.30,328.02,39112403,"Botonera híbrida Sunnata de 4 botones con dimmer de carga integrado para remodelaciones, grabado retroiluminado, acabado Negro brillante.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/256609/portada_0S2000.PNG
RRSTHN4BMN,LUTRON RADIORA 3,"Botonera híbrida Sunnata con 4 botones de escena y dimmer integrado, acabado Midnight, para RadioRA 3",527.06,473.38,294.48,39112403,"Botonera híbrida Sunnata de 4 botones de escena con dimmer integrado, botones retroiluminados personalizables, acabado Midnight, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/225526/portada_0S1000.PNG
RRSTHN4BPB,LUTRON RADIORA 3,"Teclado híbrido Sunnata RF de 4 botones con atenuador integrado, acabado Pebble, para RadioRA 3",515.35,515.35,320.58,39112403,"Teclado híbrido Sunnata RF de 4 botones con atenuador integrado, barras LED retroiluminadas, acabado satinado Pebble, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239636/portada_0S2000.PNG
RRSTHN4BSW,LUTRON RADIORA 3,"Botonera híbrida Sunnata de 4 botones con dimmer integrado, acabado Nieve satinado, para RadioRA 3",535.94,482.61,300.22,39112403,"Botonera híbrida Sunnata de 4 botones con dimmer integrado para activación de escenas y ajuste fino, acabado Nieve (Snow), RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/225529/portada_0S2000.PNG
RRSTHN4BTF,LUTRON RADIORA 3,"Botonera híbrida de 4 botones con atenuador integrado para RadioRA 3, acabado satinado color Truffle",527.06,527.06,327.87,39112403,"Botonera híbrida Sunnata de 4 botones de escena con atenuador cableado integrado, acabado satinado color Truffle, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/244716/portada_0S2000.PNG
RRSTHN4BWH,LUTRON RADIORA 3,"Botonera híbrida Sunnata con 4 botones de escena y dimmer integrado, acabado Blanco brillante, RadioRA 3",527.06,475.55,295.83,39112403,"Botonera híbrida Sunnata de 4 botones con dimmer integrado para activar escenas y controlar iluminación en RadioRA 3, acabado Blanco brillante.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/225523/portada_0S2000.PNG
RRSTPRONDE,LUTRON RADIORA 3,"Atenuador táctil Sunnata PRO con neutro para RadioRA 3, 250 W LED / 500 W Inc, color Deep Sea",246.94,210.72,131.08,39112403,"Atenuador táctil Sunnata PRO LED+ con neutro, barra de luz interactiva con MyLevel, 250 W LED o 500 W Inc/Hal/ELV, acabado Deep Sea, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/224664/portada_0S1000.PNG
RRSTPRONMN,LUTRON RADIORA 3,"Atenuador de pared táctil Sunnata Pro LED+ con barra de luz, 250 W LED, acabado negro Midnight, RadioRA 3",250.65,239.51,148.99,39112403,"Atenuador táctil Sunnata Pro LED+ de pared con neutro, barra deslizante de luz, 250 W LED / 500 W Inc, acabado negro Midnight, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/204852/portada_0S1000.PNG
RRSTPRONPB,LUTRON RADIORA 3,"Atenuador de pared táctil Sunnata Pro con neutro para LED hasta 250 W, acabado Pebble, RadioRA 3",241.45,221.70,137.91,39112403,"Atenuador táctil Sunnata Pro con neutro, tecnología RTISS de compensación de voltaje, 250 W LED / 500 W Inc, acabado Pebble, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239055/portada_0S1000.PNG
RRSTPRONSW,LUTRON RADIORA 3,"Atenuador táctil Sunnata Pro LED+ con barra de luz, cable neutro, acabado Nieve satinado, RadioRA 3",246.94,228.40,142.08,39112403,"Atenuador táctil Sunnata Pro LED+ de pared con neutro, atenuación suave y silenciosa, 250 W LED / 500 W Inc, acabado Nieve (Snow), RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/216818/portada_0S1000.PNG
RRSTPRONTF,LUTRON RADIORA 3,"Atenuador de pared táctil Sunnata Pro con neutro para RadioRA 3, 250 W LED / 500 W Inc, color Trufa",246.99,246.99,153.64,39112403,"Atenuador táctil Sunnata Pro con neutro, control táctil con barra interactiva, 250 W LED / 500 W Inc/Hal/ELV, acabado satinado Trufa, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/231399/portada_0S1000.PNG
RRSTPRONWH,LUTRON RADIORA 3,"Atenuador de pared táctil Sunnata Pro LED+ con barra de luz, 250 W LED / 500 W Inc, color Blanco brillante, RadioRA 3",250.65,239.51,148.99,39112403,"Atenuador táctil Sunnata Pro LED+ de pared con neutro, barra deslizante interactiva, 250 W LED / 500 W Inc/Hal/ELV, acabado Blanco brillante, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/204851/portada_0S1000.PNG
RRSTRDBL,LUTRON RADIORA 3,"Atenuador auxiliar Sunnata companion con panel táctil RF, 120 V, para 3 vías o escalera, acabado Negro, RadioRA 3",119.90,119.90,74.58,39112403,"Atenuador auxiliar compañero para control de atenuación multilocación (3 vías o escalera) emparejado con dimmer principal Sunnata, acabado Negro.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/236410/portada_0S1000.PNG
RRSTRDMN,LUTRON RADIORA 3,"Atenuador auxiliar Sunnata companion para 3 vías o escalera, 120 V, acabado Midnight, RadioRA 3",128.77,116.17,72.26,39112403,"Atenuador auxiliar compañero cableado para control multipunto de dimmer principal Sunnata LED+, acabado negro mate Midnight, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE-V2/215713/portada_0S1000.PNG
RRSTRDPB,LUTRON RADIORA 3,"Atenuador auxiliar companion de pared para control multilocación 3 vías, acabado Pebble, RadioRA 3",125.91,125.91,78.32,39112403,"Atenuador auxiliar companion para dimmer principal Sunnata en pasillos y escaleras, no requiere neutro local, acabado Pebble, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239071/portada_0S1000.PNG
RRSTRDWH,LUTRON RADIORA 3,"Atenuador auxiliar companion de pared para control multilocación (3 vías o más), acabado Blanco, RadioRA 3",128.77,120.01,74.65,39112403,"Atenuador auxiliar companion para dimmer principal Sunnata, control de hasta 5 puntos en escaleras y pasillos, acabado Blanco brillante, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/215708/portada_0S1000.PNG
RRSTRSMN,LUTRON RADIORA 3,"Apagador auxiliar Sunnata companion para control de 3 vías o escalera, acabado Midnight, RadioRA 3",128.77,108.74,67.64,39112403,"Apagador auxiliar compañero cableado para switch principal Sunnata RF (RRST-8ANS), hasta 4 auxiliares por circuito, acabado Midnight, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/215716/portada_0S1000.PNG
RRSTRSPB,LUTRON RADIORA 3,"Apagador auxiliar companion de pared para control multilocación 3 vías, acabado Pebble, RadioRA 3",125.91,125.91,78.32,39112403,"Apagador auxiliar companion para switch principal Sunnata, retardo de apagado 30 s, no requiere neutro local, acabado Pebble, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239072/portada_0S1000.PNG
RRSTRSSW,LUTRON RADIORA 3,"Apagador auxiliar Sunnata companion para control de 3 vías o escalera, acabado Nieve satinado, RadioRA 3",128.77,111.05,69.08,39112403,"Apagador auxiliar compañero cableado para switch principal Sunnata RF, control desde múltiples puntos, acabado blanco mate Nieve (Snow), RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/215717/portada_0S1000.PNG
RRSTRSTP,LUTRON RADIORA 3,"Apagador auxiliar companion para control multi-ubicación, línea Sunnata, acabado Satin Taupe, RadioRA 3",128.77,117.33,72.98,39112403,"Apagador auxiliar companion para switch principal Sunnata, sincronización de luz indicadora, sin requerir neutro, acabado Satin Taupe, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/233919/portada_0S1000.PNG
RRSTRSWH,LUTRON RADIORA 3,"Apagador auxiliar Sunnata companion para control de 3 vías o escalera, acabado Blanco brillante, RadioRA 3",130.71,124.90,77.69,39112403,"Apagador auxiliar compañero cableado para switch principal Sunnata RF, hasta 4 auxiliares por circuito, acabado blanco brillante, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE-V2/215715/portada_0S1000.PNG
RRSTW2BMN,LUTRON RADIORA 3,"Teclado de pared Sunnata de 2 botones para escenas con barra luminosa, acabado Midnight, RadioRA 3",400.50,343.38,213.60,39112403,"Teclado de pared Sunnata RF de 2 botones para activación de escenas completas de iluminación y persianas, barra luminosa, acabado Midnight, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/205159/portada_0S1000.PNG
RRSTW2BPB,LUTRON RADIORA 3,"Botonera de pared Sunnata con 2 botones de escena, RF 2.4 GHz, color Pebble, para sistema RadioRA 3",391.60,391.60,243.60,39112403,"Botonera de pared Sunnata de 2 botones programables para escenas, RF Clear Connect Type X a 2.4 GHz, barras LED indicadoras, acabado Pebble, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239053/portada_0S2000.PNG
RRSTW2BSW,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 2 botones con barra luminosa localizadora, acabado Nieve satinado, RadioRA 3",400.50,338.20,210.38,39112403,"Teclado Sunnata RF de 2 botones para pares de escenas (Bienvenido/Lejos), control de grupos de iluminación y audio, acabado Nieve (Snow), RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/212748/portada_0S2000.PNG
RRSTW2BWH,LUTRON RADIORA 3,"Teclado de pared Sunnata de 2 botones para escenas de luces y persianas, acabado Blanco brillante, RadioRA 3",405.00,377.65,234.92,39112403,"Teclado de pared Sunnata RF de 2 botones de escena con barra luminosa localizadora, comunicación Clear Connect Type X, acabado Blanco brillante, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/sin_fondo3/LUTRONRADIORA3/RRSTW2BWH/portada_0S400.PNG
RRSTW3RLLA,LUTRON RADIORA 3,"Botonera Sunnata de 3 botones con subir/bajar para escenas de iluminación, color Almendra claro, RadioRA 3",400.68,400.68,249.25,39112403,"Botonera Sunnata de pared con 3 botones de escena programables más control subir/bajar para ajuste fino, 120-277 V, acabado Almendra claro, RadioRA 3.",http://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/LUTRONRADIORA3/RRSTW3RLLA/portada_0S2000.PNG
RRSTW3RLMN,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 3 botones con subir y bajar, comunicación Clear Connect, acabado Midnight, RadioRA 3",400.50,358.85,223.23,39112403,"Teclado de pared Sunnata de 3 botones de escena más subir/bajar, barras LED indicadoras por botón, 120-277 V, acabado satinado Midnight, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/204858/portada_0S1000.PNG
RRSTW3RLPB,LUTRON RADIORA 3,"Botonera de pared Sunnata con 3 botones de escena y subir/bajar, RF 2.4 GHz, acabado Pebble, RadioRA 3",391.60,391.60,243.60,39112403,"Botonera Sunnata de 3 botones de escena más subir/bajar, comunicación RF Clear Connect Type X, barras LED de estado, acabado Pebble, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239052/portada_0S1000.PNG
RRSTW3RLSW,LUTRON RADIORA 3,"Teclado inalámbrico Sunnata RF de 3 botones con subir/bajar para escenas de iluminación, acabado Nieve, RadioRA 3",402.50,366.72,228.12,39112403,"Teclado inalámbrico Sunnata RF de 3 botones para escenas más subir/bajar para ajuste de intensidad, acabado Nieve (Snow), RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/212749/portada_0S2000.PNG
RRSTW3RLWH,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 3 botones con subir y bajar, comunicación Clear Connect, acabado Blanco brillante, RadioRA 3",401.00,357.07,222.12,39112403,"Teclado de pared Sunnata de 3 botones de escena más subir/bajar, barras LED indicadoras, comunicación Clear Connect Type X, acabado Blanco brillante, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/sin_fondo3/LUTRONRADIORA3/RRSTW3RLWH/portada_0S400.PNG
RRSTW4BMN,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 4 botones, comunicación Clear Connect, acabado Midnight, para sistema RadioRA 3",402.50,384.61,239.25,39112403,"Teclado de pared Sunnata de 4 botones de escena independientes, barras LED indicadoras, 120-277 V, acabado satinado Midnight, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/205157/portada_0S1000.PNG
RRSTW4BPB,LUTRON RADIORA 3,"Botonera Sunnata de pared con 4 botones para escenas, comunicación RF Clear Connect 2.4 GHz, acabado Pebble, RadioRA 3",391.60,391.60,243.60,39112403,"Botonera Sunnata inalámbrica de 4 botones para activación de escenas predefinidas, RF Clear Connect Type X a 2.4 GHz, acabado Pebble, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239070/portada_0S2000.PNG
RRSTW4BSW,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 4 botones con barra luminosa localizadora, acabado Nieve satinado, RadioRA 3",402.50,384.61,239.25,39112403,"Teclado Sunnata de 4 botones para escenas independientes (Despertar/Cocinar/Cenar/Apagar), barra luminosa localizadora, acabado Nieve, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/212747/portada_0S2000.PNG
RRSTW4BWH,LUTRON RADIORA 3,"Teclado de escenas Sunnata de 4 botones, comunicación Clear Connect, acabado Blanco brillante, RadioRA 3",402.50,384.61,239.25,39112403,"Teclado de pared Sunnata de 4 botones de escena independientes, barras LED indicadoras, comunicación Clear Connect Type X, acabado Blanco brillante, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/205156/portada_0S1000.PNG
ST6ANSPB,LUTRON RADIORA 3,"Interruptor de pared Sunnata on/off sin regulación, 6 A iluminación / 3 A motor, acabado Pebble, RadioRA 3",164.89,164.89,102.57,39112403,"Interruptor de pared Sunnata de encendido/apagado, conmuta 6 A iluminación o 3 A motor/ventilador, luz indicadora MyLevel, acabado Pebble, RadioRA 3.",https://ftp3.syscom.mx/usuarios/fotos/BancoFotografiasSyscom/AI/UPSCALE/239605/portada_0S1000.PNG`;

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
      imageUrl: fields[8] ? fields[8].trim() : '',
    });
  }
  return results;
}

const products = parseCSV(csvData);

let sql = `-- Migration: 20260827_seed_radiora3_catalog.sql
-- Seed ${products.length} Flagship Lutron RadioRA 3 Products for ALFA Catalog & SEO

DO $$
DECLARE
    lutron_brand_id BIGINT;
    cat_id BIGINT;
BEGIN
    SELECT id INTO lutron_brand_id FROM public.brands WHERE slug = 'lutron' LIMIT 1;
    SELECT id INTO cat_id FROM public.product_categories WHERE name ILIKE '%iluminac%' OR name ILIKE '%control%' LIMIT 1;

`;

products.forEach((p) => {
  const sku = p.model;
  const model = p.model;
  const name = p.title;
  const titlePart = slugify(name.split(',')[0].slice(0, 30));
  const slug = ('lutron-radiora3-' + slugify(p.model) + '-' + titlePart).replace(/-+/g, '-');
  const shortDesc = p.description.slice(0, 300).replace(/'/g, "''");
  const cost = p.costPrice || p.specialPrice || 100;
  const salePrice = (cost / 0.7).toFixed(2);
  const imageUrl = p.imageUrl || '';
  const satCode = p.satCode || '39112403';
  const seoTitle = (name.slice(0, 55) + ' (' + model + ') | Cotización México | ALFA').replace(/'/g, "''");
  const seoDesc = ('Cotiza el modelo ' + model + ' de Lutron RadioRA 3 en México (' + name.slice(0, 80) + '). Suministro oficial, asesoría técnica e instalación con ALFA.').replace(/'/g, "''");

  sql += `
    INSERT INTO public.products (
        sku,
        brand,
        brand_id,
        model,
        name,
        slug,
        category,
        category_id,
        short_description,
        description,
        image_url,
        cost_price,
        cost_currency,
        pricing_method,
        target_margin,
        calculated_sale_price,
        sale_currency,
        labor_unit_cost,
        labor_sale_multiplier,
        labor_unit_sale_price,
        sat_product_key,
        sat_unit_key,
        sat_product_service_code,
        sat_unit_code,
        sat_unit_name,
        fiscal_object,
        tax_rate,
        is_favorite,
        is_public,
        is_active,
        seo_title,
        seo_description,
        seo_keywords
    )
    VALUES (
        '${sku}',
        'Lutron',
        lutron_brand_id,
        '${model}',
        '${name.replace(/'/g, "''")}',
        '${slug}',
        'Control e Iluminación',
        cat_id,
        '${shortDesc}',
        '${shortDesc}',
        '${imageUrl}',
        ${cost},
        'USD',
        'target_margin',
        30.0,
        ${salePrice},
        'USD',
        300.00,
        2.0,
        600.00,
        '${satCode}',
        'H87',
        '${satCode}',
        'H87',
        'Pieza',
        '02',
        16.0,
        false,
        true,
        true,
        '${seoTitle}',
        '${seoDesc}',
        ARRAY['Lutron RadioRA 3', '${model}', 'Lutron ${model}', 'RadioRA 3 Mexico', 'Lutron cotizacion']
    )
    ON CONFLICT (sku) DO UPDATE SET
        brand_id = EXCLUDED.brand_id,
        model = EXCLUDED.model,
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        image_url = CASE WHEN EXCLUDED.image_url <> '' THEN EXCLUDED.image_url ELSE public.products.image_url END,
        cost_price = EXCLUDED.cost_price,
        calculated_sale_price = EXCLUDED.calculated_sale_price,
        sat_product_service_code = EXCLUDED.sat_product_service_code,
        is_public = EXCLUDED.is_public,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW();
`;
});

sql += `
END $$;
`;

const outputPath = path.join(__dirname, '..', 'sql', '20260827_seed_radiora3_catalog.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log('Successfully generated ' + products.length + ' products in ' + outputPath);
