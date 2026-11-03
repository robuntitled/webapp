/** Formattazione € italiana con migliaia (1.330 €). */
export function formatEuro(
  amount: number | null | undefined,
  opts?: { approx?: boolean; currencySuffix?: boolean }
): string | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  const formatted = new Intl.NumberFormat('it-IT', {
    useGrouping: 'always',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  const body = opts?.currencySuffix === false ? formatted : `${formatted} €`;
  return opts?.approx === false ? body : `~${body}`;
}

export function formatEuroExact(
  amount: number | null | undefined,
  currency = 'EUR'
): string | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
