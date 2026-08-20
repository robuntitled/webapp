import Link from 'next/link';
import { COMPLIANCE_COPY, POST_THRESHOLD_CHECKLIST } from '@/lib/legal/compliance-copy';
import { CheckCircle2 } from 'lucide-react';

export function PostThresholdChecklist({ tripId }: { tripId: string }) {
  return (
    <section className="rounded-[1.75rem] border border-accent/30 bg-accent/5 p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
        Soglia del gruppo raggiunta
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold">Cosa fare adesso</h2>
      <p className="mt-2 text-sm text-muted-foreground">{COMPLIANCE_COPY.guide}</p>
      <ol className="mt-4 space-y-2">
        {POST_THRESHOLD_CHECKLIST.map((item, i) => (
          <li key={item} className="flex gap-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              <span className="mr-1 tabular-nums text-muted-foreground">{i + 1}.</span>
              {item}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.budgetClarifier}
      </p>
      <Link href={`/viaggi/${tripId}`} className="mt-3 inline-block text-sm font-medium text-accent">
        Resta sul Trip
      </Link>
    </section>
  );
}
