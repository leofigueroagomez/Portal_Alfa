/**
 * CONTRATO MARCO DE PRESTACIÓN DE SERVICIOS Y/O EJECUCIÓN DE OBRA POR SUBCONTRATISTA
 * Confidencialidad • Personal • Seguridad Social • Responsabilidad Civil • Garantía • Datos Personales
 *
 * Basado en la plantilla legal oficial adaptada para ALFA IT Soluciones S.A. de C.V.
 */

export interface ContractorAgreementClause {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  content: string;
  keyPoints: string[];
}

export const CONTRACTOR_AGREEMENT_VERSION = "v1.0-2026-OFICIAL";

export const CONTRACTOR_AGREEMENT_METADATA = {
  title: "CONTRATO MARCO DE PRESTACIÓN DE SERVICIOS Y/O EJECUCIÓN DE OBRA POR SUBCONTRATISTA",
  shortTitle: "Contrato Marco de Subcontratista (NDA, Laboral, REPSE, Datos y Garantía)",
  version: CONTRACTOR_AGREEMENT_VERSION,
  companyName: "INTEGRADORA DE TECNOLOGÍA ALFA (ALFA IT)",
  governingLaw: "Leyes Federales de los Estados Unidos Mexicanos y Tribunales competentes de Guadalajara / Zapopan, Jalisco",
};

