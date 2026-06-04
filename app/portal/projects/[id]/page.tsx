import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  ReceiptText,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import {
  addMonths,
  formatPortalDate,
  getAccessibleClientProject,
  getClientPortalContext,
  getPortalAccountSummary,
  getPortalInvoiceTotal,
  getPortalPaymentAmount,
  getPortalProjectStatusLabel,
  getPortalStatusClasses,
  type ClientPortalInvoice,
  type ClientPortalPayment,
} from "@/lib/clientPortal";
import { formatCurrency } from "@/lib/format";
import { getOrCreatePublicDocumentLink } from "@/lib/publicDocumentLinks";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Client = {
  id: number;
  name: string | null;
  billing_email?: string | null;
};

type Delivery = {
  id: number;
  delivery_date: string | null;
  status: string | null;
  delivered_to_name: string | null;
  observations: string | null;
};

type Warranty = {
  id: number;
  warranty_date: string | null;
  status: string | null;
  equipment_warranty_end_date: string | null;
  installation_warranty_end_date: string | null;
  preventive_maintenance_frequency_months: number | null;
  support_email: string | null;
};

type PublicDocument = {
  token: string;
  document_type:
    | "project_delivery"
    | "project_warranty"
    | "approved_quote"
    | "authorized_plan"
    | "project_invoice_pdf"
    | "project_invoice_xml";
  project_delivery_id: number | null;
  project_warranty_id: number | null;
  quote_id?: number | null;
  document_id?: number | null;
  project_invoice_id?: number | null;
  file_format?: string | null;
};

type ApprovedQuote = {
  id: number;
  quote_number: string | null;
  created_at: string | null;
  total_mxn?: number | null;
  grand_total?: number | null;
};

type ClientVisibleDocument = {
  id: number;
  name: string | null;
  file_url: string | null;
  created_at: string | null;
  type?: string | null;
  document_type?: string | null;
  is_client_visible?: boolean | null;
};

type PortalInvoiceWithFiles = ClientPortalInvoice & {
  facturama_id?: string | null;
};

type ProjectDocumentCard = {
  key: string;
  name: string;
  type: string;
  date: string | null;
  openHref: string;
  downloadHref?: string;
  meta?: string;
};

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof FileText;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Icon size={20} className="text-[#9E1B32]" />
      <h2 className="text-2xl font-semibold">{title}</h2>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-black/10 bg-white p-6 text-sm text-[#5F626A]">
      {children}
    </div>
  );
}

function invoiceStatusLabel(status: string | null | undefined) {
  if (status === "issued") return "Emitida";
  if (status === "paid") return "Pagada";
  if (status === "cancelled") return "Cancelada";
  return "Borrador";
}

function deliveryStatusLabel(status: string | null | undefined) {
  if (status === "delivered") return "Entregada";
  if (status === "accepted") return "Aceptada";
  return "Borrador";
}

function warrantyStatusLabel(status: string | null | undefined) {
  if (status === "issued") return "Emitida";
  return "Borrador";
}

