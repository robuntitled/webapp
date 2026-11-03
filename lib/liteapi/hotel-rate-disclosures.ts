/** Client-safe helpers for hotel rate taxes and cancellation copy (LiteAPI). */

export type HotelTaxFee = {
  description: string;
  amount: number;
  currency: string;
  included: boolean;
};

export type RawTaxFee = {
  included?: boolean;
  description?: string;
  amount?: number | string;
  currency?: string;
};

function toAmount(value: number | string | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Returns null when the field is absent (unknown). Empty array when present but empty. */
export function parseTaxesAndFees(
  raw: RawTaxFee[] | null | undefined
): HotelTaxFee[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const items: HotelTaxFee[] = [];
  for (const row of raw) {
    const amount = toAmount(row.amount);
    if (amount == null) continue;
    const currency = (row.currency ?? 'EUR').toUpperCase();
    const description = row.description?.trim() || 'altri costi';
    items.push({
      description,
      amount,
      currency,
      included: row.included !== false,
    });
  }
  return items;
}

export function formatPayAtPropertyLine(fee: HotelTaxFee): string {
  const amount = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fee.amount);
  return `Da pagare in struttura: ${fee.description} ${amount} ${fee.currency}`;
}

export function payAtPropertyLines(fees: HotelTaxFee[] | null | undefined): string[] {
  if (!fees?.length) return [];
  return fees.filter((f) => !f.included).map(formatPayAtPropertyLine);
}

/** When data is present and every item is included. */
export function taxesIncludedLabel(fees: HotelTaxFee[] | null | undefined): string | null {
  if (fees == null) return null;
  if (fees.length === 0) return null;
  if (fees.every((f) => f.included)) return 'Tasse incluse.';
  return null;
}

export function pickFreeCancellationUntil(
  cancelPolicyInfos: Array<{ cancelTime?: string; amount?: number }> | undefined
): string | null {
  if (!cancelPolicyInfos?.length) return null;
  const free = cancelPolicyInfos.filter((i) => i.amount === 0 && i.cancelTime);
  if (!free.length) return null;
  free.sort((a, b) => String(b.cancelTime).localeCompare(String(a.cancelTime)));
  return free[0]?.cancelTime ?? null;
}

export function formatHotelCancellationLabel(input: {
  refundable: boolean;
  freeCancelUntil?: string | null;
}): string | null {
  if (!input.refundable) return 'Tariffa non rimborsabile';
  const until = input.freeCancelUntil?.trim();
  if (!until) return 'Tariffa rimborsabile';
  const datePart = until.slice(0, 10);
  try {
    const d = new Date(`${datePart}T12:00:00`);
    const formatted = d.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `Cancellazione gratuita fino al ${formatted}`;
  } catch {
    return `Cancellazione gratuita fino al ${datePart}`;
  }
}

export function isRefundableTagRfn(tag: string | null | undefined): boolean {
  const t = (tag ?? '').toLowerCase().trim();
  return t === 'rfn' || t === 'refundable';
}
