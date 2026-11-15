import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { cn } from '@/lib/utils';

const LINES = [
  COMPLIANCE_COPY.notAPackage,
  COMPLIANCE_COPY.separateBooking,
  COMPLIANCE_COPY.priceIsSumOfServices,
  COMPLIANCE_COPY.itinerarySource,
  COMPLIANCE_COPY.responsibility,
] as const;

/** P1-18: by default show a single warning line on Voli/Hotel. */
export function ComplianceNotes({
  className,
  maxItems = 1,
}: {
  className?: string;
  maxItems?: number;
}) {
  const lines = LINES.slice(0, Math.max(1, maxItems));
  return (
    <div className={cn('space-y-1 text-xs leading-relaxed text-muted-foreground', className)}>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
