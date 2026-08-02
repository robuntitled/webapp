import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { formatCreditEuros } from '@/lib/credits/calc';
import { getBookingCashbackPercent } from '@/lib/credits/config';
import { getWalletBalance, listCreditLedger } from '@/lib/credits/wallet';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const [wallet, ledger] = await Promise.all([
    getWalletBalance(session.user.id),
    listCreditLedger(session.user.id, 20),
  ]);

  return NextResponse.json({
    balanceCents: wallet.balanceCents,
    balanceFormatted: formatCreditEuros(wallet.balanceCents, wallet.currency),
    currency: wallet.currency,
    cashbackPercent: getBookingCashbackPercent(),
    ledger: ledger.map((e) => ({
      id: e.id,
      entryType: e.entry_type,
      amountCents: e.amount_cents,
      amountFormatted: formatCreditEuros(e.amount_cents, e.currency),
      balanceAfterCents: e.balance_after_cents,
      currency: e.currency,
      bookingKind: e.booking_kind,
      bookingRef: e.booking_ref,
      createdAt: e.created_at,
    })),
  });
}
