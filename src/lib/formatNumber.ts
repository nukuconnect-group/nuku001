/**
 * Centralized number / money formatting.
 * Uses en-US locale so the thousand separator is a visible comma
 * (e.g. 15,229) instead of the narrow no-break space produced by fr-FR.
 */
export const formatAmount = (n: number | null | undefined): string => {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(v));
};

export const formatAmountDecimal = (
  n: number | null | undefined,
  digits = 2
): string => {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
};
