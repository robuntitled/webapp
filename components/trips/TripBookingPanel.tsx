'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BedDouble, Plane, Ticket } from 'lucide-react';
import { LiteApiHotelSearch } from '@/components/travel/LiteApiHotelSearch';
import { TripFlightBookSearch } from '@/components/trips/TripFlightBookSearch';
import { Button } from '@/components/ui/button';
import {
  guessCityFromDestination,
  guessCountryCodeFromDestination,
} from '@/lib/travel/destination-hints';
import { defaultOriginIata } from '@/lib/travel/origin-iata';
import type { ComposerDayRow } from '@/lib/data/composer';
import { BLOCK_META } from '@/lib/composer/blocks';
import { cn } from '@/lib/utils';

export type BookingTab = 'voli' | 'hotel' | 'attivita';

type TripBookingPanelProps = {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults?: number;
  isAuthenticated: boolean;
  composerItinerary?: ComposerDayRow[] | null;
  className?: string;
};

const TABS: { id: BookingTab; label: string; icon: typeof Plane }[] = [
  { id: 'voli', label: 'Voli', icon: Plane },
  { id: 'hotel', label: 'Hotel', icon: BedDouble },
  { id: 'attivita', label: 'Attività', icon: Ticket },
];

function parseHashTab(hash: string): BookingTab | null {
  const h = hash.replace(/^#/, '').toLowerCase();
  if (h === 'prenota-voli' || h === 'prenota-flight') return 'voli';
  if (h === 'prenota-hotel') return 'hotel';
  if (h === 'prenota-attivita' || h === 'prenota-activity') return 'attivita';
  if (h === 'prenota') return 'hotel';
  return null;
}

function activityTitle(content: Record<string, unknown>, type: string): string {
  if (typeof content.title === 'string' && content.title) return content.title;
  return BLOCK_META[type as keyof typeof BLOCK_META]?.label ?? type;
}

export function TripBookingPanel({
  tripId,
  destination,
  startDate,
  endDate,
  adults = 2,
  isAuthenticated,
  composerItinerary,
  className,
}: TripBookingPanelProps) {
  const [tab, setTab] = useState<BookingTab>('hotel');

  const city = useMemo(() => guessCityFromDestination(destination), [destination]);
  const country = useMemo(
    () => guessCountryCodeFromDestination(destination),
    [destination]
  );

  const activityStops = useMemo(() => {
    const days = composerItinerary ?? [];
    const out: { id: string; title: string; dayIndex: number; dayDate: string }[] = [];
    for (const day of days) {
      for (const block of day.trip_blocks) {
        if (
          block.block_type === 'activity' ||
          block.block_type === 'attraction' ||
          block.block_type === 'meal'
        ) {
          out.push({
            id: block.id,
            title: activityTitle(block.content, block.block_type),
            dayIndex: day.day_index,
            dayDate: day.day_date,
          });
        }
      }
    }
    return out;
  }, [composerItinerary]);

  const selectTab = useCallback((next: BookingTab) => {
    setTab(next);
    const hash =
      next === 'voli'
        ? 'prenota-voli'
        : next === 'hotel'
          ? 'prenota-hotel'
          : 'prenota-attivita';
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${hash}`);
    }
  }, []);

  useEffect(() => {
    const apply = () => {
      const fromHash = parseHashTab(window.location.hash);
      if (fromHash) setTab(fromHash);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  return (
    <section
      id="prenota"
      className={cn(
        'scroll-mt-28 overflow-hidden rounded-[1.75rem] border border-border/50 bg-card shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)]',
        className
      )}
    >
      <div className="border-b border-border/40 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Prenota
        </p>
        <h2 className="mt-0.5 font-display text-xl font-semibold tracking-tight">
          Voli, hotel e attività
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tariffe LiteAPI sul contesto di questo viaggio.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border/40 px-3 pt-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-t-xl px-2 py-2.5 text-xs font-semibold transition',
              tab === id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        {!isAuthenticated ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-border/70 px-4 py-5 text-center">
            <p className="text-sm text-muted-foreground">
              Accedi per cercare e prenotare con LiteAPI.
            </p>
            <Button asChild className="rounded-full">
              <Link href={`/?callbackUrl=${encodeURIComponent(`/viaggi/${tripId}#prenota`)}`}>
                Accedi
              </Link>
            </Button>
          </div>
        ) : tab === 'voli' ? (
          <TripFlightBookSearch
            destination={destination}
            startDate={startDate}
            endDate={endDate}
            defaultOriginIata={defaultOriginIata()}
            adults={Math.min(9, Math.max(1, adults))}
          />
        ) : tab === 'hotel' ? (
          <LiteApiHotelSearch
            defaultCity={city}
            defaultCountry={country}
            defaultCheckin={startDate}
            defaultCheckout={endDate}
            defaultAdults={Math.min(9, Math.max(1, adults))}
            compact
          />
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Le attività dell’itinerario. Il checkout ticket partner arriverà dopo; per ora
              puoi cercare biglietti esterni.
            </p>
            {activityStops.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 px-3 py-3 text-sm text-muted-foreground">
                Nessuna attività nell’itinerario ancora.
              </p>
            ) : (
              <ul className="space-y-2">
                {activityStops.map((stop) => (
                  <li
                    key={stop.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{stop.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Giorno {stop.dayIndex} · {stop.dayDate}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full">
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(
                          `biglietti ${stop.title} ${destination}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Cerca
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Strip CTA sotto hero — scrolla al pannello Prenota. */
export function TripBookingCtaStrip({ className }: { className?: string }) {
  const go = (tab: BookingTab) => {
    const hash =
      tab === 'voli'
        ? 'prenota-voli'
        : tab === 'hotel'
          ? 'prenota-hotel'
          : 'prenota-attivita';
    window.location.hash = hash;
    document.getElementById('prenota')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 bg-card/95 px-4 py-3 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.4)] backdrop-blur',
        className
      )}
    >
      <p className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Prenota
      </p>
      {TABS.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-full"
          onClick={() => go(id)}
        >
          <Icon className="mr-1.5 h-3.5 w-3.5 text-accent" />
          {label}
        </Button>
      ))}
    </div>
  );
}
