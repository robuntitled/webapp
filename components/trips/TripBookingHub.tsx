'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { BedDouble, Car, Plane, Ticket } from 'lucide-react';
import type { BookingTab } from '@/components/trips/TripBookingPanel';
import { TripBookingPanel } from '@/components/trips/TripBookingPanel';
import { SavedTripBookables } from '@/components/trips/SavedTripBookables';
import { picksFromItinerary } from '@/lib/composer/bookable-picks';
import { BLOCK_META } from '@/lib/composer/blocks';
import type { ComposerDayRow } from '@/lib/data/composer';
import type { ComposerBookablePick } from '@/types/composer';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { cn } from '@/lib/utils';

const TABS: {
  id: BookingTab;
  label: string;
  kicker: string;
  icon: typeof Plane;
  cover: string;
  empty: string;
}[] = [
  {
    id: 'voli',
    label: 'Voli',
    kicker: 'In aria',
    icon: Plane,
    cover:
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80',
    empty: 'Nessun volo salvato. Cerca quando il gruppo è solido.',
  },
  {
    id: 'hotel',
    label: 'Hotel',
    kicker: 'Dormi qui',
    icon: BedDouble,
    cover:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80',
    empty: 'Nessun hotel salvato. Le tariffe live arrivano dopo.',
  },
  {
    id: 'auto',
    label: 'Auto',
    kicker: 'Su strada',
    icon: Car,
    cover:
      'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80',
    empty: 'Nessun noleggio salvato.',
  },
  {
    id: 'attivita',
    label: 'Attività',
    kicker: 'Da fare',
    icon: Ticket,
    cover:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80',
    empty: 'Nessuna attività salvata in creazione.',
  },
];

