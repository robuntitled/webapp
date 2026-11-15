'use client';

import { AlertTriangle, Plane } from 'lucide-react';
import { formatEuroExact } from '@/lib/format/euro';
import { formatStopsIt } from '@/lib/itineraries/selected-flight-display';
import {
  SEPARATE_TICKETS_NOTICE_IT,
  STALE_OFFER_NOTICE_IT,
  analyzeLegTiming,
  providerSearchModeForPlan,
  selectedLegsTotal,
  type TripFlightPlan,
} from '@/lib/travel/trip-flight-legs';
import { PAY_FOR_OTHERS_ENABLED } from '@/lib/itineraries/flight-booking-coverage';
import { PricePerPersonBlock } from '@/components/ui/price';
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

function LegPriceBlock({
  unit,
  currency,
  pax,
}: {
  unit: number;
  currency: string;
  pax: number;
}) {
  const party = Math.round(unit * Math.max(1, pax) * 100) / 100;
  return (
    <div
      className="w-full min-w-0 basis-full text-left sm:w-auto sm:basis-auto sm:text-right"
      data-testid="flight-review-leg-price"
    >
      <PricePerPersonBlock unit={unit} party={party} pax={pax} currency={currency} />
    </div>
  );
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
  const closedRtBundle =
    mode.canUseClosedRoundtrip &&
    selected.length === 2 &&
    selected[0]?.kind === 'outbound' &&
    (selected[1]?.kind === 'return' || selected[1]?.kind === 'openjaw_return') &&
    (selected[1]?.offer?.price ?? 0) === 0;
  const partyPax = Math.max(1, travelers, totals.passengers || 1);

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
      ) : closedRtBundle ? (
        <ul className="space-y-2">
          <li
            className={cn(
              'rounded-xl border px-3 py-2.5',
              selected.some((l) => l.status === 'stale')
                ? 'border-amber-300 bg-amber-50/70'
                : 'border-[var(--color-border)]'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary">
                  Prenotazione unica A/R · {selected[0]!.offer!.originIata} ⇄{' '}
                  {selected[0]!.offer!.destinationIata}
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  Andata {selected[0]!.offer!.originIata} →{' '}
                  {selected[0]!.offer!.destinationIata}
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Partenza {formatWhen(selected[0]!.offer!.departureAt)} · Arrivo{' '}
                  {formatWhen(selected[0]!.offer!.arrivalAt)}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  Rientro {selected[1]!.offer!.originIata} →{' '}
                  {selected[1]!.offer!.destinationIata}
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Partenza {formatWhen(selected[1]!.offer!.departureAt)} · Arrivo{' '}
                  {formatWhen(selected[1]!.offer!.arrivalAt)}
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                  Offerta chiusa del fornitore (un biglietto A/R) ·{' '}
                  {formatStopsIt(selected[0]!.offer!.stops)}
                  {selected[0]!.offer!.airline ? ` · ${selected[0]!.offer!.airline}` : ''}
                </p>
              </div>
              <LegPriceBlock
                unit={selected[0]!.offer!.price}
                currency={selected[0]!.offer!.currency}
                pax={selected[0]!.passengers}
              />
            </div>
            {selected.some((l) => l.status === 'stale') ? (
              <p className="mt-1 text-[11px] font-medium text-amber-900">
                {STALE_OFFER_NOTICE_IT}
              </p>
            ) : null}
          </li>
        </ul>
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
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1 basis-[12rem]">
                  <p className="text-xs font-bold text-primary">
                    Prenotazione {i + 1} · {leg.labelIt}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {leg.offer!.originIata} → {leg.offer!.destinationIata}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    Partenza {formatWhen(leg.offer!.departureAt)}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    Arrivo {formatWhen(leg.offer!.arrivalAt)}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    {formatStopsIt(leg.offer!.stops)} ·{' '}
                    {Math.round(leg.offer!.durationMinutes / 60)} h
                    {leg.offer!.airline ? ` · ${leg.offer!.airline}` : ''}
                  </p>
                </div>
                <LegPriceBlock
                  unit={leg.offer!.price}
                  currency={leg.offer!.currency}
                  pax={leg.passengers}
                />
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

      {/* P0-6: no «Pago per altri» until migration 049 — Pago per me only */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2.5"
        data-testid="flight-review-chi-paga"
      >
        <p className="text-xs font-bold text-[var(--color-text)]">Chi paga</p>
        <span
          className="inline-flex h-8 items-center rounded-full border border-primary bg-[var(--color-tint)] px-3 text-xs font-semibold text-primary"
          data-testid="flight-review-pago-per-me"
        >
          Pago per me
        </span>
        {PAY_FOR_OTHERS_ENABLED ? (
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-full border border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-[var(--color-text-secondary)]"
            data-testid="flight-review-pago-per-altri"
            disabled
          >
            Pago per altri
          </button>
        ) : null}
      </div>

      <div className="rounded-xl bg-[var(--color-tint)]/60 px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold">Totale voli</p>
          <p
            className="text-lg font-extrabold tabular-nums"
            data-testid="flight-review-party-total"
          >
            {totals.amount != null
              ? formatEuroExact(totals.amount, totals.currency)
              : '—'}
          </p>
        </div>
        {totals.perPersonAmount != null && partyPax > 1 ? (
          <p
            className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]"
            data-testid="flight-review-per-person"
          >
            {formatEuroExact(totals.perPersonAmount, totals.currency)} a persona ·{' '}
            {partyPax} {partyPax === 1 ? 'persona' : 'persone'}
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
            {totals.selectedCount} tratt
            {totals.selectedCount === 1 ? 'a' : 'e'} ·{' '}
            {partyPax} {partyPax === 1 ? 'persona' : 'persone'}
          </p>
        )}
        <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
          Bagagli e condizioni tariffarie: disponibili dopo la verifica offerta.
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
            In questa integrazione supportiamo solo andata o andata/ritorno chiuso per
            singola ricerca: non emettiamo un unico biglietto multi-tratta. Ogni riga
            sopra è una prenotazione distinta da verificare separatamente.
          </p>
        ) : (
          <p>
            Andata/ritorno sullo stesso aeroporto può usare una sola offerta A/R del
            fornitore; altre tratte restano separate.
          </p>
        )}
        <p className="font-medium text-amber-950">
          Nessun pagamento da questo riepilogo. I prezzi non sono bloccati: al checkout
          serve una nuova verifica disponibilità.
        </p>
      </div>
    </section>
  );
}
