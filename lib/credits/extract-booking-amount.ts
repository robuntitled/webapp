/**
 * Estrae importo/valuta da risposte LiteAPI book/prebook (best-effort).
 */

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as UnknownRecord) : null;
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function extractBookingAmount(raw: unknown): {
  amount: number | null;
  currency: string | null;
} {
  const root = asRecord(raw);
  if (!root) return { amount: null, currency: null };

  const data = Array.isArray(root.data)
    ? asRecord(root.data[0])
    : asRecord(root.data) ?? root;

  const candidates: UnknownRecord[] = [data, asRecord(data?.booking), asRecord(data?.pricing)].filter(
    Boolean
  ) as UnknownRecord[];

  for (const node of candidates) {
    const pricing = asRecord(node.pricing);
    const display = asRecord(pricing?.display);
    const retail = asRecord(node.retailRate);
    const totalArr = Array.isArray(retail?.total) ? retail.total : null;
    const firstTotal = totalArr ? asRecord(totalArr[0]) : null;

    const amount =
      toNum(display?.total) ??
      toNum(node.price) ??
      toNum(asRecord(node.price)?.total) ??
      toNum(asRecord(node.price)?.amount) ??
      toNum(firstTotal?.amount) ??
      toNum(node.totalAmount) ??
      toNum(node.amount);

    const currency =
      toStr(display?.currency) ??
      toStr(node.currency) ??
      toStr(asRecord(node.price)?.currency) ??
      toStr(firstTotal?.currency);

    if (amount != null && amount > 0) {
      return {
        amount: Math.round(amount * 100) / 100,
        currency: currency?.toUpperCase() ?? null,
      };
    }
  }

  return { amount: null, currency: null };
}
