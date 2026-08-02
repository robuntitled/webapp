/**
 * Calcolo puro cashback crediti (nessun I/O).
 * Credito = commissione_stimata × cashback% , con cap.
 * Commissione stimata = importo_prenotazione × margin%.
 */

export type CashbackInput = {
  bookingAmountCents: number;
  marginPercent: number;
  cashbackPercent: number;
  maxCreditCents: number;
};

export type CashbackResult = {
  commissionCents: number;
  creditCents: number;
};

export function eurosToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

export function centsToEuros(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatCreditEuros(cents: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency.toUpperCase() || 'EUR',
    }).format(centsToEuros(cents));
  } catch {
    return `€${centsToEuros(cents).toFixed(2)}`;
  }
}

export function calculateBookingCashback(input: CashbackInput): CashbackResult {
  const amount = Math.max(0, Math.floor(input.bookingAmountCents));
  const margin = clampPercent(input.marginPercent);
  const cashback = clampPercent(input.cashbackPercent);
  const maxCredit = Math.max(0, Math.floor(input.maxCreditCents));

  const commissionCents = Math.floor((amount * margin) / 100);
  const rawCredit = Math.floor((commissionCents * cashback) / 100);
  const creditCents = Math.min(rawCredit, maxCredit);

  return { commissionCents, creditCents };
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}
