import 'server-only';

import { formatCreditEuros } from '@/lib/credits/calc';
import { getBookingCashbackPercent } from '@/lib/credits/config';
import {
  getWalletBalance,
  listCreditLedger,
  type CreditLedgerEntry,
} from '@/lib/credits/wallet';

export type CreditsPageData = {
  balanceCents: number;
  balanceFormatted: string;
  currency: string;
  cashbackPercent: number;
  ledger: Array<{
    id: string;
    entryType: CreditLedgerEntry['entry_type'];
    amountCents: number;
    amountFormatted: string;
    bookingKind: CreditLedgerEntry['booking_kind'];
    bookingRef: string | null;
    createdAt: string;
  }>;
};

export async function getCreditsPageData(userId: string): Promise<CreditsPageData> {
  const [wallet, ledger] = await Promise.all([
    getWalletBalance(userId),
    listCreditLedger(userId, 20),
  ]);

  return {
    balanceCents: wallet.balanceCents,
    balanceFormatted: formatCreditEuros(wallet.balanceCents, wallet.currency),
    currency: wallet.currency,
    cashbackPercent: getBookingCashbackPercent(),
    ledger: ledger.map((e) => ({
      id: e.id,
      entryType: e.entry_type,
      amountCents: e.amount_cents,
      amountFormatted: formatCreditEuros(e.amount_cents, e.currency),
      bookingKind: e.booking_kind,
      bookingRef: e.booking_ref,
      createdAt: e.created_at,
    })),
  };
}
