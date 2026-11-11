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
import {
  calendarCacheKey,
  writeCalendarCache,
} from '@/lib/travel/flight-calendar-cache';
import {
  chipStatsFromOffer,
  pickCheapestDayOffer,
} from '@/lib/travel/day-flight-representative';
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
    const data = (await res.json()) as {
      offers?: Array<
        CachedFlightOffer & { offerId?: string; durationMinutes?: number | null }
      >;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? 'Ricerca non riuscita');
    // API uses offerId; cache/UI use id — normalize once.
    const list: CachedFlightOffer[] = (data.offers ?? [])
      .map((o) => ({
        id: o.id || o.offerId || '',
        price: o.price,
        currency: o.currency,
        stops: o.stops,
        durationMinutes: o.durationMinutes ?? 0,
        origin: o.origin,
        destination: o.destination,
        departureAt: o.departureAt,
        arrivalAt: o.arrivalAt,
        airline: o.airline ?? null,
      }))
      .filter((o) => o.id && Number.isFinite(o.price));
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

  function snapshotForParty(offer: CachedFlightOffer, date: string): TripFlightOfferSnapshot {
    const pax = Math.max(1, adults);
    // Search with 1 adult so chip (calendar) and selection share the same per-person basis.
    const perPerson = offer.price;
    const total = Math.round(perPerson * pax * 100) / 100;
    return {
      ...toSnapshot({ ...offer, price: total }, { ...leg, date }),
    };
  }

  async function selectDay(iso: string) {
    const id = ++runId.current;
    setSelecting(true);
    setError(null);
    setAltsOpen(false);
    try {
      // adults=1: same basis as SmartFlightCalendar chips (per person).
      const offers = await fetchDayOffers({
        origin: leg.originIata,
        destination: leg.destinationIata,
        date: iso,
        adults: 1,
      });
      if (runId.current !== id) return;
      setAlts(offers);
      if (offers.length === 0) {
        onDateAndOffer(iso, null);
        setError('Nessun volo per questo giorno.');
        return;
      }
      // Same representative as calendar chip (cheapest offer, not balanced/score).
      const best = pickCheapestDayOffer(
        offers.map((o) => ({
          id: o.id,
          price: o.price,
          stops: o.stops,
          durationMinutes: o.durationMinutes,
          airline: o.airline ?? null,
        }))
      );
      const full = best
        ? (offers.find((o) => o.id === best.id) ?? offers[0]!)
        : offers[0]!;
      // Keep calendar badge cache in sync with the offer we just selected
      // (summary probes can drift from the full search).
      const chip = chipStatsFromOffer({
        id: full.id,
        price: full.price,
        stops: full.stops,
        durationMinutes: full.durationMinutes,
        airline: full.airline ?? null,
      });
      writeCalendarCache(
        calendarCacheKey({
          origin: leg.originIata,
          destination: leg.destinationIata,
          date: iso,
          tripType: 'oneway',
        }),
        {
          date: iso,
          cheapestPrice: chip.cheapestPrice,
          minStops: chip.minStops,
          minDurationMinutes: chip.minDurationMinutes,
          offerCount: offers.length,
          status: 'ok',
        }
      );
      onDateAndOffer(iso, snapshotForParty(full, iso));
    } catch (e) {
      if (runId.current !== id) return;
      setError((e as Error)?.message ?? 'Ricerca non riuscita');
      onDateAndOffer(iso, null);
    } finally {
      if (runId.current === id) setSelecting(false);
    }
  }

  const didAuto = useRef(false);
  // Auto-select best offer for the requested date; retry briefly if empty.
  useEffect(() => {
    if (didAuto.current) return;
    if (leg.status === 'selected' && leg.offer) return;
    didAuto.current = true;
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          if (cancelled) return;
        }
        await selectDay(leg.date);
        // Parent state may still be catching up; brief pause before retry.
        await new Promise((r) => setTimeout(r, 400));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leg.id]);

  // Prefetch alts when already selected (for alternatives UI) — same 1-adult basis as chips.
  useEffect(() => {
    if (!leg.offer || leg.status !== 'selected') return;
    void fetchDayOffers({
      origin: leg.originIata,
      destination: leg.destinationIata,
      date: leg.date,
      adults: 1,
    })
      .then(setAlts)
      .catch(() => undefined);
  }, [leg.offer?.offerId, leg.date, leg.originIata, leg.destinationIata, leg.status]);

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
        selectedDayChip={
          leg.offer && (leg.status === 'selected' || leg.status === 'stale')
            ? {
                date: leg.date,
                ...chipStatsFromOffer({
                  id: leg.offer.offerId,
                  // Snapshot stores party total; chip is always a persona.
                  price:
                    Math.round(
                      (leg.offer.price / Math.max(1, adults)) * 100
                    ) / 100,
                  stops: leg.offer.stops,
                  durationMinutes: leg.offer.durationMinutes,
                  airline: leg.offer.airline ?? null,
                }),
              }
            : null
        }
      />
      <p className="text-[10px] text-[var(--color-text-secondary)]">
        Prezzi in calendario: a persona
      </p>

      {error ? (
        <p className="text-xs font-medium text-amber-800">{error}</p>
      ) : null}

      {leg.offer && (leg.status === 'selected' || leg.status === 'stale') ? (
        <div
          className="rounded-xl border border-primary/30 bg-primary/[0.03] px-3 py-2.5"
          data-testid={`leg-selected-${leg.id}`}
          data-offer-date={leg.date}
          data-offer-id={leg.offer.offerId}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase text-primary">
                {leg.status === 'stale' ? 'Da ricontrollare' : 'Selezionato'}
              </p>
              {(() => {
                const pax = Math.max(1, adults);
                const total = leg.offer.price;
                const perPerson = Math.round((total / pax) * 100) / 100;
                const perLabel =
                  formatEuro(perPerson, { approx: false }) ?? `${perPerson} €`;
                const totalLabel =
                  formatEuro(total, { approx: false }) ?? `${total} €`;
                return (
                  <>
                    <p className="text-sm font-extrabold" data-testid="leg-price-per-person">
                      {perLabel} a persona
                    </p>
                    {pax > 1 ? (
                      <p
                        className="text-[11px] font-semibold text-[var(--color-text)]"
                        data-testid="leg-price-total"
                      >
                        {totalLabel} totale ({pax} pax)
                      </p>
                    ) : null}
                  </>
                );
              })()}
              <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                {leg.offer.stops === 0 ? 'Diretto' : `${leg.offer.stops} scalo/i`} ·{' '}
                {Math.round(leg.offer.durationMinutes / 60)} h
                {leg.offer.airline ? ` · ${leg.offer.airline}` : ''}
              </p>
            </div>
            <Plane className="mt-1 h-4 w-4 text-primary" aria-hidden />
          </div>
          {alts.length > 1 ? (
            <button
              type="button"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary"
              onClick={() => setAltsOpen((v) => !v)}
              aria-expanded={altsOpen}
            >
              Altre opzioni
              {altsOpen ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
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
                        'flex min-h-11 w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs',
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-[var(--color-border)]'
                      )}
                      aria-pressed={active}
                      onClick={() =>
                        onDateAndOffer(leg.date, snapshotForParty(o, leg.date))
                      }
                    >
                      <span>
                        {o.stops === 0 ? 'Diretto' : `${o.stops} sc.`} ·{' '}
                        {Math.round(o.durationMinutes / 60)} h
                      </span>
                      <span className="text-right font-bold">
                        {formatEuro(o.price, { approx: false }) ?? `${o.price} €`}
                        <span className="block text-[11px] font-medium text-[var(--color-text-secondary)]">
                          a persona
                        </span>
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
