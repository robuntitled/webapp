'use client';

import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Hotel, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/itineraries/StatusBadge';
import { cn } from '@/lib/utils';

export type PostPurchaseTone = 'ok' | 'review' | 'partial' | 'failed';

type Props = {
  tone: PostPurchaseTone;
  title: string;
  body: string;
  bookingCode?: string | null;
  practiceHref: string;
  hotelHref?: string | null;
  hotelLabel?: string | null;
  className?: string;
};

/**
 * Esito post-acquisto — mockup `esito-confermato-m` / `esito-da-verificare-m` (P1-4).
 * Non promette «confermata» se lo stato è da verificare.
 */
export function PostPurchase({
  tone,
  title,
  body,
  bookingCode,
  practiceHref,
  hotelHref,
  hotelLabel,
  className,
}: Props) {
  const icon =
    tone === 'ok' ? (
      <CheckCircle2 className="h-9 w-9 text-[var(--color-success)]" aria-hidden />
    ) : (
      <AlertTriangle
        className={cn(
          'h-9 w-9',
          tone === 'failed' ? 'text-[var(--color-error)]' : 'text-[var(--color-warning)]'
        )}
        aria-hidden
      />
    );

  return (
    <div
      className={cn(
        'mx-auto max-w-lg space-y-5 rounded-[16px] border bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8',
        tone === 'ok' && 'border-[var(--color-success-bd)]',
        tone === 'review' && 'border-[var(--color-warning-bd)]',
        tone === 'partial' && 'border-[var(--color-warning-bd)]',
        tone === 'failed' && 'border-[var(--err-bd)]',
        className
      )}
      data-testid="post-purchase"
      data-tone={tone}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 space-y-2">
          <StatusBadge tone={tone === 'ok' ? 'ok' : tone === 'failed' ? 'err' : 'warn'}>
            {tone === 'ok'
              ? 'Confermato'
              : tone === 'review'
                ? 'Da verificare'
                : tone === 'partial'
                  ? 'Parziale'
                  : 'Non completato'}
          </StatusBadge>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{body}</p>
        </div>
      </div>

      {bookingCode ? (
        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-page)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Codice pratica
          </p>
          <p className="mt-0.5 font-display text-lg font-bold tabular-nums" data-testid="post-purchase-code">
            {bookingCode}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Conservalo. Non pagare di nuovo per questa tratta.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {hotelHref ? (
          <Button asChild variant="cta" className="min-h-11 rounded-[10px]">
            <Link href={hotelHref} data-testid="post-purchase-hotel">
              <Hotel className="h-4 w-4" aria-hidden />
              {hotelLabel ?? "Scegli l'hotel"}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="min-h-11 rounded-[10px]">
          <Link href={practiceHref} data-testid="post-purchase-hub">
            <FileText className="h-4 w-4" aria-hidden />
            Apri il viaggio
          </Link>
        </Button>
      </div>

      <div
        className="rounded-[12px] border border-dashed border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-text-secondary)]"
        data-testid="post-purchase-cancel-block"
      >
        <p className="font-semibold text-[var(--color-text)]">Annullare o modificare</p>
        <p className="mt-1 leading-relaxed">
          Le regole dipendono dal fornitore del biglietto. Apri il viaggio e usa Assistenza se
          ti serve una mano — non ripetere il pagamento.
        </p>
      </div>
    </div>
  );
}
