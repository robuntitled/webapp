import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  calculateBookingCashback,
  eurosToCents,
} from '@/lib/credits/calc';
import {
  getBookingCashbackMaxCents,
  getBookingCashbackPercent,
  getCommissionMarginPercent,
} from '@/lib/credits/config';

export type CreditLedgerEntry = {
  id: string;
  entry_type: 'earn' | 'spend' | 'adjust' | 'reversal';
  amount_cents: number;
  balance_after_cents: number;
  currency: string;
  provider: string;
  booking_kind: 'hotel' | 'flight' | null;
  booking_id: string | null;
  booking_ref: string | null;
  created_at: string;
};

export type WalletSnapshot = {
  balanceCents: number;
  currency: string;
};

export type EarnBookingCreditInput = {
  userId: string;
  bookingKind: 'hotel' | 'flight';
  /** Chiave idempotente (bookingId o transactionId). */
  externalRef: string;
  bookingId?: string | null;
  bookingRef?: string | null;
  /** Importo pagato in euro (da prebook/book). */
  bookingAmountEuros: number;
  currency?: string | null;
  tripId?: string | null;
};

export type EarnBookingCreditResult =
  | { ok: true; credited: true; creditCents: number; balanceCents: number; currency: string }
  | {
      ok: true;
      credited: false;
      reason: 'zero' | 'duplicate' | 'disabled' | 'unsupported_currency';
      balanceCents: number;
      currency: string;
    }
  | { ok: false; error: string };

export async function getWalletBalance(userId: string): Promise<WalletSnapshot> {
  const { data, error } = await supabaseAdmin
    .from('user_credit_wallets')
    .select('balance_cents, currency')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[credits] getWalletBalance', error);
    return { balanceCents: 0, currency: 'EUR' };
  }
  if (!data) return { balanceCents: 0, currency: 'EUR' };
  return {
    balanceCents: Number(data.balance_cents) || 0,
    currency: (data.currency as string) || 'EUR',
  };
}

export async function listCreditLedger(
  userId: string,
  limit = 20
): Promise<CreditLedgerEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('user_credit_ledger')
    .select(
      'id, entry_type, amount_cents, balance_after_cents, currency, provider, booking_kind, booking_id, booking_ref, created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(50, Math.max(1, limit)));

  if (error) {
    console.error('[credits] listCreditLedger', error);
    return [];
  }
  return (data ?? []) as CreditLedgerEntry[];
}

/**
 * Accredita cashback dopo book LiteAPI confermato.
 * Idempotente su (provider, external_ref, earn) via RPC atomica.
 */
export async function earnBookingCredit(
  input: EarnBookingCreditInput
): Promise<EarnBookingCreditResult> {
  const cashbackPercent = getBookingCashbackPercent();
  if (cashbackPercent <= 0) {
    const bal = await getWalletBalance(input.userId);
    return { ok: true, credited: false, reason: 'disabled', ...toBal(bal) };
  }

  const currency = (input.currency?.trim().toUpperCase() || 'EUR').slice(0, 3);
  if (currency !== 'EUR') {
    const bal = await getWalletBalance(input.userId);
    return {
      ok: true,
      credited: false,
      reason: 'unsupported_currency',
      ...toBal(bal),
    };
  }

  const bookingAmountCents = eurosToCents(input.bookingAmountEuros);
  const calc = calculateBookingCashback({
    bookingAmountCents,
    marginPercent: getCommissionMarginPercent(),
    cashbackPercent,
    maxCreditCents: getBookingCashbackMaxCents(),
  });

  if (calc.creditCents <= 0) {
    const bal = await getWalletBalance(input.userId);
    return { ok: true, credited: false, reason: 'zero', ...toBal(bal) };
  }

  const externalRef = input.externalRef.trim();
  if (!externalRef) {
    return { ok: false, error: 'external_ref mancante' };
  }

  const { data, error } = await supabaseAdmin.rpc('earn_booking_credit', {
    p_user_id: input.userId,
    p_external_ref: externalRef,
    p_credit_cents: calc.creditCents,
    p_booking_kind: input.bookingKind,
    p_booking_id: input.bookingId ?? null,
    p_booking_ref: input.bookingRef ?? null,
    p_trip_id: input.tripId ?? null,
    p_booking_amount_cents: bookingAmountCents,
    p_commission_cents: calc.commissionCents,
    p_meta: {
      marginPercent: getCommissionMarginPercent(),
      cashbackPercent,
    },
  });

  if (error) {
    console.error('[credits] earn_booking_credit rpc', error);
    return { ok: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') {
    return { ok: false, error: 'Risposta wallet non valida' };
  }

  const credited = Boolean((row as { credited?: boolean }).credited);
  const creditCents = Number((row as { credit_cents?: number }).credit_cents) || 0;
  const balanceCents = Number((row as { balance_cents?: number }).balance_cents) || 0;
  const cur = String((row as { currency?: string }).currency || 'EUR');
  const reason = String((row as { reason?: string }).reason || '');

  if (credited) {
    return {
      ok: true,
      credited: true,
      creditCents,
      balanceCents,
      currency: cur,
    };
  }

  const mappedReason =
    reason === 'duplicate'
      ? 'duplicate'
      : reason === 'zero'
        ? 'zero'
        : 'zero';

  return {
    ok: true,
    credited: false,
    reason: mappedReason,
    balanceCents,
    currency: cur,
  };
}

function toBal(bal: WalletSnapshot) {
  return { balanceCents: bal.balanceCents, currency: bal.currency };
}
