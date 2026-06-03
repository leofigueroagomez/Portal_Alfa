import { Code2, FileText } from "lucide-react";

type InvoiceFileLinksProps = {
  xmlUrl?: string | null;
  pdfUrl?: string | null;
  satUuid?: string | null;
  facturamaId?: string | null;
};

export default function InvoiceFileLinks({
  xmlUrl,
  pdfUrl,
  satUuid,
  facturamaId,
}: InvoiceFileLinksProps) {
  if (!xmlUrl && !pdfUrl && !satUuid && !facturamaId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            title={`PDF: ${pdfUrl}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A30] text-[#B3B3B8] hover:border-[#9E1B32] hover:text-white"
            aria-label="Abrir PDF"
          >
            <FileText size={17} />
          </a>
        ) : null}
        {xmlUrl ? (
          <a
            href={xmlUrl}
            target="_blank"
            rel="noreferrer"
            title={`XML: ${xmlUrl}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A30] text-[#B3B3B8] hover:border-[#9E1B32] hover:text-white"
            aria-label="Abrir XML"
          >
            <Code2 size={16} />
          </a>
        ) : null}
        {satUuid ? (
          <span className="text-xs text-[#77777D]" title={satUuid}>
            UUID
          </span>
        ) : null}
        {facturamaId ? (
          <span className="text-xs text-[#77777D]" title={facturamaId}>
            ID
          </span>
        ) : null}
      </div>
      <div className="max-w-[260px] space-y-1 font-mono text-[10px] leading-snug text-[#77777D]">
        <p className="truncate" title={xmlUrl || "Sin XML"}>
          xml_url: {xmlUrl || "-"}
        </p>
        <p className="truncate" title={pdfUrl || "Sin PDF"}>
          pdf_url: {pdfUrl || "-"}
        </p>
      </div>
    </div>
  );
}
