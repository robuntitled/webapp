'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { TripMap } from '@/components/maps/TripMap';
import { buildPinsFromItinerary } from '@/lib/maps/pins';
import { BLOCK_META } from '@/lib/composer/blocks';
import { formatComposerDayLabel } from '@/lib/composer/days';
import type { ComposerDayRow } from '@/lib/data/composer';
import { cn } from '@/lib/utils';

type TripExperienceHubProps = {
  destination: string;
  description: string;
  composerItinerary: ComposerDayRow[] | null;
};

function blockTitle(content: Record<string, unknown>, type: string): string {
  const altId = content.selectedAlternativeId;
  const alts = content.alternatives as { id: string; label: string }[] | undefined;
  if (altId && Array.isArray(alts)) {
    const alt = alts.find((a) => a.id === altId);
    if (alt?.label) return alt.label;
  }
  if (typeof content.title === 'string' && content.title) return content.title;
  const meta = BLOCK_META[type as keyof typeof BLOCK_META];
  return meta?.label ?? type;
}

function blockPrice(content: Record<string, unknown>): number | null {
  const altId = content.selectedAlternativeId;
  const alts = content.alternatives as { id: string; price?: number }[] | undefined;
  if (altId && Array.isArray(alts)) {
    const alt = alts.find((a) => a.id === altId);
    if (alt?.price != null) return alt.price;
  }
  return typeof content.price === 'number' ? content.price : null;
}

function dayPreview(day: ComposerDayRow): string {
  const blocks = [...day.trip_blocks].sort((a, b) => a.sort_order - b.sort_order);
  if (!blocks.length) return 'Giornata libera';
  const labels = blocks.slice(0, 2).map((b) => blockTitle(b.content, b.block_type));
  const extra = blocks.length > 2 ? ` +${blocks.length - 2}` : '';
  return `${labels.join(' · ')}${extra}`;
}

function bookHashForType(type: string): string | null {
  if (type === 'flight') return 'prenota-voli';
  if (type === 'hotel') return 'prenota-hotel';
  if (type === 'activity' || type === 'attraction' || type === 'meal') {
    return 'prenota-attivita';
  }
  return null;
}

function goToBooking(hash: string) {
  window.location.hash = hash;
  document.getElementById('prenota')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function TripExperienceHub({
  destination,
  description,
  composerItinerary,
}: TripExperienceHubProps) {
  const days = composerItinerary ?? [];
  const pins = useMemo(
    () => (days.length > 0 ? buildPinsFromItinerary(destination, days) : []),
    [days, destination]
  );

  const [openDayId, setOpenDayId] = useState<string | null>(null);
  const activeDayIndex = useMemo(() => {
    if (!openDayId) return days[0]?.day_index ?? 1;
    return days.find((d) => d.id === openDayId)?.day_index ?? days[0]?.day_index ?? 1;
  }, [openDayId, days]);

  const toggle = (id: string) => {
    setOpenDayId((prev) => (prev === id ? null : id));
  };

  if (!days.length) {
    return (
      <section className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)]">
        <div className="border-b border-border/40 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Esperienza
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            Il viaggio
          </h2>
        </div>
        <div className="px-6 py-6">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">
            {description || 'Itinerario in preparazione.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)]">
      <div className="flex items-end justify-between gap-4 border-b border-border/40 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Itinerario
          </p>
          <h2 className="mt-0.5 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Mappa e giorni
          </h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 text-accent" />
          <span className="max-w-[140px] truncate sm:max-w-none">{destination}</span>
        </div>
      </div>

      <div className="relative border-b border-border/40">
        <TripMap
          destination={destination}
          pins={pins}
          activeDayIndex={activeDayIndex}
          className="h-[180px] w-full sm:h-[220px] md:h-[240px]"
          onPinClick={(pin) => {
            const day = days.find((d) => d.day_index === pin.dayIndex);
            if (day) setOpenDayId(day.id);
          }}
          showRoute={pins.length > 1}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
        {pins.length > 0 && (
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {Array.from(new Set(pins.map((p) => p.dayIndex)))
              .sort((a, b) => a - b)
              .map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const row = days.find((d) => d.day_index === day);
                    if (row) setOpenDayId(row.id);
                  }}
                  className={cn(
                    'pointer-events-auto rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-md transition',
                    activeDayIndex === day
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background/85 text-foreground hover:bg-background'
                  )}
                >
                  G{day}
                </button>
              ))}
          </div>
        )}
      </div>

      <ul className="divide-y divide-border/50">
        {days.map((day) => {
          const open = openDayId === day.id;
          const blocks = [...day.trip_blocks].sort(
            (a, b) => a.sort_order - b.sort_order
          );
          const count = blocks.length;

          return (
            <li key={day.id}>
              <button
                type="button"
                onClick={() => toggle(day.id)}
                aria-expanded={open}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5',
                  open ? 'bg-primary/[0.04]' : 'hover:bg-muted/30'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-semibold tabular-nums transition-colors',
                    open
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/70 text-primary/70'
                  )}
                >
                  {String(day.day_index).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-tight">
                    {day.title ?? `Giorno ${day.day_index}`}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {formatComposerDayLabel(day.day_date, day.day_index)}
                    {!open && (
                      <>
                        <span className="mx-1 opacity-40">·</span>
                        {dayPreview(day)}
                      </>
                    )}
                  </p>
                </div>
                <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">
                  {count === 0 ? 'libera' : `${count} tappe`}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    open && 'rotate-180'
                  )}
                />
              </button>

              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-300 ease-out',
                  open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                )}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-border/40 bg-muted/15 px-4 pb-3.5 pt-2 sm:px-5 sm:pl-[4.25rem]">
                    {blocks.length === 0 ? (
                      <p className="py-1.5 text-sm italic text-muted-foreground">
                        Giornata libera
                      </p>
                    ) : (
                      <ul className="space-y-0.5">
                        {blocks.map((block) => {
                          const meta =
                            BLOCK_META[block.block_type as keyof typeof BLOCK_META];
                          const price = blockPrice(block.content);
                          const bookHash = bookHashForType(block.block_type);
                          return (
                            <li
                              key={block.id}
                              className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-background/80"
                            >
                              <span className="min-w-0 truncate">
                                <span className="mr-2 opacity-65">
                                  {meta?.emoji ?? '•'}
                                </span>
                                {blockTitle(block.content, block.block_type)}
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                {price != null && (
                                  <span className="font-display text-xs font-semibold tabular-nums text-primary">
                                    {price}€
                                  </span>
                                )}
                                {bookHash && (
                                  <button
                                    type="button"
                                    className="rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary hover:border-accent/40 hover:bg-accent/5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      goToBooking(bookHash);
                                    }}
                                  >
                                    Prenota
                                  </button>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
