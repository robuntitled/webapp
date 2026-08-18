import Link from 'next/link';
import {
  formatCreatorCashback,
  formatParticipantCashback,
  NOMAD_CREDITS_LABEL,
} from '@/lib/commerce/cashback';

export function BookingCashbackNote({
  estimatedEur,
}: {
  estimatedEur?: number;
}) {
  return (
    <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
      {NOMAD_CREDITS_LABEL} {formatParticipantCashback()}
      {estimatedEur && estimatedEur > 0 ? ` · circa ${Math.round(estimatedEur)}€` : ''} sul servizio.
      Se hai creato tu il viaggio: {formatCreatorCashback()}. Sono uno sconto sui prossimi servizi
      via NomadLink, non denaro. Vedili in{' '}
      <Link href="/dashboard/cashback" className="underline underline-offset-2">
        I miei NomadCredits
      </Link>
      .
    </p>
  );
}
