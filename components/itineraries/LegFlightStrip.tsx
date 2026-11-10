'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Plane } from 'lucide-react';
import { SmartFlightCalendar } from '@/components/itineraries/SmartFlightCalendar';
import { formatEuro } from '@/lib/format/euro';
import {
  flightOfferCacheKey,
  getInflightOfferSearch,
  readFlightOfferCache,
  setInflightOfferSearch,
  writeFlightOfferCache,
  type CachedFlightOffer,
} from '@/lib/travel/flight-offer-cache';
import { pickRecommendedFlights } from '@/lib/travel/flight-score';
import type { TripFlightLeg, TripFlightOfferSnapshot } from '@/lib/travel/trip-flight-legs';
import { cn } from '@/lib/utils';

type Props = {
  leg: TripFlightLeg;
  adults: number;
  minDate?: string | null;
  onDateAndOffer: (date: string, offer: TripFlightOfferSnapshot | null) => void;
  className?: string;
};

async function fetchDayOffers(input: {
  origin: string;
  destination: string;
  date: string;
  adults: number;
}): Promise<CachedFlightOffer[]> {
  const key = flightOfferCacheKey({
    origin: input.origin,
    destination: input.destination,
    date: input.date,
    tripType: 'oneway',
    adults: input.adults,
  });
  const cached = readFlightOfferCache(key);
  if (cached) return cached.offers;
  const existing = getInflightOfferSearch(key);
  if (existing) return existing;

  const params = new URLSearchParams({
    originIata: input.origin,
    destination: input.destination,
    startDate: input.date,
    tripType: 'oneway',
    adults: String(input.adults),
    currency: 'EUR',
  });

  const promise = (async () => {
    const res = await fetch(`/api/liteapi/flights/search?${params}`, {
      credentials: 'same-origin',
    });
    const data = (await res.json()) as { offers?: CachedFlightOffer[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? 'Ricerca non riuscita');
    const list = data.offers ?? [];
    writeFlightOfferCache(key, list);
    return list;
  })();

  setInflightOfferSearch(key, promise);
  return promise;
}

function toSnapshot(offer: CachedFlightOffer, leg: TripFlightLeg): TripFlightOfferSnapshot {
  return {
    offerId: offer.id,
    price: offer.price,
    currency: offer.currency ?? 'EUR',
    originIata: offer.origin ?? leg.originIata,
    destinationIata: offer.destination ?? leg.destinationIata,
    departureAt: offer.departureAt ?? `${leg.date}T10:00:00`,
    arrivalAt: offer.arrivalAt ?? `${leg.date}T22:00:00`,
    stops: offer.stops,
    durationMinutes: offer.durationMinutes,
    airline: offer.airline ?? null,
    capturedAt: Date.now(),
  };
}

/**
 * One calendar strip per main flight leg.
 * Tapping a day selects that day's best offer for the leg.
 */
export function LegFlightStrip({
  leg,
  adults,
  minDate,
  onDateAndOffer,
  className,
}: Props) {
  const [selecting, setSelecting] = useState(false);
  const [altsOpen, setAltsOpen] = useState(false);
  const [alts, setAlts] = useState<CachedFlightOffer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  const kindLabel =
    leg.kind === 'intercountry'
      ? 'Tra paesi'
      : leg.kind === 'outbound'
        ? 'Partenza'
        : leg.kind === 'return' || leg.kind === 'openjaw_return'
          ? `Rientro da ${leg.originIata}`
          : leg.labelIt;

  const calendarLabel =
    leg.kind === 'intercountry'
      ? `Tra paesi · giorni vicini`
      : leg.kind === 'outbound'
        ? 'Partenza · giorni vicini'
        : leg.kind === 'return' || leg.kind === 'openjaw_return'
          ? `Rientro da ${leg.originIata} · giorni vicini`
          : `${leg.labelIt} · giorni vicini`;

  async function selectDay(iso: string) {
    const id = ++runId.current;
    setSelecting(true);
    setError(null);
    setAltsOpen(false);
    try {
      const offers = await fetchDayOffers({
        origin: leg.originIata,
        destination: leg.destinationIata,
        date: iso,
        adults,
      });
      if (runId.current !== id) return;
      setAlts(offers);
      if (offers.length === 0) {
        onDateAndOffer(iso, null);
        setError('Nessun volo per questo giorno.');
        return;
      }
      const scored = pickRecommendedFlights(
        offers.map((o) => ({
          id: o.id,
          price: o.price,
          stops: o.stops,
          durationMinutes: o.durationMinutes,
        }))
      );
      const bestId = scored.find((s) => s.kind === 'cheapest')?.offerId ?? offers[0]!.id;
      const best = offers.find((o) => o.id === bestId) ?? offers[0]!;
      onDateAndOffer(iso, toSnapshot(best, { ...leg, date: iso }));
    } catch (e) {
      if (runId.current !== id) return;
      setError((e as Error)?.message ?? 'Ricerca non riuscita');
      onDateAndOffer(iso, null);
    } finally {
      if (runId.current === id) setSelecting(false);
    }
  }

  const didAuto = useRef(false);
  // Auto-select best offer for the requested date once (tap still changes day/offer).
  useEffect(() => {
    if (didAuto.current) return;
    if (leg.status === 'selected' && leg.offer) return;
    didAuto.current = true;
    void selectDay(leg.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leg.id]);

  // Prefetch alts when already selected (for alternatives UI)
  useEffect(() => {
    if (!leg.offer || leg.status !== 'selected') return;
    void fetchDayOffers({
      origin: leg.originIata,
      destination: leg.destinationIata,
      date: leg.date,
      adults,
    })
      .then(setAlts)
      .catch(() => undefined);
  }, [leg.offer?.offerId, leg.date, leg.originIata, leg.destinationIata, adults, leg.status]);

  return (
    <section
      className={cn('space-y-2.5 rounded-2xl border border-[var(--color-border)] bg-white p-3', className)}
      data-testid={`leg-flight-strip-${leg.id}`}
      data-leg-kind={leg.kind}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
            {kindLabel}
          </p>
          <h3 className="text-sm font-extrabold text-[var(--color-text)]">
            {leg.originIata} → {leg.destinationIata}
          </h3>
          {leg.notesIt && leg.kind === 'intercountry' ? (
            <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
              {leg.notesIt}
            </p>
          ) : null}
        </div>
        {selecting ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Seleziono…
          </span>
        ) : null}
      </div>

      <SmartFlightCalendar
        labelIt={calendarLabel}
        originIata={leg.originIata}
        destinationIata={leg.destinationIata}
        value={leg.date}
        tripType="oneway"
        minDate={minDate}
        onChange={(iso) => {
          void selectDay(iso);
        }}
      />

      {error ? (
        <p className="text-xs font-medium text-amber-800">{error}</p>
      ) : null}

      {leg.offer && (leg.status === 'selected' || leg.status === 'stale') ? (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase text-primary">
                {leg.status === 'stale' ? 'Da ricontrollare' : 'Selezionato'}
              </p>
              <p className="text-sm font-extrabold">
                {formatEuro(leg.offer.price, { approx: false }) ??
                  `${leg.offer.price} €`}
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {leg.offer.stops === 0 ? 'Diretto' : `${leg.offer.stops} scalo/i`} ·{' '}
                {Math.round(leg.offer.durationMinutes / 60)} h
                {leg.offer.airline ? ` · ${leg.offer.airline}` : ''}
              </p>
            </div>
            <Plane className="mt-1 h-4 w-4 text-primary" />
          </div>
          {alts.length > 1 ? (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
              onClick={() => setAltsOpen((v) => !v)}
            >
              Altre opzioni
              {altsOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          ) : null}
          {altsOpen ? (
            <ul className="mt-2 space-y-1.5 border-t border-[var(--color-border)] pt-2">
              {alts.slice(0, 5).map((o) => {
                const active = o.id === leg.offer?.offerId;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs',
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-[var(--color-border)]'
                      )}
                      onClick={() =>
                        onDateAndOffer(leg.date, toSnapshot(o, leg))
                      }
                    >
                      <span>
                        {o.stops === 0 ? 'Diretto' : `${o.stops} sc.`} ·{' '}
                        {Math.round(o.durationMinutes / 60)} h
                      </span>
                      <span className="font-bold">
                        {formatEuro(o.price, { approx: false }) ?? `${o.price} €`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-[11px] text-[var(--color-text-secondary)]">
          Tocca un giorno per scegliere il volo migliore di quella data.
        </p>
      )}
    </section>
  );
}
