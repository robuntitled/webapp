import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

export function BookingComplianceNote() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {COMPLIANCE_COPY.separateBooking}
    </p>
  );
}
