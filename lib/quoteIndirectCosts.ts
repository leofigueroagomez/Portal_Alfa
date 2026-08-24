export function getIndirectCostMultiplier(indirectCostPercent: number) {
  return 1 + Number(indirectCostPercent || 0) / 100;
}

/**
 * Given an equipment total that already has the indirect cost multiplier
 * baked in, backs out the portion attributable to indirect cost — for
 * reporting/storage only, never re-added to a total (it's already inside
 * equipmentTotalMxn).
 */
export function computeIndirectCostMxn(
  equipmentTotalMxnWithMarkup: number,
  indirectCostPercent: number
) {
  const multiplier = getIndirectCostMultiplier(indirectCostPercent);
  if (multiplier <= 0) return 0;

  return Number(equipmentTotalMxnWithMarkup || 0) * (1 - 1 / multiplier);
}

export function computeSectionMiscShareMxn(
  sectionSubtotalMxn: number,
  totalSubtotalMxn: number,
  miscTotalMxn: number
) {
  const total = Number(totalSubtotalMxn || 0);
  if (total <= 0) return 0;

  return (Number(sectionSubtotalMxn || 0) / total) * Number(miscTotalMxn || 0);
}

export const MISC_LINE_LABEL = "MISC-01 Misceláneos para la instalación";
