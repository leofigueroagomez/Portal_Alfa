import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAlfaBankAccounts } from "@/lib/bankAccounts";
import type { PaymentMilestone, ProjectContractRecord } from "@/lib/contracts";

const logoPath = path.join(process.cwd(), "public", "logo-print.png");
const logoSrc = fs.existsSync(logoPath) ? logoPath : null;

// Registro de fuentes estándar
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
    { src: "Helvetica-BoldOblique", fontWeight: "bold", fontStyle: "italic" },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
    color: "#0B0D0F",
    fontFamily: "Helvetica",
    fontSize: 8.5,
    lineHeight: 1.35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#9E1B32",
    paddingBottom: 10,
    marginBottom: 14,
  },
  logo: {
    width: 110,
    height: 26,
    objectFit: "contain",
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 7,
    fontWeight: "bold",
    letterSpacing: 1.2,
    color: "#9E1B32",
    textTransform: "uppercase",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  contractTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0B0D0F",
    textTransform: "uppercase",
  },
  contractFolio: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#9E1B32",
    marginTop: 2,
  },
  metaRight: {
    fontSize: 7.5,
    color: "#6B7280",
    marginTop: 1,
  },
  // Carátula
  cardGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  card: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 3,
    padding: 7,
  },
  cardLabel: {
    fontSize: 6.5,
    fontWeight: "bold",
    color: "#9E1B32",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#111827",
  },
  cardSub: {
    fontSize: 7,
    color: "#4B5563",
    marginTop: 1,
  },
  // Tablas
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 3,
    marginBottom: 10,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1F242D",
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "bold",
    textTransform: "uppercase",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#F9FAFB",
  },
  // Secciones
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#0B0D0F",
    borderBottomWidth: 1,
    borderBottomColor: "#9E1B32",
    paddingBottom: 3,
    marginTop: 10,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subSectionTitle: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 6,
    marginBottom: 3,
  },
  paragraph: {
    fontSize: 8,
    color: "#374151",
    textAlign: "justify",
    marginBottom: 4.5,
    lineHeight: 1.35,
  },
  bold: {
    fontWeight: "bold",
    color: "#111827",
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 6,
  },
  bulletDot: {
    width: 8,
    fontSize: 8,
    color: "#9E1B32",
    fontWeight: "bold",
  },
  bulletText: {
    flex: 1,
    fontSize: 8,
    color: "#374151",
    textAlign: "justify",
  },
  // Caja de alerta / banco
  highlightBox: {
    backgroundColor: "#FDF8F8",
    borderWidth: 1,
    borderColor: "#F0D5D8",
    borderLeftWidth: 3,
    borderLeftColor: "#9E1B32",
    padding: 7,
    borderRadius: 2,
    marginBottom: 8,
  },
  highlightTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#9E1B32",
    marginBottom: 2,
  },
  highlightText: {
    fontSize: 7.5,
    color: "#4B5563",
    lineHeight: 1.25,
  },
  // Firmas
  signatureContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
  signatureGrid: {
    flexDirection: "row",
    gap: 16,
  },
  signatureBox: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    borderRadius: 3,
    padding: 8,
  },
  signatureImage: {
    width: "100%",
    height: 48,
    objectFit: "contain",
    marginBottom: 4,
  },
  signaturePlaceholder: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#111827",
    paddingTop: 4,
  },
  signatureName: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#111827",
  },
  signatureTitle: {
    fontSize: 7,
    color: "#6B7280",
  },
  legalTrace: {
    marginTop: 5,
    borderLeftWidth: 2,
    borderLeftColor: "#9E1B32",
    paddingLeft: 5,
    fontSize: 6.5,
    color: "#4B5563",
    backgroundColor: "#F3F4F6",
    paddingVertical: 2,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 4,
    fontSize: 6.5,
    color: "#9CA3AF",
  },
});

