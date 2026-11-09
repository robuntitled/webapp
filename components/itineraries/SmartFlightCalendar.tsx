'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  FLIGHT_CALENDAR_API_BUDGET,
  calendarCacheKey,
  readCalendarCache,
  writeCalendarCache,
} from '@/lib/travel/flight-calendar-cache';
import {
  nearbyDateWindow,
  suggestNearbyFlightDay,
  type DayBadgeStats,
} from '@/lib/travel/flight-score';
import { cn } from '@/lib/utils';

type Props = {
  labelIt: string;
  originIata: string;
  destinationIata: string;
  /** Focus / selected date (ISO). */
  value: string | null;
  onChange: (iso: string) => void;
  /** Optional fixed return for roundtrip probes (omit for oneway calendar). */
  pairedReturnDate?: string | null;
  tripType?: 'oneway' | 'roundtrip';
  className?: string;
};

type OfferLite = {
  price?: number;
  stops?: number;
  durationMinutes?: number;
};

async function probeDay(input: {
  originIata: string;
  destinationIata: string;
  date: string;
  tripType: 'oneway' | 'roundtrip';
  returnDate?: string | null;
}): Promise<DayBadgeStats> {
  const key = calendarCacheKey({
    origin: input.originIata,
    destination: input.destinationIata,
    date: input.date,
    tripType: input.tripType,
    returnDate: input.returnDate,
  });
  const cached = readCalendarCache(key);
  if (cached) {
    return {
      date: cached.date,
      cheapestPrice: cached.cheapestPrice,
      minStops: cached.minStops,
      minDurationMinutes: cached.minDurationMinutes,
    };
  }

  const params = new URLSearchParams({
    originIata: input.originIata,
    destination: input.destinationIata,
    startDate: input.date,
    tripType: input.tripType,
    adults: '1',
    currency: 'EUR',
  });
  if (input.tripType === 'roundtrip' && input.returnDate) {
    params.set('endDate', input.returnDate);
  }

  try {
    const res = await fetch(`/api/liteapi/flights/search?${params}`, {
      credentials: 'same-origin',
    });
    const data = (await res.json()) as {
      offers?: OfferLite[];
      error?: string;
    };
    if (!res.ok) {
      return {
        date: input.date,
        cheapestPrice: null,
        minStops: null,
        minDurationMinutes: null,
        error: data.error ?? 'errore',
      };
    }
    const offers = data.offers ?? [];
    const cheapestPrice =
      offers.length > 0
        ? Math.min(...offers.map((o) => o.price ?? Number.POSITIVE_INFINITY))
        : null;
    const minStops =
      offers.length > 0
        ? Math.min(...offers.map((o) => o.stops ?? 9))
        : null;
    const minDurationMinutes =
      offers.length > 0
        ? Math.min(...offers.map((o) => o.durationMinutes ?? 99999))
        : null;
    writeCalendarCache(key, {
      date: input.date,
      cheapestPrice: Number.isFinite(cheapestPrice as number) ? cheapestPrice : null,
      minStops,
      minDurationMinutes:
        minDurationMinutes != null && minDurationMinutes < 99999
          ? minDurationMinutes
          : null,
      offerCount: offers.length,
    });
    return {
      date: input.date,
      cheapestPrice: Number.isFinite(cheapestPrice as number) ? cheapestPrice : null,
      minStops,
      minDurationMinutes:
        minDurationMinutes != null && minDurationMinutes < 99999
          ? minDurationMinutes
          : null,
    };
  } catch {
    return {
      date: input.date,
      cheapestPrice: null,
      minStops: null,
      minDurationMinutes: null,
      error: 'rete',
    };
  }
}

