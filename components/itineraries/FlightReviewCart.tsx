'use client';

import { AlertTriangle, Plane } from 'lucide-react';
import { formatEuroExact } from '@/lib/format/euro';
import {
  SEPARATE_TICKETS_NOTICE_IT,
  STALE_OFFER_NOTICE_IT,
  analyzeLegTiming,
  providerSearchModeForPlan,
  selectedLegsTotal,
  type TripFlightPlan,
} from '@/lib/travel/trip-flight-legs';
import { cn } from '@/lib/utils';

type Props = {
  plan: TripFlightPlan;
  travelers: number;
  className?: string;
};

function formatWhen(iso: string | undefined | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Unified REVIEW/cart for all selected legs.
 * Honest multi-ticket disclosure — stops before purchase/payment.
 */
export function FlightReviewCart({ plan, travelers, className }: Props) {
  const totals = selectedLegsTotal(plan);
  const timing = analyzeLegTiming(plan.legs);
  const mode = providerSearchModeForPlan(plan);
  const selected = plan.legs.filter(
    (l) => (l.status === 'selected' || l.status === 'stale') && l.offer
  );

  return (
    <section
      className={cn(
        'space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-4',
        className
      )}
      data-testid="flight-review-cart"
    >
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
          Revisione voli
        </p>
        <h3 className="font-display text-lg font-extrabold">Carrello tratte</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">{mode.reasonIt}</p>
      </header>

      {selected.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Nessuna tariffa reale selezionata. Le stime itinerario non sono offerte
          prenotabili.
        </p>
      ) : (
        <ul className="space-y-2">
          {selected.map((leg, i) => (
            <li
              key={leg.id}
              className={cn(
                'rounded-xl border px-3 py-2.5',
                leg.status === 'stale'
                  ? 'border-amber-300 bg-amber-50/70'
                  : 'border-[var(--color-border)]'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-primary">
                    Prenotazione {i + 1} · {leg.labelIt}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {leg.offer!.originIata} → {leg.offer!.destinationIata}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    Partenza {formatWhen(leg.offer!.departureAt)} · Arrivo{' '}
                    {formatWhen(leg.offer!.arrivalAt)}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    {leg.offer!.stops === 0 ? 'Diretto' : `${leg.offer!.stops} scali`} ·{' '}
                    {Math.round(leg.offer!.durationMinutes / 60)} h · {leg.passengers}{' '}
                    pax
                    {leg.offer!.airline ? ` · ${leg.offer!.airline}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-extrabold tabular-nums">
                  {formatEuroExact(leg.offer!.price, leg.offer!.currency) ?? '—'}
                </p>
              </div>
              {leg.status === 'stale' ? (
                <p className="mt-1 text-[11px] font-medium text-amber-900">
                  {STALE_OFFER_NOTICE_IT}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl bg-[var(--color-tint)]/60 px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold">Totale tariffe selezionate</p>
          <p className="text-lg font-extrabold tabular-nums">
            {totals.amount != null
              ? formatEuroExact(totals.amount, totals.currency)
              : '—'}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
          {totals.selectedCount} tratte · {travelers} viaggiator
          {travelers === 1 ? 'e' : 'i'} · valuta {totals.currency}
        </p>
        <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
          Bagagli e condizioni tariffarie: disponibili solo dopo verifica offerta dal
          fornitore (non inventiamo franchigie).
        </p>
      </div>

      {timing.length > 0 ? (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
            <AlertTriangle className="h-3.5 w-3.5" />
            Tempi da controllare
          </p>
          {timing.map((t) => (
            <p key={`${t.legId}-${t.messageIt}`} className="text-[11px] text-amber-950">
              {t.messageIt}
            </p>
          ))}
        </div>
      ) : null}

      <div className="space-y-2 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        <p className="flex items-start gap-1.5 font-semibold text-[var(--color-text)]">
          <Plane className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Biglietti indipendenti
        </p>
        <p>{SEPARATE_TICKETS_NOTICE_IT}</p>
        {!mode.canUseClosedRoundtrip ? (
          <p>
            LiteAPI in questa integrazione supporta solo one-way o andata/ritorno chiuso
            per singola ricerca: non emettiamo un unico biglietto multi-tratta. Ogni
            riga sopra è una prenotazione distinta da verificare separatamente.
          </p>
        ) : (
          <p>
            Andata/ritorno sullo stesso aeroporto può usare una sola offerta A/R del
            fornitore; altre tratte restano separate.
          </p>
        )}
        <p className="font-medium text-amber-950">
          Nessun pagamento e nessuna prenotazione reale da questo riepilogo (Allegato B
          BOZZA). I prezzi in cache non sono bloccati: al checkout serve una nuova
          verifica disponibilità.
        </p>
      </div>
    </section>
  );
}
