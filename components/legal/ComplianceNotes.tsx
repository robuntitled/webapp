import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { cn } from '@/lib/utils';

export function ComplianceNotes({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-1 text-xs leading-relaxed text-muted-foreground', className)}>
      <p>{COMPLIANCE_COPY.separateBooking}</p>
      <p>{COMPLIANCE_COPY.notAPackage}</p>
      <p>{COMPLIANCE_COPY.priceIsSumOfServices}</p>
      <p>{COMPLIANCE_COPY.aiGenerated}</p>
      <p>{COMPLIANCE_COPY.responsibility}</p>
    </div>
  );
}
