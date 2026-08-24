export const PRODUCT_COST_STALE_DAYS = 30;

export function getProductAgeInDays(createdAt: string | null | undefined) {
  if (!createdAt) return null;

  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return null;

  return Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
}

export function isProductCostStale(createdAt: string | null | undefined) {
  const age = getProductAgeInDays(createdAt);

  return age !== null && age > PRODUCT_COST_STALE_DAYS;
}
