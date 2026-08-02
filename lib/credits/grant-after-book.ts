import 'server-only';

import { earnBookingCredit, type EarnBookingCreditResult } from '@/lib/credits/wallet';
import { extractBookingAmount } from '@/lib/credits/extract-booking-amount';
import { formatCreditEuros } from '@/lib/credits/calc';

export type GrantAfterBookParams = {
  userId: string;
  bookingKind: 'hotel' | 'flight';
  bookingId: string | null;
  bookingRef: string | null;
  transactionId: string;
  /** Fallback se raw non contiene prezzo. */
  fallbackAmountEuros?: number | null;
  fallbackCurrency?: string | null;
  raw: unknown;
};

export type GrantAfterBookPublic = {
  credited: boolean;
  creditCents: number;
  creditFormatted: string | null;
  balanceCents: number;
  balanceFormatted: string;
};

/**
 * Best-effort: non deve far fallire la prenotazione se il wallet fallisce.
 */
export async function grantCreditsAfterBook(
  params: GrantAfterBookParams
): Promise<{ result: EarnBookingCreditResult; public: GrantAfterBookPublic }> {
  const extracted = extractBookingAmount(params.raw);
  const amount =
    extracted.amount && extracted.amount > 0
      ? extracted.amount
      : params.fallbackAmountEuros && params.fallbackAmountEuros > 0
        ? params.fallbackAmountEuros
        : 0;
  const currency = extracted.currency || params.fallbackCurrency || 'EUR';
  const externalRef =
    params.bookingId?.trim() ||
    params.bookingRef?.trim() ||
    params.transactionId.trim();

  const result = await earnBookingCredit({
    userId: params.userId,
    bookingKind: params.bookingKind,
    externalRef,
    bookingId: params.bookingId,
    bookingRef: params.bookingRef,
    bookingAmountEuros: amount,
    currency,
  });

  if (!result.ok) {
    console.error('[credits] grant after book failed', result.error);
    return {
      result,
      public: {
        credited: false,
        creditCents: 0,
        creditFormatted: null,
        balanceCents: 0,
        balanceFormatted: formatCreditEuros(0),
      },
    };
  }

  const creditCents = result.credited ? result.creditCents : 0;
  return {
    result,
    public: {
      credited: result.credited,
      creditCents,
      creditFormatted: creditCents > 0 ? formatCreditEuros(creditCents, result.currency) : null,
      balanceCents: result.balanceCents,
      balanceFormatted: formatCreditEuros(result.balanceCents, result.currency),
    },
  };
}