export default async function ClientPortalProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isFinite(projectId) || projectId <= 0) {
    notFound();
  }

  const { supabase, portalUser } = await getClientPortalContext();
  const project = await getAccessibleClientProject(supabase, portalUser, projectId);
  const adminSupabase = createSupabaseAdminClient();

  const [
    { data: client },
    { data: invoices },
    { data: payments },
    { data: deliveries },
    { data: warranties },
    { data: documents },
    { data: approvedQuotes },
    { data: authorizedPlans },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, billing_email")
      .eq("id", portalUser.client_id)
      .maybeSingle(),
    supabase
      .from("project_invoices")
      .select("id, internal_folio, invoice_date, total_mxn, total, status, sat_uuid, facturama_id")
      .eq("client_project_id", project.id)
      .order("invoice_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("project_payments")
      .select(
        "id, payment_date, payment_method, payment_reference, currency, amount, amount_mxn, exchange_rate, notes"
      )
      .eq("client_project_id", project.id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("project_deliveries")
      .select("id, delivery_date, status, delivered_to_name, observations")
      .eq("client_project_id", project.id)
      .order("delivery_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("project_warranties")
      .select(
        "id, warranty_date, status, equipment_warranty_end_date, installation_warranty_end_date, preventive_maintenance_frequency_months, support_email"
      )
      .eq("client_project_id", project.id)
      .order("warranty_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("public_document_links")
      .select("token, document_type, project_delivery_id, project_warranty_id, quote_id, document_id, project_invoice_id, file_format")
      .eq("client_project_id", project.id)
      .is("expires_at", null),
    adminSupabase
      .from("quotes")
      .select("id, quote_number, created_at, total_mxn, grand_total")
      .eq("client_project_id", project.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1),
    adminSupabase
      .from("documents")
      .select("id, name, file_url, created_at, type, document_type, is_client_visible")
      .eq("project_id", project.id)
      .eq("is_client_visible", true)
      .or("document_type.eq.authorized_plan,type.eq.authorized_plan")
      .order("created_at", { ascending: false }),
  ]);

  const clientData = client as Client | null;
  const invoiceList = (invoices || []) as PortalInvoiceWithFiles[];
  const paymentList = (payments || []) as ClientPortalPayment[];
  const deliveryList = (deliveries || []) as Delivery[];
  const warrantyList = (warranties || []) as Warranty[];
  const documentList = (documents || []) as PublicDocument[];
  const approvedQuote = ((approvedQuotes || []) as ApprovedQuote[])[0] || null;
  const authorizedPlanList = (authorizedPlans || []) as ClientVisibleDocument[];
  const generatedDocuments: PublicDocument[] = [];

  if (approvedQuote) {
    const link = await getOrCreatePublicDocumentLink({
      clientProjectId: project.id,
      documentType: "approved_quote",
      quoteId: approvedQuote.id,
    });
    generatedDocuments.push(link);
  }

  for (const plan of authorizedPlanList) {
    const link = await getOrCreatePublicDocumentLink({
      clientProjectId: project.id,
      documentType: "authorized_plan",
      documentId: plan.id,
    });
    generatedDocuments.push(link);
  }

  for (const delivery of deliveryList) {
    const link = await getOrCreatePublicDocumentLink({
      clientProjectId: project.id,
      documentType: "project_delivery",
      projectDeliveryId: delivery.id,
    });
    generatedDocuments.push(link);
  }

  for (const warranty of warrantyList) {
    const link = await getOrCreatePublicDocumentLink({
      clientProjectId: project.id,
      documentType: "project_warranty",
      projectWarrantyId: warranty.id,
    });
    generatedDocuments.push(link);
  }

  for (const invoice of invoiceList) {
    if (!invoice.facturama_id) continue;

    const [pdfLink, xmlLink] = await Promise.all([
      getOrCreatePublicDocumentLink({
        clientProjectId: project.id,
        documentType: "project_invoice_pdf",
        projectInvoiceId: invoice.id,
        fileFormat: "pdf",
      }),
      getOrCreatePublicDocumentLink({
        clientProjectId: project.id,
        documentType: "project_invoice_xml",
        projectInvoiceId: invoice.id,
        fileFormat: "xml",
      }),
    ]);
    generatedDocuments.push(pdfLink, xmlLink);
  }

  const allDocumentLinks = [...documentList, ...generatedDocuments];
  const account = getPortalAccountSummary(invoiceList, paymentList);
  const latestDelivery = deliveryList[0] || null;
  const latestWarranty = warrantyList[0] || null;
  const warrantyEnd =
    latestWarranty?.installation_warranty_end_date ||
    latestWarranty?.equipment_warranty_end_date ||
    null;
  const nextMaintenance = addMonths(
    latestDelivery?.delivery_date,
    latestWarranty?.preventive_maintenance_frequency_months
  );

  function getDeliveryDocument(deliveryId: number) {
    return allDocumentLinks.find(
      (document) =>
        document.document_type === "project_delivery" &&
        document.project_delivery_id === deliveryId
    );
  }

  function getWarrantyDocument(warrantyId: number) {
    return allDocumentLinks.find(
      (document) =>
        document.document_type === "project_warranty" &&
        document.project_warranty_id === warrantyId
    );
  }

  function getDocumentByType(
    documentType: PublicDocument["document_type"],
    predicate: (document: PublicDocument) => boolean
  ) {
    return allDocumentLinks.find(
      (document) => document.document_type === documentType && predicate(document)
    );
  }

  const projectDocuments: ProjectDocumentCard[] = [];
  const approvedQuoteLink = approvedQuote
    ? getDocumentByType(
        "approved_quote",
        (document) => document.quote_id === approvedQuote.id
      )
    : null;

  if (approvedQuote && approvedQuoteLink) {
    projectDocuments.push({
      key: `quote-${approvedQuote.id}`,
      name: approvedQuote.quote_number || `Cotizacion #${approvedQuote.id}`,
      type: "Cotizacion autorizada",
      date: approvedQuote.created_at,
      openHref: `/public/documents/${approvedQuoteLink.token}/quote`,
      meta: formatCurrency(approvedQuote.total_mxn || approvedQuote.grand_total || 0, "MXN"),
    });
  }

  for (const plan of authorizedPlanList) {
    const link = getDocumentByType(
      "authorized_plan",
      (document) => document.document_id === plan.id
    );

    if (!link) continue;

    projectDocuments.push({
      key: `plan-${plan.id}`,
      name: plan.name || `Plano autorizado #${plan.id}`,
      type: "Plano autorizado",
      date: plan.created_at,
      openHref: `/public/documents/${link.token}/file`,
      downloadHref: `/public/documents/${link.token}/file`,
    });
  }

  for (const delivery of deliveryList) {
    const link = getDeliveryDocument(delivery.id);

    if (!link) continue;

    projectDocuments.push({
      key: `delivery-${delivery.id}`,
      name: `Acta de entrega ${formatPortalDate(delivery.delivery_date)}`,
      type: "Acta de entrega",
      date: delivery.delivery_date,
      openHref: `/public/documents/${link.token}/pdf`,
      downloadHref: `/public/documents/${link.token}/pdf`,
      meta: deliveryStatusLabel(delivery.status),
    });
  }

  for (const warranty of warrantyList) {
    const link = getWarrantyDocument(warranty.id);

    if (!link) continue;

    projectDocuments.push({
      key: `warranty-${warranty.id}`,
      name: `Carta garantia ${formatPortalDate(warranty.warranty_date)}`,
      type: "Carta garantia",
      date: warranty.warranty_date,
      openHref: `/public/documents/${link.token}/pdf`,
      downloadHref: `/public/documents/${link.token}/pdf`,
      meta: warrantyStatusLabel(warranty.status),
    });
  }

  for (const invoice of invoiceList) {
    const pdfLink = getDocumentByType(
      "project_invoice_pdf",
      (document) => document.project_invoice_id === invoice.id
    );
    const xmlLink = getDocumentByType(
      "project_invoice_xml",
      (document) => document.project_invoice_id === invoice.id
    );

    if (!pdfLink && !xmlLink) continue;

    projectDocuments.push({
      key: `invoice-${invoice.id}`,
      name: invoice.internal_folio || `Factura #${invoice.id}`,
      type: "Factura PDF/XML",
      date: invoice.invoice_date,
      openHref: pdfLink
        ? `/public/documents/${pdfLink.token}/pdf`
        : `/public/documents/${xmlLink?.token}/xml`,
      downloadHref: xmlLink ? `/public/documents/${xmlLink.token}/xml` : undefined,
      meta: invoice.sat_uuid ? `UUID ${invoice.sat_uuid}` : invoiceStatusLabel(invoice.status),
    });
  }

  return (
    <main className="min-h-screen bg-[#F7F6F3] text-[#111111]">
      <section className="mx-auto max-w-6xl px-5 py-8 md:py-12">
        <Link
          href="/portal"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#5F626A] transition hover:text-[#111111]"
        >
          <ArrowLeft size={17} />
          Volver al portal
        </Link>

        <section className="mb-8 grid gap-6 border-b border-black/10 pb-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-[0.28em] text-[#9E1B32]">
              PROYECTO
            </p>
            <h1 className="text-4xl font-semibold md:text-5xl">
              {project.name || "Proyecto ALFA"}
            </h1>
            <p className="mt-4 text-[#5F626A]">
              {clientData?.name || "Cliente ALFA"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getPortalStatusClasses(project.sales_stage)}`}>
              {getPortalProjectStatusLabel(project.sales_stage)}
            </span>
            <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-[#5F626A]">
              Solo lectura
            </span>
          </div>
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-4">
          <div className="rounded border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
              Facturado
            </p>
            <p className="mt-3 text-2xl font-semibold">
              {formatCurrency(account.invoicedTotalMxn, "MXN")}
            </p>
          </div>
          <div className="rounded border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
              Pagado
            </p>
            <p className="mt-3 text-2xl font-semibold">
              {formatCurrency(account.paidTotalMxn, "MXN")}
            </p>
          </div>
          <div className="rounded border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
              Saldo
            </p>
            <p className="mt-3 text-2xl font-semibold text-[#9E1B32]">
              {formatCurrency(account.pendingTotalMxn, "MXN")}
            </p>
          </div>
          <div className="rounded border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
              Proximo mantenimiento
            </p>
            <p className="mt-3 text-lg font-semibold">
              {nextMaintenance ? formatPortalDate(nextMaintenance) : "Sin fecha"}
            </p>
          </div>
        </section>

        <section className="grid gap-8">
          <div>
            <SectionTitle icon={FileText} title="Documentos del proyecto" />
            {projectDocuments.length === 0 ? (
              <EmptyState>
                Aun no hay documentos autorizados disponibles para este proyecto.
              </EmptyState>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {projectDocuments.map((document) => (
                  <div
                    key={document.key}
                    className="grid gap-4 rounded border border-black/10 bg-white p-4 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <p className="font-semibold">{document.name}</p>
                      <p className="mt-1 text-sm text-[#77777D]">
                        {document.type} - {formatPortalDate(document.date)}
                      </p>
                      {document.meta ? (
                        <p className="mt-2 text-sm text-[#5F626A]">{document.meta}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Link
                        href={document.openHref}
                        className="inline-flex items-center justify-center gap-2 rounded border border-black/10 px-4 py-2 text-sm font-semibold text-[#111111] transition hover:bg-[#F7F6F3]"
                      >
                        <ExternalLink size={16} />
                        Abrir
                      </Link>
                      {document.downloadHref ? (
                        <Link
                          href={document.downloadHref}
                          className="inline-flex items-center justify-center gap-2 rounded bg-[#111111] px-4 py-2 text-sm font-semibold text-white"
                        >
                          <Download size={16} />
                          Descargar
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle icon={WalletCards} title="Estado de cuenta" />
            <div className="rounded border border-black/10 bg-white">
              <div className="grid gap-3 border-b border-black/10 p-4 text-sm md:grid-cols-3">
                <span>Facturado: {formatCurrency(account.invoicedTotalMxn, "MXN")}</span>
                <span>Pagado: {formatCurrency(account.paidTotalMxn, "MXN")}</span>
                <span>Saldo: {formatCurrency(account.pendingTotalMxn, "MXN")}</span>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle icon={ReceiptText} title="Facturas" />
            {invoiceList.length === 0 ? (
              <EmptyState>Aun no hay facturas registradas para este proyecto.</EmptyState>
            ) : (
              <div className="overflow-hidden rounded border border-black/10 bg-white">
                {invoiceList.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="grid gap-3 border-b border-black/10 p-4 text-sm last:border-b-0 md:grid-cols-[1fr_0.8fr_0.8fr_1fr]"
                  >
                    <div>
                      <p className="font-semibold">
                        {invoice.internal_folio || `Factura #${invoice.id}`}
                      </p>
                      <p className="text-[#77777D]">{formatPortalDate(invoice.invoice_date)}</p>
                    </div>
                    <p>{invoiceStatusLabel(invoice.status)}</p>
                    <p className="font-semibold">
                      {formatCurrency(getPortalInvoiceTotal(invoice), "MXN")}
                    </p>
                    <p className="truncate text-[#77777D]">
                      UUID: {invoice.sat_uuid || "Pendiente"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle icon={WalletCards} title="Pagos" />
            {paymentList.length === 0 ? (
              <EmptyState>Aun no hay pagos registrados para este proyecto.</EmptyState>
            ) : (
              <div className="overflow-hidden rounded border border-black/10 bg-white">
                {paymentList.map((payment) => (
                  <div
                    key={payment.id}
                    className="grid gap-3 border-b border-black/10 p-4 text-sm last:border-b-0 md:grid-cols-[1fr_0.8fr_0.8fr_1fr]"
                  >
                    <div>
                      <p className="font-semibold">{formatPortalDate(payment.payment_date)}</p>
                      <p className="text-[#77777D]">{payment.payment_method || "Metodo no especificado"}</p>
                    </div>
                    <p>{payment.currency || "MXN"}</p>
                    <p className="font-semibold">
                      {formatCurrency(getPortalPaymentAmount(payment), "MXN")}
                    </p>
                    <p className="truncate text-[#77777D]">
                      {payment.payment_reference || payment.notes || "Sin referencia"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle icon={Truck} title="Entregas" />
            {deliveryList.length === 0 ? (
              <EmptyState>Aun no hay actas de entrega disponibles.</EmptyState>
            ) : (
              <div className="grid gap-3">
                {deliveryList.map((delivery) => {
                  const document = getDeliveryDocument(delivery.id);

                  return (
                    <div
                      key={delivery.id}
                      className="grid gap-4 rounded border border-black/10 bg-white p-4 md:grid-cols-[1fr_1fr_0.8fr_auto] md:items-center"
                    >
                      <div>
                        <p className="font-semibold">{formatPortalDate(delivery.delivery_date)}</p>
                        <p className="text-sm text-[#77777D]">{deliveryStatusLabel(delivery.status)}</p>
                      </div>
                      <p className="text-sm text-[#5F626A]">
                        Recibe: {delivery.delivered_to_name || "Sin receptor"}
                      </p>
                      <p className="text-sm text-[#5F626A]">
                        {delivery.observations || "Sin observaciones"}
                      </p>
                      {document ? (
                        <Link
                          href={`/public/documents/${document.token}/pdf`}
                          className="inline-flex items-center justify-center gap-2 rounded bg-[#111111] px-4 py-2 text-sm font-semibold text-white"
                        >
                          <Download size={16} />
                          Descargar
                        </Link>
                      ) : (
                        <span className="text-sm text-[#77777D]">Sin PDF publico</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <SectionTitle icon={ShieldCheck} title="Garantias" />
            {warrantyList.length === 0 ? (
              <EmptyState>Aun no hay garantias disponibles.</EmptyState>
            ) : (
              <div className="grid gap-3">
                {warrantyList.map((warranty) => {
                  const document = getWarrantyDocument(warranty.id);
                  const endDate =
                    warranty.installation_warranty_end_date ||
                    warranty.equipment_warranty_end_date ||
                    null;

                  return (
                    <div
                      key={warranty.id}
                      className="grid gap-4 rounded border border-black/10 bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center"
                    >
                      <div>
                        <p className="font-semibold">{formatPortalDate(warranty.warranty_date)}</p>
                        <p className="text-sm text-[#77777D]">{warrantyStatusLabel(warranty.status)}</p>
                      </div>
                      <p className="text-sm text-[#5F626A]">
                        Vence: {formatPortalDate(endDate)}
                      </p>
                      <p className="text-sm text-[#5F626A]">
                        Soporte: {warranty.support_email || clientData?.billing_email || "ALFA"}
                      </p>
                      {document ? (
                        <Link
                          href={`/public/documents/${document.token}/pdf`}
                          className="inline-flex items-center justify-center gap-2 rounded bg-[#111111] px-4 py-2 text-sm font-semibold text-white"
                        >
                          <Download size={16} />
                          Descargar
                        </Link>
                      ) : (
                        <span className="text-sm text-[#77777D]">Sin PDF publico</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
