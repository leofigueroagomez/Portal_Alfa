export const salesStages = [
  "lead",
  "site_visit",
  "engineering",
  "quoted",
  "negotiation",
  "won",
  "lost",
  "installed",
  "delivered",
  "warranty",
  "closed",
] as const;

export type SalesStage = (typeof salesStages)[number];

export const salesStageLabels: Record<SalesStage, string> = {
  lead: "Lead",
  site_visit: "Visita",
  engineering: "Ingenieria",
  quoted: "Cotizado",
  negotiation: "Negociacion",
  won: "Ganado",
  lost: "Perdido",
  installed: "Instalado",
  delivered: "Entregado",
  warranty: "Garantia",
  closed: "Cerrado",
};

export const salesStageClasses: Record<SalesStage, string> = {
  lead: "border-[#3A4352] bg-[#202631] text-[#B9C7DD]",
  site_visit: "border-[#614620] bg-[#322514] text-[#F4C66A]",
  engineering: "border-[#274B63] bg-[#142B3A] text-[#8ED8FF]",
  quoted: "border-[#54336E] bg-[#2C193C] text-[#D7A8FF]",
  negotiation: "border-[#6B4A1F] bg-[#3B2D11] text-[#F4C66A]",
  won: "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]",
  lost: "border-[#6A2A2A] bg-[#351818] text-[#FF9B9B]",
  installed: "border-[#1F6F68] bg-[#123B38] text-[#8CE0D5]",
  delivered: "border-[#3A3A42] bg-[#222228] text-[#D7D7DC]",
  warranty: "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]",
  closed: "border-[#3A3A42] bg-[#222228] text-[#B3B3B8]",
};

export function normalizeSalesStage(stage: string | null | undefined) {
  return salesStages.includes(stage as SalesStage)
    ? (stage as SalesStage)
    : "lead";
}
