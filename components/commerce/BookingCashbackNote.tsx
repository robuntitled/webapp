import Link from 'next/link';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

export function BookingCashbackNote() {
  return (
    <p className="text-xs text-muted-foreground">
      {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.pointsNoMoney}{' '}
      <Link href="/dashboard/punti" className="underline underline-offset-2">
        I miei NomadPoints
      </Link>
    </p>
  );
}
