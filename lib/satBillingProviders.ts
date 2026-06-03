export type SatBillingProviderId = "facturama" | "sw" | "finkok";

export type SatBillingProvider = {
  id: SatBillingProviderId;
  name: string;
  mode: "sandbox" | "planned";
  active: boolean;
};

export const satBillingProviders: Record<SatBillingProviderId, SatBillingProvider> = {
  facturama: {
    id: "facturama",
    name: "Facturama Sandbox",
    mode: "sandbox",
    active: true,
  },
  sw: {
    id: "sw",
    name: "SW",
    mode: "planned",
    active: false,
  },
  finkok: {
    id: "finkok",
    name: "Finkok",
    mode: "planned",
    active: false,
  },
};
