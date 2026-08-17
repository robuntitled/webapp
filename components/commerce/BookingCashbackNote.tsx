import Link from 'next/link';
import { formatCreatorCashback, formatParticipantCashback } from '@/lib/commerce/cashback';

export function BookingCashbackNote({
  estimatedEur,
}: {
  estimatedEur?: number;
}) {
  return (
    <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
      Cashback {formatParticipantCashback()}
      {estimatedEur && estimatedEur > 0 ? ` · circa ${Math.round(estimatedEur)}€` : ''} sul totale.
      Se hai creato tu il viaggio: {formatCreatorCashback()}. Il credito è visibile in{' '}
      <Link href="/dashboard/cashback" className="underline underline-offset-2">
        I miei crediti
      </Link>
      .
    </p>
  );
}