function formatCurrency(amount: number | null | undefined, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
  }).format(amount || 0);
}

function formatDate(val: string | null | undefined) {
  if (!val) return "Fecha por definir";
  const date = new Date(`${val}T12:00:00`);
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type ContractPdfProps = {
  contract: ProjectContractRecord;
  quoteItems?: Array<{
    id: number;
    title?: string | null;
    description: string | null;
    brand: string | null;
    model: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    category?: string | null;
    area?: string | null;
  }>;
  projectName?: string | null;
  quoteNumber?: string | null;
  siteAddress?: string | null;
};

export function ContractPdfDocument({
  contract,
  quoteItems = [],
  projectName = "Proyecto de Integración Tecnológica",
  quoteNumber = "COT-0000",
  siteAddress = "Instalaciones del cliente",
}: ContractPdfProps) {
  const isB2B = contract.client_type === "b2b";
  const clientName = contract.legal_business_name || contract.representative_name || "El Cliente";
  const bank = getAlfaBankAccounts();

  return (
    <Document title={`Contrato_${contract.contract_number}_ALFA_IT`}>
      {/* PÁGINA 1: CARÁTULA EJECUTIVA DEL CONTRATO */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <Text style={styles.eyebrow}>ALFA IT SOLUCIONES • INSTRUMENTO CONTRACTUAL</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.contractTitle}>Carátula del Contrato</Text>
            <Text style={styles.contractFolio}>{contract.contract_number}</Text>
            <Text style={styles.metaRight}>Versión {contract.version} • {formatDate(contract.contract_date)}</Text>
          </View>
        </View>

        {/* Resumen del Contrato */}
        <View style={styles.cardGrid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Cliente / Razón Social</Text>
            <Text style={styles.cardValue}>{clientName}</Text>
            <Text style={styles.cardSub}>RFC: {contract.legal_rfc || "Por definir"}</Text>
            <Text style={styles.cardSub}>Tipo: {isB2B ? "Persona Moral (B2B)" : "Persona Física (B2C)"}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Proyecto y Cotización</Text>
            <Text style={styles.cardValue}>{projectName}</Text>
            <Text style={styles.cardSub}>Cotización Base: {quoteNumber}</Text>
            <Text style={styles.cardSub}>Semanas estimadas: {contract.estimated_weeks} semanas</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Inversión Total del Proyecto</Text>
            <Text style={[styles.cardValue, { color: "#9E1B32", fontSize: 10.5 }]}>
              {formatCurrency(contract.total_amount_mxn, contract.currency)}
            </Text>
            <Text style={styles.cardSub}>Subtotal: {formatCurrency(contract.subtotal_mxn, contract.currency)}</Text>
            <Text style={styles.cardSub}>IVA 16%: {formatCurrency(contract.iva_mxn, contract.currency)}</Text>
          </View>
        </View>

        {/* Sitio y Disciplinas */}
        <View style={styles.cardGrid}>
          <View style={[styles.card, { flexGrow: 1.5 }]}>
            <Text style={styles.cardLabel}>Sitio de Ejecución / Domicilio de Obra</Text>
            <Text style={styles.cardValue}>{siteAddress || contract.legal_fiscal_address || "Instalaciones autorizadas"}</Text>
            <Text style={styles.cardSub}>Horario de obra: {contract.work_schedule}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Disciplinas Comprendidas</Text>
            <Text style={styles.cardValue}>
              {contract.disciplines && contract.disciplines.length > 0
                ? contract.disciplines.join(", ")
                : "Sistemas e Integración Tecnológica"}
            </Text>
            <Text style={styles.cardSub}>Garantía mano de obra: {contract.warranty_labor_months} meses</Text>
          </View>
        </View>

        {/* Hitos de Pago Programados */}
        <Text style={styles.sectionTitle}>Esquema de Hitos y Condiciones de Pago</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ width: "12%" }}>%</Text>
            <Text style={{ width: "48%" }}>Concepto / Detonador del Hito</Text>
            <Text style={{ width: "20%" }}>Monto sin IVA</Text>
            <Text style={{ width: "20%", textAlign: "right" }}>Total con IVA</Text>
          </View>
          {contract.payment_milestones.map((m: PaymentMilestone, idx: number) => {
            const milestoneSubtotal = (contract.subtotal_mxn * m.percentage) / 100;
            const milestoneTotal = (contract.total_amount_mxn * m.percentage) / 100;
            return (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[{ width: "12%" }, styles.bold]}>{m.percentage}%</Text>
                <Text style={{ width: "48%" }}>{m.concept}</Text>
                <Text style={{ width: "20%" }}>{formatCurrency(milestoneSubtotal, contract.currency)}</Text>
                <Text style={[{ width: "20%", textAlign: "right" }, styles.bold, { color: "#9E1B32" }]}>
                  {formatCurrency(milestoneTotal, contract.currency)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Datos Bancarios SPEI */}
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>DATOS BANCARIOS OFICIALES PARA TRANSFERENCIA (SPEI)</Text>
          <Text style={styles.highlightText}>
            • Banco: {bank.bankName}  • Beneficiario: {bank.beneficiary}  • CLABE: {bank.clabe}  • Referencia: {contract.contract_number}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>ALFA IT Soluciones • Contrato {contract.contract_number}</Text>
          <Text>Carátula de Contrato • Página 1</Text>
        </View>
      </Page>

      {/* PÁGINA 2: CONTRATO MARCO - DECLARACIONES Y CLÁUSULAS */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <Text style={styles.eyebrow}>CONTRATO MARCO DE PRESTACIÓN DE SERVICIOS E INTEGRACIÓN TECNOLÓGICA</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.contractFolio}>{contract.contract_number}</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          Contrato que celebran, por una parte, <Text style={styles.bold}>{contract.alfa_business_name}</Text>, representada por <Text style={styles.bold}>{contract.alfa_representative_name}</Text>, a quien en lo sucesivo se denominará <Text style={styles.bold}>“ALFA”</Text>; y por la otra, <Text style={styles.bold}>{clientName}</Text>, representada por <Text style={styles.bold}>{contract.representative_name || "su representante legal"}</Text>, a quien se denominará el <Text style={styles.bold}>“CLIENTE”</Text>; al tenor de las siguientes:
        </Text>

        <Text style={styles.sectionTitle}>DECLARACIONES</Text>

        <Text style={styles.subSectionTitle}>I. Declara ALFA:</Text>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>a)</Text>
          <Text style={styles.bulletText}>
            Ser una sociedad legalmente constituida conforme a las leyes mexicanas, con RFC <Text style={styles.bold}>{contract.alfa_rfc}</Text>, con domicilio en {contract.alfa_address}, constituida mediante {contract.alfa_notary_deed}.
          </Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>b)</Text>
          <Text style={styles.bulletText}>
            Que su representante, {contract.alfa_representative_name}, en su carácter de {contract.alfa_representative_title}, cuenta con facultades legales suficientes para celebrar el presente contrato.
          </Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>c)</Text>
          <Text style={styles.bulletText}>
            Que cuenta con la capacidad técnica, humana, financiera y experiencia para ejecutar los servicios de diseño, ingeniería, suministro e integración tecnológica descritos en la Orden de Servicio.
          </Text>
        </View>

        <Text style={styles.subSectionTitle}>II. Declara el CLIENTE:</Text>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>a)</Text>
          <Text style={styles.bulletText}>
            {isB2B
              ? `Ser una persona moral con denominación ${clientName}, con RFC ${contract.legal_rfc || "[RFC]"} y domicilio fiscal en ${contract.legal_fiscal_address || "[Domicilio Fiscal]"}, acreditando su existencia conforme a la Escritura Pública No. ${contract.notary_deed_number || "[Escritura]"} de fecha ${contract.notary_deed_date || "[Fecha]"}, pasada ante la fe del Notario ${contract.notary_name || "[Notario]"} No. ${contract.notary_number || "[No.]"} de ${contract.notary_city_state || "[Ciudad]"}, e inscrita en el Registro Público con Folio ${contract.public_registry_folio || "[Folio]"}.`
              : `Ser una persona física de nacionalidad mexicana, con RFC ${contract.legal_rfc || "[RFC]"}, CURP ${contract.representative_curp || "[CURP]"}, con domicilio en ${contract.legal_fiscal_address || siteAddress}.`}
          </Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>b)</Text>
          <Text style={styles.bulletText}>
            Que su representante <Text style={styles.bold}>{contract.representative_name || clientName}</Text> cuenta con las facultades legales necesarias para obligarse en los términos de este contrato.
          </Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>c)</Text>
          <Text style={styles.bulletText}>
            Que cuenta con los derechos, propiedad o autorización jurídica suficiente para permitir el acceso, canalización e intervención en el sitio de ejecución ubicado en <Text style={styles.bold}>{siteAddress}</Text>.
          </Text>
        </View>

        <Text style={styles.subSectionTitle}>III. Declaran ambas PARTES:</Text>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Que se reconocen recíprocamente la personalidad jurídica y celebran este acto libremente, sin dolo, error, violencia ni mala fe, reconociendo la plena validez de los mensajes de datos y firmas electrónicas conforme al Código de Comercio y la NOM-151-SCFI-2016.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>CLÁUSULAS</Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>1. OBJETO Y ESTRUCTURA:</Text> ALFA se obliga a prestar al CLIENTE los servicios de ingeniería, integración, instalación y configuración tecnológica, y en su caso el suministro de equipamiento especificado en la Orden de Servicio (Anexo A) y cotización {quoteNumber}.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2. ORDEN DE SERVICIO Y CAMBIOS:</Text> Todo trabajo no descrito en el Anexo A se considerará fuera de alcance y requerirá una Orden de Cambio autorizada por escrito o vía electrónica previa a su ejecución.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>3. OBLIGACIONES DE ALFA:</Text> Ejecutar los trabajos con personal capacitado, conforme a las mejores prácticas de la industria, resguardar la confidencialidad de la información y emitir los comprobantes fiscales digitales (CFDI) correspondientes.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>4. OBLIGACIONES DEL CLIENTE:</Text> Proveer acceso oportuno y seguro al inmueble, suministrar acometida eléctrica aterrizada, enlaces de Internet activos, y designar al responsable en sitio ({contract.site_manager_name || "Project Manager designado"}).
        </Text>

        <View style={styles.footer}>
          <Text>ALFA IT Soluciones • Contrato {contract.contract_number}</Text>
          <Text>Contrato Marco • Página 2</Text>
        </View>
      </Page>

      {/* PÁGINA 3: CLÁUSULAS COMERCIALES, LEGALES Y FIRMAS */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <Text style={styles.eyebrow}>CONDICIONES LEGALES Y FORMALIZACIÓN</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.contractFolio}>{contract.contract_number}</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>5. PRECIO Y CONDICIONES DE PAGO:</Text> El precio pactado asciende a {formatCurrency(contract.subtotal_mxn, contract.currency)} más el IVA de {formatCurrency(contract.iva_mxn, contract.currency)}, dando un total de <Text style={styles.bold}>{formatCurrency(contract.total_amount_mxn, contract.currency)}</Text>, pagadero conforme al esquema de hitos de la Carátula.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>6. PLAZOS Y ENTREGA:</Text> La duración estimada de los trabajos es de {contract.estimated_weeks} semanas a partir de la recepción del anticipo y liberación de accesos de obra civil.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>7. GARANTÍAS:</Text> ALFA otorga <Text style={styles.bold}>{contract.warranty_labor_months} meses de garantía</Text> sobre mano de obra e instalación. Los equipos cuentan con su garantía directa de fabricante gestionada por ALFA.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>8. CONFIDENCIALIDAD Y DATOS PERSONALES:</Text> Las partes guardarán estricta reserva de la información técnica y privada conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>9. JURISDICCIÓN Y LEY APLICABLE:</Text> Para la interpretación y cumplimiento, las partes se someten a las leyes mercantiles y tribunales competentes de la ciudad de Zapopan / Guadalajara, Jalisco, renunciando a cualquier otro fuero.
        </Text>

        {/* Bloque de Doble Firma */}
        <View style={styles.signatureContainer}>
          <Text style={[styles.sectionTitle, { borderBottomWidth: 0, marginBottom: 8 }]}>
            CONFORMIDAD Y FORMALIZACIÓN DE LAS PARTES
          </Text>
          <View style={styles.signatureGrid}>
            {/* Firma ALFA */}
            <View style={styles.signatureBox}>
              <Text style={styles.cardLabel}>POR LA PRESTADORA (ALFA IT):</Text>
              {contract.alfa_signature_image_url ? (
                <Image src={contract.alfa_signature_image_url} style={styles.signatureImage} />
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <Text style={{ fontSize: 7, color: "#9E1B32" }}>Firma Digital Autorizada</Text>
                </View>
              )}
              <View style={styles.signatureLine}>
                <Text style={styles.signatureName}>{contract.alfa_representative_name}</Text>
                <Text style={styles.signatureTitle}>{contract.alfa_representative_title}</Text>
                <Text style={styles.signatureTitle}>{contract.alfa_business_name}</Text>
              </View>
            </View>

            {/* Firma CLIENTE */}
            <View style={styles.signatureBox}>
              <Text style={styles.cardLabel}>POR EL CLIENTE:</Text>
              {contract.client_signature_image_url ? (
                <Image src={contract.client_signature_image_url} style={styles.signatureImage} />
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <Text style={{ fontSize: 7, color: "#6B7280", fontStyle: "italic" }}>
                    Pendiente de firma digital
                  </Text>
                </View>
              )}
              <View style={styles.signatureLine}>
                <Text style={styles.signatureName}>{contract.client_signer_name || contract.representative_name || clientName}</Text>
                <Text style={styles.signatureTitle}>{contract.representative_title || (isB2B ? "Representante Legal" : "El Contratante")}</Text>
                <Text style={styles.signatureTitle}>{clientName}</Text>
              </View>
            </View>
          </View>

          {/* Trazabilidad Forense NOM-151 */}
          {contract.client_signed_at && (
            <View style={styles.legalTrace}>
              <Text style={styles.bold}>EVIDENCIA DE FIRMA DIGITAL Y TRAZABILIDAD LEGAL (NOM-151):</Text>
              <Text>• Fecha y Hora: {new Date(contract.client_signed_at).toLocaleString("es-MX")}</Text>
              <Text>• Dirección IP Firmante: {contract.client_signature_ip || "Registrada"}</Text>
              {contract.client_signature_latitude && contract.client_signature_longitude ? (
                <Text>• Coordenadas GPS: {contract.client_signature_latitude}, {contract.client_signature_longitude}</Text>
              ) : null}
              <Text>• Documento íntegro formalizado mediante el Portal ALFA OS.</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text>ALFA IT Soluciones • Contrato {contract.contract_number}</Text>
          <Text>Firmas Contractuales • Página 3</Text>
        </View>
      </Page>

      {/* PÁGINA 4+: ANEXO A — ORDEN DE SERVICIO / ALCANCE DEL PROYECTO */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <Text style={styles.eyebrow}>ANEXO A • ORDEN DE SERVICIO Y ALCANCE TÉCNICO</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.contractFolio}>{contract.contract_number}</Text>
            <Text style={styles.metaRight}>Cotización: {quoteNumber}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>A.1 Alcance y Tabla de Entregables</Text>
        <Text style={styles.paragraph}>
          A continuación se desglosa el equipamiento, componentes y servicios incluidos en la presente orden:
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ width: "8%" }}>Cant.</Text>
            <Text style={{ width: "20%" }}>Marca / Modelo</Text>
            <Text style={{ width: "42%" }}>Descripción del Entregable</Text>
            <Text style={{ width: "15%" }}>Ubicación</Text>
            <Text style={{ width: "15%", textAlign: "right" }}>Importe</Text>
          </View>
          {quoteItems.slice(0, 18).map((item, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[{ width: "8%" }, styles.bold]}>{item.quantity}</Text>
              <Text style={{ width: "20%", fontSize: 7 }}>
                {item.brand || ""} {item.model || ""}
              </Text>
              <Text style={{ width: "42%", fontSize: 7 }}>
                {item.title || item.description || "Partida de equipamiento e ingeniería"}
              </Text>
              <Text style={{ width: "15%", fontSize: 7 }}>{item.area || "General"}</Text>
              <Text style={[{ width: "15%", textAlign: "right" }, styles.bold]}>
                {formatCurrency(item.subtotal || item.quantity * item.unit_price, contract.currency)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>A.2 Exclusiones y Prerrequisitos de Obra</Text>
        <View style={styles.cardGrid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Prerrequisitos a cargo del Cliente:</Text>
            <Text style={styles.cardSub}>
              {contract.technical_prerequisites || "Acometida eléctrica aterrizada, acceso seguro a obra y enlace de Internet."}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Trabajos Fuera de Alcance (Exclusiones):</Text>
            <Text style={styles.cardSub}>
              {contract.technical_exclusions || "Albañilería, resanes mayores, pintura o trámites ante dependencias."}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>ALFA IT Soluciones • Contrato {contract.contract_number}</Text>
          <Text>Anexo A • Página 4</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateProjectContractPdf(
  supabase: SupabaseClient,
  contractId: number
): Promise<Buffer> {
  const [{ data: contract, error: contractErr }, { data: quoteItems }] = await Promise.all([
    supabase
      .from("project_contracts")
      .select(`
        *,
        quotes:quote_id (quote_number),
        client_projects:client_project_id (name, site_address),
        clients:client_id (name, company_name, tax_business_name, tax_rfc, tax_zip_code, address)
      `)
      .eq("id", contractId)
      .single(),
    supabase
      .from("quote_items")
      .select("id, title, description, brand, model, quantity, unit_price, subtotal, category, area")
      .eq("quote_id", contractId) // fallback if directly linked, or fetch via quote_id below
      .order("id", { ascending: true }),
  ]);

  if (contractErr || !contract) {
    throw contractErr || new Error("Contrato no encontrado");
  }

  // Si no trajimos quoteItems por contractId directo, los traemos por quote_id del contrato
  let items = quoteItems;
  if ((!items || items.length === 0) && contract.quote_id) {
    const { data: qItems } = await supabase
      .from("quote_items")
      .select("id, title, description, brand, model, quantity, unit_price, subtotal, category, area")
      .eq("quote_id", contract.quote_id)
      .order("id", { ascending: true });
    items = qItems || [];
  }

  const projectName = (contract.client_projects as { name?: string } | null)?.name || "Proyecto de Integración";
  const siteAddress = (contract.client_projects as { site_address?: string } | null)?.site_address || contract.legal_fiscal_address || "";
  const quoteNumber = (contract.quotes as { quote_number?: string } | null)?.quote_number || "COT-0000";

  const doc = (
    <ContractPdfDocument
      contract={contract as unknown as ProjectContractRecord}
      quoteItems={items || []}
      projectName={projectName}
      quoteNumber={quoteNumber}
      siteAddress={siteAddress}
    />
  );

  return renderToBuffer(doc);
}
