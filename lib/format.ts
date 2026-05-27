const twoDecimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(value: number | string | null | undefined) {
  return twoDecimalFormatter.format(Number(value || 0));
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency?: string | null
) {
  return `${currency || "USD"} ${formatNumber(value)}`;
}