export function SmartFlightCalendar({
  labelIt,
  originIata,
  destinationIata,
  value,
  onChange,
  pairedReturnDate = null,
  tripType = 'oneway',
  className,
}: Props) {
  const [badges, setBadges] = useState<Record<string, DayBadgeStats>>({});
  const [loading, setLoading] = useState(false);
  const runId = useRef(0);

  const windowDates = useMemo(
    () => (value ? nearbyDateWindow(value, FLIGHT_CALENDAR_API_BUDGET.radiusDays) : []),
    [value]
  );

  const suggestion = useMemo(() => {
    if (!value) return null;
    return suggestNearbyFlightDay(
      value,
      windowDates.map(
        (d) =>
          badges[d] ?? {
            date: d,
            cheapestPrice: null,
            minStops: null,
            minDurationMinutes: null,
            loading: true,
          }
      )
    );
  }, [value, windowDates, badges]);

  useEffect(() => {
    if (!value || !originIata || !destinationIata) return;
    const id = ++runId.current;
    setLoading(true);

    const dates = nearbyDateWindow(value, FLIGHT_CALENDAR_API_BUDGET.radiusDays);
    // Progressive: mark loading
    setBadges((prev) => {
      const next = { ...prev };
      for (const d of dates) {
        if (!next[d]) {
          next[d] = {
            date: d,
            cheapestPrice: null,
            minStops: null,
            minDurationMinutes: null,
            loading: true,
          };
        }
      }
      return next;
    });

    let cursor = 0;
    const concurrency = FLIGHT_CALENDAR_API_BUDGET.concurrency;

    async function worker() {
      while (cursor < dates.length) {
        if (runId.current !== id) return;
        const idx = cursor++;
        const date = dates[idx]!;
        const result = await probeDay({
          originIata,
          destinationIata,
          date,
          tripType,
          returnDate: tripType === 'roundtrip' ? pairedReturnDate : null,
        });
        if (runId.current !== id) return;
        setBadges((prev) => ({
          ...prev,
          [date]: { ...result, loading: false },
        }));
      }
    }

    void Promise.all(
      Array.from({ length: concurrency }, () => worker())
    ).finally(() => {
      if (runId.current === id) setLoading(false);
    });
  }, [value, originIata, destinationIata, tripType, pairedReturnDate]);

  return (
    <div className={cn('space-y-2', className)} data-testid="smart-flight-calendar">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--color-text)]">{labelIt}</p>
        {loading ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Prezzi in arrivo…
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {windowDates.map((d) => {
          const b = badges[d];
          const selected = d === value;
          const dayNum = d.slice(8, 10);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              className={cn(
                'flex min-h-[4.25rem] flex-col items-center justify-start rounded-xl border px-1 py-1.5 text-center transition',
                selected
                  ? 'border-primary bg-primary text-white'
                  : 'border-[var(--color-border)] bg-white hover:border-primary/40'
              )}
            >
              <span className="text-xs font-bold">{Number(dayNum)}</span>
              {b?.loading ? (
                <Loader2
                  className={cn(
                    'mt-1 h-3 w-3 animate-spin',
                    selected ? 'text-white/80' : 'text-slate-400'
                  )}
                />
              ) : b?.cheapestPrice != null ? (
                <>
                  <span className="mt-0.5 text-[10px] font-semibold leading-tight">
                    {Math.round(b.cheapestPrice)}€
                  </span>
                  <span
                    className={cn(
                      'text-[9px] leading-tight',
                      selected ? 'text-white/80' : 'text-slate-500'
                    )}
                  >
                    {b.minStops === 0
                      ? 'diretto'
                      : b.minStops != null
                        ? `${b.minStops} sc.`
                        : '—'}
                  </span>
                  {b.minDurationMinutes != null ? (
                    <span
                      className={cn(
                        'text-[9px] leading-tight',
                        selected ? 'text-white/70' : 'text-slate-400'
                      )}
                    >
                      {Math.round(b.minDurationMinutes / 60)}h
                    </span>
                  ) : null}
                </>
              ) : (
                <span
                  className={cn(
                    'mt-1 text-[9px]',
                    selected ? 'text-white/70' : 'text-slate-400'
                  )}
                >
                  {b?.error ? 'n/d' : '—'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {suggestion ? (
        <button
          type="button"
          onClick={() => onChange(suggestion.suggestedDate)}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-950"
          data-testid="nearby-day-suggestion"
        >
          <span className="font-semibold">Suggerimento · </span>
          {suggestion.reasonIt}{' '}
          <span className="font-semibold text-primary">Cambia data</span>
        </button>
      ) : null}
      <p className="text-[10px] text-[var(--color-text-secondary)]">
        {FLIGHT_CALENDAR_API_BUDGET.noteIt}
      </p>
    </div>
  );
}
