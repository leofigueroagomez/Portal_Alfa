import { addMonthsToMexicoDate, getMexicoDate } from "@/lib/mexicoDate";

/**
 * Calcula el costo sugerido de mantenimiento preventivo semestral:
 * - Base: 10% del valor del proyecto.
 * - Si el 10% da menos de $2,000 MXN -> Mínimo $1,500 MXN.
 * - Si el 10% da más de $2,500 MXN -> Máximo $2,500 MXN.
 * - Si está entre $2,000 y $2,500 MXN -> Conserva el 10%.
 */
export function calculatePreventiveMaintenanceCost(projectTotalMxn: number | null | undefined): number {
  const total = Number(projectTotalMxn || 0);
  if (total <= 0) {
    return 1500;
  }

  const rawTenPercent = total * 0.1;

  if (rawTenPercent < 2000) {
    return 1500;
  }

  if (rawTenPercent > 2500) {
    return 2500;
  }

  return Math.round(rawTenPercent);
}

export type WarrantyDefaults = {
  warrantyDate: string;
  equipmentMonths: number;
  equipmentStartDate: string;
  equipmentEndDate: string;
  installationMonths: number;
  installationStartDate: string;
  installationEndDate: string;
  preventiveMaintenanceRequired: boolean;
  preventiveMaintenanceFrequencyMonths: number;
  preventiveMaintenanceCostMxn: number;
  warrantyManagementIncludedUntil: string;
  warrantyManagementRequiresContractAfter: boolean;
  maintenancePolicyActive: boolean;
  supportEmail: string;
  representativeName: string;
  maintenanceConditionText: string;
};

export function getProjectWarrantyDefaults(params: {
  deliveryDate?: string | null;
  projectTotalMxn?: number | null;
  defaultSupportEmail?: string;
  defaultRepresentativeName?: string;
}): WarrantyDefaults {
  const baseDate = params.deliveryDate || getMexicoDate();
  const endDate12Months = addMonthsToMexicoDate(baseDate, 12);
  const calculatedMaintenanceCost = calculatePreventiveMaintenanceCost(params.projectTotalMxn);

  return {
    warrantyDate: baseDate,
    equipmentMonths: 12,
    equipmentStartDate: baseDate,
    equipmentEndDate: endDate12Months,
    installationMonths: 12,
    installationStartDate: baseDate,
    installationEndDate: endDate12Months,
    preventiveMaintenanceRequired: true,
    preventiveMaintenanceFrequencyMonths: 6,
    preventiveMaintenanceCostMxn: calculatedMaintenanceCost,
    warrantyManagementIncludedUntil: endDate12Months,
    warrantyManagementRequiresContractAfter: true,
    maintenancePolicyActive: false,
    supportEmail: params.defaultSupportEmail || "soporte@alfait.com",
    representativeName: params.defaultRepresentativeName || "Ingeniería y Operaciones ALFA IT",
    maintenanceConditionText:
      "Para conservar la vigencia de la presente garantía, es condición indispensable realizar el servicio de mantenimiento preventivo cada 6 meses con personal certificado de ALFA IT. La falta o retraso en la realización de dicho mantenimiento cada 6 meses anulará de forma automática e irrevocable la cobertura de garantía de instalación y servicio.",
  };
}
