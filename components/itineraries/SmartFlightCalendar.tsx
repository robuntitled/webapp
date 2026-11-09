'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plane, RefreshCw, Timer, Zap } from 'lucide-react';
import {
  FLIGHT_CALENDAR_API_BUDGET,
  calendarCacheKey,
  readCalendarCache,
  writeCalendarCache,
} from '@/lib/travel/flight-calendar-cache';
import {
  bookableNearbyWindow,
  minBookableDateIso,
  prioritizeProbeOrder,
} from '@/lib/travel/flight-calendar-dates';
import { withCalendarProbeSlot } from '@/lib/travel/flight-calendar-queue';
import {
  suggestNearbyFlightDay,
  type DayBadgeStats,
} from '@/lib/travel/flight-score';
import { cn } from '@/lib/utils';

type Props = {
  labelIt: string;
  originIata: string;
  destinationIata: string;
  value: string | null;
  onChange: (iso: string) => void;
  pairedReturnDate?: string | null;
  tripType?: 'oneway' | 'roundtrip';
  /** Extra floor (e.g. return cannot precede departure). */
  minDate?: string | null;
  className?: string;
};

const WEEKDAY_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'] as const;

function weekdayIt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return WEEKDAY_IT[wd] ?? '';
}

function formatDurationShort(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return '';
  const h = Math.round(minutes / 60);
  return `${h}h`;
}

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
      status: cached.status,
      loading: false,
    };
  }

  const params = new URLSearchParams({
    originIata: input.originIata,
    destination: input.destinationIata,
    startDate: input.date,
    tripType: input.tripType,
    adults: '1',
    currency: 'EUR',
    summary: '1',
  });
  if (input.tripType === 'roundtrip' && input.returnDate) {
    params.set('endDate', input.returnDate);
  }

  return withCalendarProbeSlot(async () => {
    try {
      const res = await fetch(`/api/liteapi/flights/search?${params}`, {
        credentials: 'same-origin',
      });
      const data = (await res.json()) as {
        status?: 'ok' | 'empty' | 'error';
        cheapestPrice?: number | null;
        minStops?: number | null;
        minDurationMinutes?: number | null;
        offerCount?: number;
        error?: string;
        found?: boolean;
      };

      if (!res.ok || data.status === 'error') {
        return {
          date: input.date,
          cheapestPrice: null,
          minStops: null,
          minDurationMinutes: null,
          status: 'error',
          error: data.error ?? 'errore',
          loading: false,
        };
      }

      const empty =
        data.status === 'empty' ||
        (!data.found && (data.offerCount ?? 0) === 0) ||
        data.cheapestPrice == null;

      const result: DayBadgeStats = {
        date: input.date,
        cheapestPrice: empty ? null : (data.cheapestPrice ?? null),
        minStops: empty ? null : (data.minStops ?? null),
        minDurationMinutes: empty ? null : (data.minDurationMinutes ?? null),
        status: empty ? 'empty' : 'ok',
        loading: false,
      };

      writeCalendarCache(key, {
        date: result.date,
        cheapestPrice: result.cheapestPrice,
        minStops: result.minStops,
        minDurationMinutes: result.minDurationMinutes,
        offerCount: data.offerCount ?? 0,
        status: empty ? 'empty' : 'ok',
      });
      return result;
    } catch {
      return {
        date: input.date,
        cheapestPrice: null,
        minStops: null,
        minDurationMinutes: null,
        status: 'error',
        error: 'rete',
        loading: false,
      };
    }
  });
}