export const CONTRACTOR_AGREEMENT_CLAUSES: ContractorAgreementClause[] = [
  {
    id: "c1",
    number: 1,
    title: "Objeto y naturaleza",
    subtitle: "Alcance por Orden de Trabajo y régimen de proveedor independiente",
    content: `El CONTRATISTA prestará los servicios y/o ejecutará las obras descritas en cada Orden de Trabajo, con resultado, alcance y entregables verificables. Este contrato es marco: no obliga a ALFA a asignar un volumen mínimo ni autoriza trabajos sin Orden de Trabajo aprobada. El CONTRATISTA actuará como proveedor independiente. No será agente, representante, socio, mandatario ni empleado de ALFA o del cliente, y no podrá obligarlos frente a terceros.`,
    keyPoints: [
      "Contrato marco mercantil; cada proyecto se rige por su Orden de Trabajo",
      "Régimen estricto de proveedor independiente",
      "Sin representación ni facultad de obligar a ALFA ante terceros",
    ],
  },
  {
    id: "c2",
    number: 2,
    title: "Orden de Trabajo y prelación",
    subtitle: "Formalidad escrita y prohibición de modificaciones verbales",
    content: `Cada Orden de Trabajo contendrá, como mínimo: cliente/sitio, objeto preciso, especialidad, número aproximado de trabajadores, responsables, entregables, materiales, accesos, calendario, precio, aceptación, garantía, datos personales y seguridad. En caso de contradicción prevalecerán: (i) la Orden de Cambio más reciente; (ii) la Orden de Trabajo; (iii) este contrato; y (iv) la cotización, sólo en lo expresamente incorporado. Ninguna instrucción verbal, mensaje operativo o presencia en sitio amplía el alcance. Todo cambio de precio, plazo, personal aproximado, materiales, riesgos o tratamiento de datos requiere Orden de Cambio aceptada por escrito.`,
    keyPoints: [
      "Prevalencia jerárquica: Orden de Cambio > Orden de Trabajo > Contrato Marco",
      "Prohibición expresa de modificaciones verbales o por mensajes informales",
    ],
  },
  {
    id: "c3",
    number: 3,
    title: "Servicios especializados y REPSE",
    subtitle: "Cumplimiento del régimen de subcontratación especializada (Arts. 12-15 LFT)",
    content: `Cuando el servicio implique poner trabajadores propios del CONTRATISTA a disposición o en beneficio de ALFA o del cliente y califique como servicio u obra especializada, el CONTRATISTA deberá mantener REPSE vigente para la actividad exacta y cumplir los artículos 12 a 15 de la Ley Federal del Trabajo y demás normas aplicables. El CONTRATISTA garantiza que la descripción contractual, su registro REPSE, la actividad efectivamente ejecutada, sus CFDI y sus reportes a autoridades son congruentes. No suministrará personal, no simulará especialización ni ejecutará actividades prohibidas. La cancelación, suspensión, vencimiento o riesgo de pérdida del REPSE deberá notificarse a ALFA dentro de las veinticuatro horas siguientes. ALFA podrá suspender accesos y trabajos de inmediato.`,
    keyPoints: [
      "Obligación de mantener REPSE vigente cuando aplique puesta a disposición de personal",
      "Congruencia absoluta entre CFDI, actividad real, REPSE y reportes ICSOE/SISUB",
      "Notificación obligatoria dentro de 24 horas ante cualquier cambio en el REPSE",
    ],
  },
  {
    id: "c4",
    number: 4,
    title: "Autonomía, organización y mando",
    subtitle: "Dirección y disciplina a cargo exclusivo del contratista",
    content: `El CONTRATISTA seleccionará, contratará, pagará, capacitará, dirigirá, supervisará, disciplinará y, en su caso, separará a su personal. Designará a un responsable operativo con facultades de mando. ALFA podrá coordinar entregables, secuencias, horarios de acceso, protección del sitio, estándares de calidad y seguridad, y podrá rechazar personal por causa objetiva de seguridad, competencia, conducta o incumplimiento. Esa coordinación no transfiere facultades patronales ni elimina obligaciones legales que resulten por los hechos.`,
    keyPoints: [
      "El contratista ejerce el mando técnico y disciplinario exclusivo sobre su personal",
      "ALFA coordina resultados y seguridad en sitio sin asumir calidad patronal",
    ],
  },
  {
    id: "c5",
    number: 5,
    title: "Personal y obligaciones laborales",
    subtitle: "Responsabilidad patronal única e indemnidad laboral",
    content: `El CONTRATISTA es el único patrón de su personal y asume íntegramente salarios, horas extra, descansos, vacaciones, prima vacacional, aguinaldo, PTU, capacitación, indemnizaciones, finiquitos, retenciones, impuestos sobre nómina y demás prestaciones u obligaciones individuales o colectivas. El CONTRATISTA no asignará menores, personas sin permiso migratorio/laboral, personal no capacitado o trabajadores no incluidos en la lista de acceso. Ningún gafete, correo, uniforme, instrucción de acceso o coordinación hará al personal del CONTRATISTA empleado de ALFA o del cliente.`,
    keyPoints: [
      "Contratista asume 100% salarios, PTU, finiquitos e impuestos de nómina",
      "Prohibición de menores o personal sin registro oficial",
      "Instrucción expresa de no ostentarse como empleado de ALFA ni del cliente",
    ],
  },
  {
    id: "c6",
    number: 6,
    title: "Seguridad social, vivienda y documentación",
    subtitle: "Altas IMSS, SUA/SIPARE, INFONAVIT e informes periódicos",
    content: `El CONTRATISTA inscribirá oportunamente a todo su personal ante el IMSS con salario base correcto, cubrirá cuotas obrero-patronales, riesgos de trabajo, aportaciones y amortizaciones INFONAVIT, SAR y obligaciones relacionadas. Antes del acceso y con cada pago entregará: opiniones positivas vigentes SAT, IMSS e INFONAVIT; REPSE vigente; lista del personal asignado con NSS/CURP; altas y movimientos IMSS (SUA/SIPARE y comprobantes de pago); CFDI de nómina timbrados; y acuses ICSOE y SISUB cuando resulten aplicables. ALFA podrá negar acceso o retener pagos proporcionalmente ante falta de documentación.`,
    keyPoints: [
      "Altas oportunas ante IMSS e INFONAVIT con salario real",
      "Entrega obligatoria de SUA, SIPARE, opiniones 32-D y acuses regulatorios",
      "Facultad de ALFA de retener pagos y negar accesos ante omisión documental",
    ],
  },
  {
    id: "c7",
    number: 7,
    title: "Seguridad, salud y medio ambiente",
    subtitle: "Cumplimiento NOMs, EPP, bloqueo/etiquetado y reporte de incidentes",
    content: `El CONTRATISTA identificará peligros, evaluará riesgos y ejecutará bajo la legislación, Normas Oficiales Mexicanas (NOM) de seguridad y salud, manuales del fabricante, permisos de trabajo y reglas del sitio. Proveerá sin costo para ALFA personal competente, supervisión, EPP, equipos certificados, bloqueo/etiquetado, trabajo en alturas, eléctrico, caliente o espacios confinados. Notificará a ALFA de inmediato y por escrito dentro de las primeras 12 horas cualquier incidente, lesión, casi accidente o condición peligrosa. Gestionará y reportará riesgos de trabajo cubriendo traslados, incapacidades y capitales constitutivos.`,
    keyPoints: [
      "Dotación obligatoria de EPP certificado y cumplimiento de NOMs STPS",
      "Notificación inmediata de incidentes o accidentes en sitio",
      "Cobertura total de capitales constitutivos y riesgos de trabajo por el contratista",
    ],
  },
  {
    id: "c8",
    number: 8,
    title: "Responsabilidad civil por la ejecución",
    subtitle: "Resarcimiento integral por daños a inmuebles, acabados y equipos",
    content: `El CONTRATISTA responderá por actos u omisiones propios, de su personal, proveedores y subcontratistas autorizados, incluyendo negligencia, impericia, incumplimiento técnico, trabajos defectuosos, daño a inmuebles, acabados, redes, equipos, información, personas y bienes de ALFA, del cliente o de terceros. A su costo reparará o reemplazará lo dañado con calidad equivalente o superior, restaurará configuraciones y cubrirá daños y perjuicios directos. La recepción o supervisión de ALFA no libera defectos ocultos.`,
    keyPoints: [
      "Responsabilidad por daños a residencias, acabados de lujo, redes y equipos",
      "Obligación de reparar o reponer con calidad igual o superior sin costo",
    ],
  },
  {
    id: "c9",
    number: 9,
    title: "Seguros",
    subtitle: "Pólizas de responsabilidad civil y coberturas",
    content: `El CONTRATISTA mantendrá póliza de seguro de responsabilidad civil con cobertura suficiente para el riesgo de las actividades a ejecutar, entregando carátula y recibo de pago cuando le sea requerido. El seguro no limita la responsabilidad contractual, obligándose a pagar deducibles y responder por montos superiores a la suma asegurada.`,
    keyPoints: [
      "Mantenimiento de coberturas de responsabilidad civil adecuadas al riesgo",
      "Deducibles a cargo íntegro del subcontratista",
    ],
  },
  {
    id: "c10",
    number: 10,
    title: "Acceso, conducta y protección del cliente",
    subtitle: "Discreción absoluta y prohibición de difusión en redes sociales",
    content: `El personal ingresará sólo en horarios, zonas y sistemas autorizados; portará identificación propia; cuidará instalaciones; mantendrá orden y limpieza impecable; y cumplirá reglas de privacidad, fotografía, alcohol, drogas y convivencia del sitio. Se prohíbe terminantemente publicar, fotografiar, grabar, geolocalizar o identificar a ALFA, al cliente, al proyecto o al inmueble en redes sociales, portafolios o comunicaciones comerciales sin autorización escrita específica.`,
    keyPoints: [
      "Prohibición absoluta de publicar fotos o ubicación de clientes en redes sociales",
      "Conducta intachable, orden y limpieza rigurosa en residencias de alto nivel",
    ],
  },
  {
    id: "c11",
    number: 11,
    title: "Subcontratación de segundo nivel",
    subtitle: "Autorización previa por escrito y responsabilidad solidaria",
    content: `El CONTRATISTA no delegará ni subcontratará total o parcialmente los trabajos sin consentimiento previo y por escrito de ALFA. La autorización no lo libera, debiendo verificar REPSE y solvencia del tercero, imponerle obligaciones idénticas y responder solidariamente frente a ALFA por sus actos u omisiones.`,
    keyPoints: [
      "Prohibida la subdelegación no autorizada",
      "Responsabilidad solidaria total por terceros contratados",
    ],
  },
  {
    id: "c12",
    number: 12,
    title: "Confidencialidad y NDA",
    subtitle: "Secreto industrial, credenciales, planos y topologías",
    content: `Se considera Información Confidencial toda información no pública de ALFA o sus clientes: identidad y contactos; propuestas, precios, costos y márgenes; planos, memorias, topologías, direccionamiento, credenciales, llaves, códigos de acceso, programaciones Lutron/Shelly, respaldos, configuraciones, imágenes y software. El CONTRATISTA sólo la usará para ejecutar la Orden de Trabajo; no copiará, extraerá, divulgará ni reutilizará información. La obligación de confidencialidad dura 5 años posteriores a la terminación, y de forma permanente e indefinida respecto a secretos industriales, credenciales y datos personales.`,
    keyPoints: [
      "Protección estricta de planos, contraseñas, topologías y programaciones Lutron/Shelly",
      "Vigencia indefinida para credenciales y secretos industriales",
    ],
  },
  {
    id: "c13",
    number: 13,
    title: "Datos personales: encargo de tratamiento (LFPDPPP)",
    subtitle: "Prohibición de uso para fines propios o entrenamiento de IA",
    content: `El CONTRATISTA actuará como persona encargada de datos personales, siguiendo instrucciones documentadas y el aviso de privacidad de ALFA. No utilizará los datos para fines propios, no los venderá ni los compartirá. Se prohíbe expresamente subir datos o planos de clientes a servicios personales, cuentas no autorizadas o utilizarlos para entrenar modelos de inteligencia artificial externos. Al terminar el encargo, devolverá y destruirá toda copia de datos personales.`,
    keyPoints: [
      "Tratamiento limitado estrictamente a la ejecución del servicio",
      "Prohibido subir información a cuentas personales o modelos de IA externos",
      "Destrucción y borrado seguro de información al concluir",
    ],
  },
  {
    id: "c14",
    number: 14,
    title: "Ciberseguridad, credenciales y acceso remoto",
    subtitle: "Cuentas nominativas, privilegio mínimo y bitácora de cambios",
    content: `Las credenciales asignadas serán nominativas, temporales y de privilegio mínimo. Se prohíbe compartirlas, almacenarlas en texto abierto o mantener accesos posteriores. El CONTRATISTA cerrará todas las sesiones al terminar cada intervención, no instalará herramientas de acceso remoto ni puertas traseras, y entregará bitácora técnica de cualquier cambio de configuración realizado en los equipos.`,
    keyPoints: [
      "Credenciales temporales y de uso exclusivo",
      "Prohibida la instalación de puertas traseras o herramientas no autorizadas",
    ],
  },
  {
    id: "c15",
    number: 15,
    title: "Entregables y propiedad intelectual",
    subtitle: "Cesión de derechos patrimoniales sobre desarrollos e integraciones",
    content: `El CONTRATISTA cede a ALFA la totalidad de los derechos patrimoniales sobre programaciones, configuraciones, diagramas y entregables creados específicamente para los proyectos, para todo territorio y por el plazo máximo legal, conservando ALFA y sus clientes licencia de uso irrestricta.`,
    keyPoints: [
      "ALFA es titular de las configuraciones y memorias técnicas desarrolladas",
    ],
  },
  {
    id: "c16",
    number: 16,
    title: "No elusión de la relación con clientes",
    subtitle: "Protección comercial frente a desvío de oportunidades",
    content: `Durante la vigencia del contrato y por un plazo de 24 meses posteriores a la última Orden de Trabajo, el CONTRATISTA no utilizará Información Confidencial para desplazar a ALFA, presentar cotizaciones directas o desviar clientes o proyectos conocidos a través de ALFA.`,
    keyPoints: [
      "No elusión comercial durante 24 meses posteriores",
      "Prohibición de cotizar directamente a clientes presentados por ALFA",
    ],
  },
  {
    id: "c17",
    number: 17,
    title: "Herramientas, materiales y custodia",
    subtitle: "Depósito y cuidado de equipos y materiales entregados",
    content: `Salvo pacto en contrario, el CONTRATISTA aportará sus propias herramientas y transporte. Respecto a equipos de audio, video, iluminación, cámaras o domótica que ALFA le entregue para su instalación, el CONTRATISTA actuará como fiel depositario y custodio, respondiendo por pérdidas, sustracciones o deterioros imputables.`,
    keyPoints: [
      "Herramientas profesionales propias",
      "Custodia responsable de equipos de alta gama entregados para instalación",
    ],
  },
  {
    id: "c18",
    number: 18,
    title: "Precio, facturación, pago y retención",
    subtitle: "Condiciones de pago contra CFDI y cuenta bancaria verificada",
    content: `ALFA pagará los servicios conforme al precio acordado en cada Orden de Trabajo contra entrega de CFDI válido, aceptación técnica y expediente documental en regla. Los pagos se realizarán exclusivamente a la cuenta bancaria y CLABE interbancaria registrada por el CONTRATISTA en su formulario de alta. ALFA podrá retener montos proporcionales ante trabajos defectuosos o documentación regulatoria faltante.`,
    keyPoints: [
      "Pago contra CFDI y validación técnica del entregable",
      "Depósito exclusivo a la cuenta bancaria y CLABE registrada",
    ],
  },
  {
    id: "c19",
    number: 19,
    title: "Cambios, entrega y aceptación",
    subtitle: "Plazos de revisión, pruebas y corrección de observaciones",
    content: `El CONTRATISTA entregará reportes de servicio, fotografías de evidencia autorizadas y pruebas de funcionamiento. ALFA contará con 5 días hábiles para emitir observaciones. El CONTRATISTA corregirá cualquier desviación o falla sin costo dentro de los 3 días siguientes a la notificación.`,
    keyPoints: [
      "Entrega obligatoria de reporte fotográfico en ALFA OS",
      "Corrección de fallas y observaciones técnicas sin costo adicional",
    ],
  },
  {
    id: "c20",
    number: 20,
    title: "Garantía mínima de doce meses",
    subtitle: "Garantía de mano de obra e integración técnica",
    content: `El CONTRATISTA garantiza por un plazo mínimo de 12 (doce) meses que toda la mano de obra, canalización, cableado, fijación, integración y programación realizada está libre de defectos de ejecución y cumple las normas técnicas aplicables. El plazo reinicia respecto a trabajos reparados o corregidos. Atenderá reclamos de garantía dentro de las 24 horas siguientes al aviso.`,
    keyPoints: [
      "Garantía mínima de 12 meses en toda mano de obra e instalación",
      "Reinicio de plazo de garantía en componentes corregidos",
      "Respuesta en garantía en máximo 24 horas",
    ],
  },
  {
    id: "c21",
    number: 21,
    title: "Registros, auditoría y cooperación",
    subtitle: "Conservación de expedientes laborales y técnicos por 5 años",
    content: `El CONTRATISTA conservará por un mínimo de 5 años los comprobantes laborales, altas IMSS, pólizas, bitácoras y registros de seguridad relacionados con los servicios, permitiendo su revisión a requerimiento fundado de ALFA o de autoridades competentes.`,
    keyPoints: [
      "Conservación de expedientes por 5 años",
      "Cooperación inmediata ante auditorías SAT, IMSS o STPS",
    ],
  },
  {
    id: "c22",
    number: 22,
    title: "Defensa e indemnización",
    subtitle: "Obligación de sacar en paz y a salvo a ALFA ante reclamaciones",
    content: `El CONTRATISTA se obliga a defender, indemnizar y sacar en paz y a salvo a ALFA, sus clientes, accionistas y directivos de cualquier demanda laboral, juicio, inspección, capital constitutivo del IMSS, crédito fiscal, multa o daño derivado de hechos u omisiones del CONTRATISTA o de su personal.`,
    keyPoints: [
      "Indemnidad patrimonial total a favor de ALFA",
      "Reembolso de gastos legales y multas originadas por el contratista",
    ],
  },
  {
    id: "c23",
    number: 23,
    title: "Caso fortuito y fuerza mayor",
    subtitle: "Notificación y exclusión de contingencias previsibles",
    content: `Ninguna parte será responsable por retrasos imputables exclusivamente a causas de fuerza mayor imprevisibles. No constituyen fuerza mayor la falta de liquidez, renuncia de trabajadores, vencimiento de seguros o pérdida de registros REPSE.`,
    keyPoints: [
      "Fuerza mayor estrictamente imprevisible",
      "Falta de personal o REPSE no exime de responsabilidad",
    ],
  },
  {
    id: "c24",
    number: 24,
    title: "Vigencia, suspensión y terminación",
    subtitle: "Causales de rescisión inmediata sin responsabilidad para ALFA",
    content: `El contrato tendrá vigencia de un año prorrogable. ALFA podrá suspender accesos o rescindir el contrato de forma inmediata y sin responsabilidad ante: falsedad documental, pérdida de REPSE, filtración de datos confidenciales, accidentes graves por omisión de EPP, o suministro indebido de personal.`,
    keyPoints: [
      "Rescisión inmediata por falta de REPSE, fraude o violación de NDA",
      "Facultad de suspensión preventiva de accesos",
    ],
  },
  {
    id: "c25",
    number: 25,
    title: "Anticorrupción, conflictos y cumplimiento",
    subtitle: "Cero tolerancia a sobornos y actos ilícitos",
    content: `El CONTRATISTA cumplirá estrictamente las leyes anticorrupción y prevención de lavado de dinero, prohibiéndose terminantemente otorgar o solicitar pagos indebidos, dádivas o favores a empleados de ALFA, clientes o inspectores públicos.`,
    keyPoints: [
      "Cero tolerancia a sobornos, dádivas o pagos ilegales",
    ],
  },
  {
    id: "c26",
    number: 26,
    title: "Avisos y expediente electrónico",
    subtitle: "Validez de notificaciones por ALFA OS, WhatsApp y correo registrado",
    content: `Las partes reconocen plena validez a las notificaciones y comunicaciones cursadas a través de la plataforma ALFA OS, los correos electrónicos y números de WhatsApp registrados formalmente en este instrumento.`,
    keyPoints: [
      "Comunicaciones válidas vía ALFA OS, correo y WhatsApp registrado",
    ],
  },
  {
    id: "c27",
    number: 27,
    title: "Cesión de derechos",
    subtitle: "Prohibición de cesión sin consentimiento expreso",
    content: `El CONTRATISTA no podrá ceder ni transferir los derechos u obligaciones derivados de este contrato ni de las Órdenes de Trabajo sin autorización previa y por escrito de ALFA.`,
    keyPoints: [
      "Prohibida la cesión de derechos de cobro o ejecución a terceros",
    ],
  },
  {
    id: "c28",
    number: 28,
    title: "Ley aplicable y jurisdicción",
    subtitle: "Sumisión a tribunales de Guadalajara y Zapopan, Jalisco",
    content: `Para la interpretación y cumplimiento de este contrato mercantil, las partes se someten a las leyes federales de los Estados Unidos Mexicanos y a la jurisdicción de los tribunales competentes de la Zona Metropolitana de Guadalajara (Guadalajara y Zapopan, Jalisco), renunciando a cualquier otro fuero.`,
    keyPoints: [
      "Jurisdicción exclusiva: Tribunales de Guadalajara y Zapopan, Jalisco",
    ],
  },
  {
    id: "c29",
    number: 29,
    title: "Integridad, no renuncia y supervivencia",
    subtitle: "Acuerdo integral y subsistencia de cláusulas críticas",
    content: `Este contrato y sus anexos constituyen el acuerdo íntegro entre las partes. Sobreviven a su terminación las obligaciones de confidencialidad (NDA), protección de datos personales, garantías técnicas, propiedad intelectual, no elusión comercial, custodia de registros y deber de indemnización.`,
    keyPoints: [
      "Supervivencia legal de NDA, garantías e indemnidad post-terminación",
    ],
  },
];
