import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  estimateCashbackEur,
  type CashbackRole,
} from '@/lib/commerce/cashback';

export type CashbackService = 'flight' | 'hotel' | 'car' | 'attraction';

export type CashbackLedgerRow = {
  id: string;
  user_id: string;
  trip_id: string | null;
  booking_ref: string;
  service: CashbackService;
  amount_eur: number;
  credit_eur: number;
  rate: number;
  role: CashbackRole;
  status: 'pending' | 'earned' | 'clawback';
  created_at: string;
};

export async function resolveCashbackRole(
  userId: string,
  tripId?: string | null
): Promise<CashbackRole> {
  if (!tripId) return 'participant';
  const { data } = await supabaseAdmin
    .from('trips')
    .select('creator_id')
    .eq('id', tripId)
    .maybeSingle();
  return data?.creator_id === userId ? 'creator' : 'participant';
}

export async function recordBookingCashback(opts: {
  userId: string;
  tripId?: string | null;
  bookingRef: string;
  service: CashbackService;
  amountEur: number;
}): Promise<void> {
  const amount = Number.isFinite(opts.amountEur) ? Math.max(0, opts.amountEur) : 0;
  if (amount <= 0 || !opts.bookingRef.trim()) return;

  const role = await resolveCashbackRole(opts.userId, opts.tripId);
  const credit = estimateCashbackEur(amount, role);
  if (credit <= 0) return;

  const { error } = await supabaseAdmin.from('cashback_ledger').insert({
    user_id: opts.userId,
    trip_id: opts.tripId || null,
    booking_ref: opts.bookingRef.slice(0, 120),
    service: opts.service,
    amount_eur: Math.round(amount * 100) / 100,
    credit_eur: credit,
    rate: role === 'creator' ? 0.02 : 0.0135,
    role,
    status: 'pending',
  });

  if (error) {
    console.error('[cashback_ledger]', error.message);
  }
}

export async function listCashbackForUser(userId: string): Promise<CashbackLedgerRow[]> {
  const { data, error } = await supabaseAdmin
    .from('cashback_ledger')
    .select(
      'id, user_id, trip_id, booking_ref, service, amount_eur, credit_eur, rate, role, status, created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[cashback_ledger list]', error.message);
    return [];
  }
  return (data ?? []) as CashbackLedgerRow[];
}

export function sumPendingAndEarned(rows: CashbackLedgerRow[]): number {
  return rows
    .filter((row) => row.status === 'pending' || row.status === 'earned')
    .reduce((sum, row) => sum + Number(row.credit_eur || 0), 0);
}