function parseHashTab(hash: string): BookingTab | null {
  const h = hash.replace(/^#/, '').toLowerCase();
  if (h === 'prenota-voli' || h === 'prenota-flight') return 'voli';
  if (h === 'prenota-hotel') return 'hotel';
  if (h === 'prenota-auto' || h === 'prenota-cars') return 'auto';
  if (h === 'prenota-attivita' || h === 'prenota-activity') return 'attivita';
  if (h === 'prenota') return 'voli';
  return null;
}

function hashForTab(tab: BookingTab): string {
  if (tab === 'voli') return 'prenota-voli';
  if (tab === 'hotel') return 'prenota-hotel';
  if (tab === 'auto') return 'prenota-auto';
  return 'prenota-attivita';
}

function blockTitle(content: Record<string, unknown>, type: string): string {
  if (typeof content.title === 'string' && content.title) return content.title;
  return BLOCK_META[type as keyof typeof BLOCK_META]?.label ?? type;
}

function displayPicksFromItinerary(days: ComposerDayRow[]): ComposerBookablePick[] {
  const fromGeo = picksFromItinerary(days);
  const seen = new Set(fromGeo.map((p) => p.blockId ?? p.id));
  const extra: ComposerBookablePick[] = [];

  for (const day of days) {
    for (const block of day.trip_blocks) {
      if (seen.has(block.id)) continue;
      const type = block.block_type;
      if (type !== 'flight' && type !== 'hotel' && type !== 'activity' && type !== 'attraction') {
        continue;
      }
      const content = block.content;
      extra.push({
        id: block.id,
        kind: type,
        provider:
          typeof content.productCode === 'string' ||
          (typeof content.bookingUrl === 'string' && content.bookingUrl.includes('viator'))
            ? 'viator'
            : typeof content.hotelId === 'string' || typeof content.offerId === 'string'
              ? 'liteapi'
              : 'google',
        title: blockTitle(content, type),
        photoUrl: typeof content.photoUrl === 'string' ? content.photoUrl : null,
        price: typeof content.price === 'number' ? content.price : null,
        currency: typeof content.currency === 'string' ? content.currency : 'EUR',
        dayIndex: day.day_index,
        blockId: block.id,
        hotelId: typeof content.hotelId === 'string' ? content.hotelId : null,
        offerId: typeof content.offerId === 'string' ? content.offerId : null,
        bookingUrl: typeof content.bookingUrl === 'string' ? content.bookingUrl : null,
        productCode: typeof content.productCode === 'string' ? content.productCode : null,
      });
    }
  }

  return [...fromGeo, ...extra];
}

function picksForTab(picks: ComposerBookablePick[], tab: BookingTab): ComposerBookablePick[] {
  if (tab === 'voli') return picks.filter((p) => p.kind === 'flight');
  if (tab === 'hotel') return picks.filter((p) => p.kind === 'hotel');
  if (tab === 'auto') return [];
  return picks.filter((p) => p.kind === 'activity' || p.kind === 'attraction');
}

type TripBookingHubProps = {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults?: number;
  isAuthenticated: boolean;
  bookerEmail?: string;
  bookerName?: string;
  composerItinerary?: ComposerDayRow[] | null;
  canBook: boolean;
  lockReason?: string;
};

export function TripBookingHub({
  tripId,
  destination,
  startDate,
  endDate,
  adults = 2,
  isAuthenticated,
  bookerEmail = '',
  bookerName = '',
  composerItinerary,
  canBook,
  lockReason,
}: TripBookingHubProps) {
  const [tab, setTab] = useState<BookingTab>('voli');
  const defaultedTab = useRef(false);

  const savedPicks = useMemo(
    () => displayPicksFromItinerary(composerItinerary ?? []),
    [composerItinerary]
  );

  const grouped = useMemo(
    () => ({
      voli: picksForTab(savedPicks, 'voli'),
      hotel: picksForTab(savedPicks, 'hotel'),
      auto: picksForTab(savedPicks, 'auto'),
      attivita: picksForTab(savedPicks, 'attivita'),
    }),
    [savedPicks]
  );

  const selectTab = useCallback((next: BookingTab) => {
    setTab(next);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${hashForTab(next)}`);
    }
  }, []);

  useEffect(() => {
    const fromHash = parseHashTab(window.location.hash);
    const apply = () => {
      const next = parseHashTab(window.location.hash);
      if (next) setTab(next);
    };
    apply();
    if (!fromHash && !defaultedTab.current) {
      defaultedTab.current = true;
      const firstWithItems = TABS.find((t) => grouped[t.id].length > 0);
      if (firstWithItems) setTab(firstWithItems.id);
    }
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [grouped]);

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const activePicks = grouped[tab];

  return (
    <section id="prenota" className="scroll-mt-24 space-y-4">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
          Prenota
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Già scelti. Prenota questi.
        </h2>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
          {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.notAPackage}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TABS.map((item) => {
          const Icon = item.icon;
          const picks = grouped[item.id];
          const cover = picks[0]?.photoUrl || item.cover;
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={cn(
                'group relative min-h-[148px] overflow-hidden rounded-3xl text-left shadow-[0_22px_44px_-28px_rgba(0,0,0,0.65)] transition duration-300',
                selected
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-background scale-[1.01]'
                  : 'ring-1 ring-black/10 hover:ring-accent/40'
              )}
            >
              <Image
                src={item.cover}
                alt=""
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              {cover !== item.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
              <Icon className="absolute right-3 top-3 h-5 w-5 text-white/70" />
              <div className="relative z-10 flex h-full min-h-[148px] flex-col justify-end p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                  {picks.length > 0
                    ? `${picks.length} ${picks.length === 1 ? 'salvato' : 'salvati'}`
                    : item.kicker}
                </p>
                <p className="font-display text-xl font-semibold text-white">{item.label}</p>
                <p className="mt-0.5 truncate text-xs text-white/80">
                  {picks[0]?.title ?? 'Ancora da cercare'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)]">
        <div className="border-b border-border/40 px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {active.label}
          </p>
          <h3 className="mt-0.5 font-display text-xl font-semibold tracking-tight">
            {activePicks.length > 0
              ? 'Salvati su questo viaggio'
              : `Cerca ${active.label.toLowerCase()}`}
          </h3>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          {activePicks.length > 0 ? (
            <div>
              <SavedTripBookables
                picks={activePicks}
                startDate={startDate}
                endDate={endDate}
                adults={Math.min(9, Math.max(1, adults))}
                allowCheckout={canBook && isAuthenticated}
                layout="rail"
              />
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
              {active.empty}
            </p>
          )}

          {!canBook ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              {lockReason ?? 'Prenoti i servizi solo a gruppo formato.'}
            </p>
          ) : (
            <details className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                Cerca altri {active.label.toLowerCase()}
              </summary>
              <div className="mt-4">
                <TripBookingPanel
                  tripId={tripId}
                  destination={destination}
                  startDate={startDate}
                  endDate={endDate}
                  adults={adults}
                  isAuthenticated={isAuthenticated}
                  bookerEmail={bookerEmail}
                  bookerName={bookerName}
                  composerItinerary={composerItinerary}
                  mode="search"
                  tab={tab}
                />
              </div>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}
