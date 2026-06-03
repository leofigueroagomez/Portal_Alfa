export type SatBillingProviderId = "facturama" | "sw" | "finkok";

export type SatInvoiceDraft = {
  internalFolio: string;
  clientId: number;
  clientProjectId: number;
  subtotal: number;
  iva: number;
  total: number;
  currency: "MXN" | "USD";
};

export type SatStampResult = {
  satUuid: string;
  xmlUrl: string;
  pdfUrl: string;
};

export type SatBillingProvider = {
  id: SatBillingProviderId;
  name: string;
  stampInvoice: (draft: SatInvoiceDraft) => Promise<SatStampResult>;
  cancelInvoice: (satUuid: string) => Promise<void>;
};

async function pendingIntegration(): Promise<never> {
  throw new Error("La integracion PAC todavia no esta habilitada.");
}

export const satBillingProviders: Record<SatBillingProviderId, SatBillingProvider> = {
  facturama: {
    id: "facturama",
    name: "Facturama",
    stampInvoice: pendingIntegration,
    cancelInvoice: pendingIntegration,
  },
  sw: {
    id: "sw",
    name: "SW",
    stampInvoice: pendingIntegration,
    cancelInvoice: pendingIntegration,
  },
  finkok: {
    id: "finkok",
    name: "Finkok",
    stampInvoice: pendingIntegration,
    cancelInvoice: pendingIntegration,
  },
};
