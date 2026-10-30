'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Lock, MessageCircle, Plane } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatEditionDateRange } from '@/lib/itineraries/dates';
import { cn } from '@/lib/utils';

type Props = {
  practiceId: string;
  destinationName: string;
  tripTitle: string | null;
  dateFrom: string;
  dateTo: string;
  mode: string;
  editionType: string | null;
  inviteUrl: string | null;
  isPrivate: boolean;
};

export function ProssimoPasso({
  practiceId,
  destinationName,
  tripTitle,
  dateFrom,
  dateTo,
  mode,
  inviteUrl,
  isPrivate,
}: Props) {
  const [copied, setCopied] = useState(false);
  const title = tripTitle?.trim() || destinationName;
  const privacyLabel = isPrivate ? 'privato' : 'gruppo';
  const showInvite = Boolean(inviteUrl) && (mode === 'friends' || mode === 'group' || isPrivate);

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Link copiato');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossibile copiare il link');
    }
  }

  const waHref = inviteUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Unisciti al mio viaggio: ${inviteUrl}`)}`
    : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-tint)]/50 py-10">
      <div className="nl-page w-full max-w-2xl">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
              <Check className="h-7 w-7" strokeWidth={2.5} />
            </span>
            <h1 className="mt-4 font-display text-2xl font-extrabold text-[var(--color-text)] sm:text-3xl">
              Viaggio creato
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {title} · {formatEditionDateRange(dateFrom, dateTo)} ·{' '}
              <span className="font-semibold text-[var(--color-text)]">{privacyLabel}</span>
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Prossimi passi · 0 di 3 completati
            </p>
            <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-[var(--color-tint)]">
              <div className="h-full w-0 rounded-full bg-primary" />
            </div>
          </div>

          <ol className="mt-8 space-y-3">
            {showInvite ? (
              <li
                className={cn(
                  'rounded-2xl border-2 border-accent bg-white p-4 sm:p-5'
                )}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
                  Ora · Passo 1 — Invita gli amici
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Chi apre il link entra nel viaggio e nella chat. Il link resta privato.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <code className="min-h-11 flex-1 truncate rounded-[10px] border border-[var(--color-border)] bg-[var(--color-tint)]/60 px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
                    {inviteUrl}
                  </code>
                  <Button
                    type="button"
                    className="min-h-11 rounded-[10px] bg-accent hover:bg-[var(--color-accent-hover)]"
                    onClick={copyLink}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Copia link
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {waHref ? (
                    <Button asChild variant="outline" className="rounded-[10px]">
                      <a href={waHref} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                  ) : null}
                </div>
              </li>
            ) : (
              <li className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                  Passo 1 — Il viaggio è tuo
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Sei da solo: passa ai voli quando vuoi. Nessun invito necessario.
                </p>
              </li>
            )}

            <li className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-start gap-3">
                <Plane className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold text-[var(--color-text)]">
                    Passo 2 — Prenota il volo
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                    Voli per il {dateFrom.slice(8, 10)}/{dateFrom.slice(5, 7)}, ritorno il{' '}
                    {dateTo.slice(8, 10)}/{dateTo.slice(5, 7)}. Ognuno prenota il proprio.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="min-h-11 shrink-0 rounded-[10px] bg-primary hover:bg-[var(--color-primary-hover)]"
              >
                <Link href={`/pratica/${practiceId}?tab=voli`}>Cerca voli →</Link>
              </Button>
            </li>

            <li className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-tint)]/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">
                  Passo 3 — Scegli l&apos;hotel
                </p>
                <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                  Si sblocca dopo il volo, così le date coincidono con l&apos;arrivo.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled
                className="min-h-11 shrink-0 rounded-[10px]"
              >
                <Lock className="h-4 w-4" />
                Dopo il volo
              </Button>
            </li>
          </ol>

          {isPrivate ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)] p-4">
              <p className="font-bold text-[var(--color-text)]">Rendi pubblico come gruppo</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Facoltativo. Il viaggio comparirà in Gruppi e altri viaggiatori potranno unirsi.
                (Attivazione in arrivo — per ora resta privato.)
              </p>
            </div>
          ) : null}

          <div className="mt-6 text-center">
            <Link
              href={`/pratica/${practiceId}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
            >
              Vai alla pagina del viaggio →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