export function SmartFlightCalendar({
  labelIt,
  originIata,
  destinationIata,
  value,
  onChange,
  pairedReturnDate = null,
  tripType = 'oneway',
  minDate = null,
  className,
}: Props) {
  const [badges, setBadges] = useState<Record<string, DayBadgeStats>>({});
  const [loading, setLoading] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const runId = useRef(0);
  const stripRef = useRef<HTMLDivElement | null>(null);

  const floor = useMemo(() => {
    const bookable = minBookableDateIso();
    if (minDate && minDate > bookable) return minDate;
    return bookable;
  }, [minDate]);

  const windowDates = useMemo(
    () =>
      value
        ? bookableNearbyWindow(value, {
            radiusDays: FLIGHT_CALENDAR_API_BUDGET.radiusDays,
            minDate: floor,
          })
        : [],
    [value, floor]
  );

  const loadedOk = useMemo(
    () => windowDates.map((d) => badges[d]).filter((b) => b?.status === 'ok' && b.cheapestPrice != null),
    [windowDates, badges]
  );

  const bestPriceDate = useMemo(() => {
    if (!loadedOk.length) return null;
    return [...loadedOk].sort((a, b) => (a!.cheapestPrice! - b!.cheapestPrice!))[0]!.date;
  }, [loadedOk]);

  const fastestDate = useMemo(() => {
    if (!loadedOk.length) return null;
    return [...loadedOk].sort(
      (a, b) =>
        (a!.minDurationMinutes ?? 9e9) - (b!.minDurationMinutes ?? 9e9) ||
        (a!.cheapestPrice ?? 9e9) - (b!.cheapestPrice ?? 9e9)
    )[0]!.date;
  }, [loadedOk]);

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
            status: 'loading',
          }
      )
    );
  }, [value, windowDates, badges]);

  useEffect(() => {
    if (!value || !originIata || !destinationIata) return;
    const id = ++runId.current;
    setLoading(true);

    const dates = bookableNearbyWindow(value, {
      radiusDays: FLIGHT_CALENDAR_API_BUDGET.radiusDays,
      minDate: floor,
    });
    const order = prioritizeProbeOrder(dates, value);

    setBadges((prev) => {
      const next = { ...prev };
      for (const d of dates) {
        const existing = next[d];
        if (existing?.status === 'ok' || existing?.status === 'empty') continue;
        next[d] = {
          date: d,
          cheapestPrice: null,
          minStops: null,
          minDurationMinutes: null,
          loading: true,
          status: 'loading',
        };
      }
      return next;
    });

    let cursor = 0;

    async function worker() {
      while (cursor < order.length) {
        if (runId.current !== id) return;
        const idx = cursor++;
        const date = order[idx]!;
        const cachedKey = calendarCacheKey({
          origin: originIata,
          destination: destinationIata,
          date,
          tripType,
          returnDate: tripType === 'roundtrip' ? pairedReturnDate : null,
        });
        const hit = readCalendarCache(cachedKey);
        if (hit && hit.status !== 'error') {
          if (runId.current !== id) return;
          setBadges((prev) => ({
            ...prev,
            [date]: {
              date: hit.date,
              cheapestPrice: hit.cheapestPrice,
              minStops: hit.minStops,
              minDurationMinutes: hit.minDurationMinutes,
              status: hit.status,
              loading: false,
            },
          }));
          continue;
        }
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
      Array.from({ length: FLIGHT_CALENDAR_API_BUDGET.concurrency }, () => worker())
    ).finally(() => {
      if (runId.current === id) setLoading(false);
    });
  }, [
    value,
    originIata,
    destinationIata,
    tripType,
    pairedReturnDate,
    floor,
    retryToken,
  ]);

  useEffect(() => {
    if (!value || !stripRef.current) return;
    const el = stripRef.current.querySelector(`[data-day="${value}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [value, windowDates]);

  function retryDay(date: string) {
    setBadges((prev) => ({
      ...prev,
      [date]: {
        date,
        cheapestPrice: null,
        minStops: null,
        minDurationMinutes: null,
        loading: true,
        status: 'loading',
      },
    }));
    setRetryToken((n) => n + 1);
  }

  return (
    <div className={cn('space-y-2.5', className)} data-testid="smart-flight-calendar">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--color-text)]">{labelIt}</p>
        {loading ? (
          <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
            Prezzi in arrivo…
          </span>
        ) : null}
      </div>

      <div
        ref={stripRef}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory [scrollbar-width:thin]"
        role="listbox"
        aria-label={labelIt}
      >
        {windowDates.map((d) => {
          const b = badges[d];
          const selected = d === value;
          const isBest = d === bestPriceDate;
          const isFast = d === fastestDate;
          const dayNum = Number(d.slice(8, 10));
          return (
            <div
              key={d}
              data-day={d}
              role="option"
              tabIndex={0}
              aria-selected={selected}
              onClick={() => onChange(d)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(d);
                }
              }}
              className={cn(
                'relative flex w-[4.75rem] shrink-0 cursor-pointer snap-center flex-col items-center rounded-2xl border px-1.5 py-2 text-center transition',
                selected
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-[var(--color-border)] bg-white hover:border-primary/40',
                !selected && isBest && 'ring-2 ring-emerald-400/70',
                !selected && isFast && !isBest && 'ring-2 ring-sky-400/70'
              )}
            >
              {(isBest || isFast) && !selected ? (
                <span
                  className={cn(
                    'absolute -top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white',
                    isBest ? 'bg-emerald-500' : 'bg-sky-500'
                  )}
                >
                  {isBest ? '€' : '⚡'}
                </span>
              ) : null}
              <span
                className={cn(
                  'text-[10px] font-medium uppercase',
                  selected ? 'text-white/80' : 'text-slate-500'
                )}
              >
                {weekdayIt(d)}
              </span>
              <span className="text-sm font-extrabold leading-tight">{dayNum}</span>

              {b?.loading || b?.status === 'loading' || !b ? (
                <span className="mt-1.5 flex w-full flex-col items-center gap-1" aria-hidden>
                  <span
                    className={cn(
                      'h-2.5 w-10 animate-pulse rounded-full',
                      selected ? 'bg-white/40' : 'bg-slate-200'
                    )}
                  />
                  <span
                    className={cn(
                      'h-2 w-8 animate-pulse rounded-full',
                      selected ? 'bg-white/30' : 'bg-slate-100'
                    )}
                  />
                </span>
              ) : b.status === 'ok' && b.cheapestPrice != null ? (
                <>
                  <span className="mt-1 text-[12px] font-bold leading-none">
                    {Math.round(b.cheapestPrice)}€
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-medium',
                      selected ? 'text-white/85' : 'text-slate-600'
                    )}
                  >
                    {b.minStops === 0 ? (
                      <>
                        <Plane className="h-2.5 w-2.5" /> diretto
                      </>
                    ) : (
                      <>{b.minStops} sc.</>
                    )}
                  </span>
                  {b.minDurationMinutes != null ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 text-[9px]',
                        selected ? 'text-white/70' : 'text-slate-400'
                      )}
                    >
                      <Timer className="h-2.5 w-2.5" />
                      {formatDurationShort(b.minDurationMinutes)}
                    </span>
                  ) : null}
                </>
              ) : b.status === 'empty' ? (
                <span
                  className={cn(
                    'mt-1.5 text-[9px] font-medium leading-tight',
                    selected ? 'text-white/80' : 'text-slate-500'
                  )}
                >
                  nessun volo
                </span>
              ) : (
                <button
                  type="button"
                  className={cn(
                    'mt-1.5 inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[9px] font-semibold',
                    selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    retryDay(d);
                  }}
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  Riprova
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Miglior prezzo
        </span>
        <span className="inline-flex items-center gap-1">
          <Zap className="h-3 w-3 text-sky-500" />
          Più veloce
        </span>
        <span className="inline-flex items-center gap-1">
          <Plane className="h-3 w-3" />
          Diretto / scali · durata
        </span>
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

      <p className="text-[11px] text-[var(--color-text-secondary)]">
        {FLIGHT_CALENDAR_API_BUDGET.friendlyNoteIt}
      </p>
    </div>
  );
}
