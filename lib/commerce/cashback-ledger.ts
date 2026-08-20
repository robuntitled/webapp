import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { type CashbackRole } from '@/lib/commerce/cashback';

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

export async function recordBookingCashback(_opts: {
  userId: string;
  tripId?: string | null;
  bookingRef: string;
  service: CashbackService;
  amountEur: number;
}): Promise<void> {
  // Cashback % rimosso: i punti si assegnano per azioni, non sulla spesa.
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
