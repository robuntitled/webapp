'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import {
  Building2,
  Bus,
  ChevronLeft,
  ChevronRight,
  Landmark,
  MapPin,
  Plane,
  Ship,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ItineraryWorldMap } from '@/components/itineraries/ItineraryWorldMap';
import { ItineraryMapInset } from '@/components/itineraries/ItineraryMapInset';
import { ShareTripLink } from '@/components/itineraries/ShareTripLink';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import type { ItineraryDay, ItineraryTemplate } from '@/lib/itineraries/types';
import { cn } from '@/lib/utils';

function dayDateLabel(dateFrom: string, dayNumber: number) {
  return format(addDays(parseISO(dateFrom), dayNumber - 1), 'dd/MM');
}

function iconForDay(day: ItineraryDay): LucideIcon {
  if (day.is_arrival || day.is_departure || day.transfer === 'internal_flight') return Plane;
  if (day.transfer === 'bus') return Bus;
  if (day.transfer === 'ferry') return Ship;
  if (/templ|wat|palace|templi/i.test(`${day.title} ${day.description}`)) return Landmark;
  return Building2;
}

function iconForPoi(name: string, day: ItineraryDay): LucideIcon {
  if (/volo|arrivo|partenza|flight/i.test(name)) return Plane;
  if (/bus|traghetto|ferry|viaggio/i.test(name)) return Bus;
  if (/templ|wat|palace|templi/i.test(name)) return Landmark;
  return iconForDay(day);
}

function useVisibleTimelineCount() {
  const [count, setCount] = useState(4);

  useEffect(() => {
    const update = () => {
      if (window.matchMedia('(max-width: 639px)').matches) setCount(2);
      else if (window.matchMedia('(max-width: 1023px)').matches) setCount(3);
      else setCount(4);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return count;
}

export function EditionPlanExplorer({
  template,
  dateFrom,
  dateTo,
  shareUrl,
  shareTitle,
  shareMessage,
}: {
  template: ItineraryTemplate;
  dateFrom: string;
  dateTo: string;
  shareUrl: string;
  shareTitle: string;
  shareMessage: string;
}) {
  const firstDay = template.days[0]?.day_number ?? 1;
  const [activeDay, setActiveDay] = useState(firstDay);
  const [page, setPage] = useState(0);
  const visibleCount = useVisibleTimelineCount();

  const active = useMemo(
    () => template.days.find((d) => d.day_number === activeDay) ?? template.days[0],
    [activeDay, template.days]
  );

  const pageCount = Math.max(1, Math.ceil(template.days.length / visibleCount));

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    const idx = template.days.findIndex((d) => d.day_number === activeDay);
    if (idx >= 0) setPage(Math.floor(idx / visibleCount));
  }, [activeDay, template.days, visibleCount]);

  const pageDays = useMemo(() => {
    const start = page * visibleCount;
    return template.days.slice(start, start + visibleCount);
  }, [page, template.days, visibleCount]);

  const selectDay = useCallback((dayNumber: number) => {
    setActiveDay(dayNumber);
  }, []);

  const stops = useMemo(() => {
    if (!active) return [];
    const items: { label: string; Icon: LucideIcon }[] = [
      { label: active.description, Icon: iconForDay(active) },
      { label: active.area_segment, Icon: MapPin },
    ];
    for (const poi of active.pois) {
      items.push({ label: poi.name, Icon: iconForPoi(poi.name, active) });
    }
    return items;
  }, [active]);

  return (
    <div className="space-y-4">
      {/* ZONA 1 — Top bar */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-4 md:divide-x md:divide-y-0">
          <div className="space-y-3 p-4 md:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              Partenza ufficiale
            </p>
            <h1 className="font-display text-xl font-semibold leading-tight text-slate-900 md:text-2xl">
              {template.destination_name} · {template.duration_days} giorni
            </h1>
            <ShareTripLink url={shareUrl} title={shareTitle} message={shareMessage} />
          </div>

          <div className="space-y-1.5 p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</p>
            <p className="text-sm font-semibold text-slate-900">
              {format(parseISO(dateFrom), 'dd/MM/yyyy')} – {format(parseISO(dateTo), 'dd/MM/yyyy')}
            </p>
            <p className="text-xs leading-relaxed text-slate-600">
              Stesso piano. Date già fissate. Volo necessario.
            </p>
          </div>

          <div className="space-y-1.5 p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {COMPLIANCE_COPY.budgetLabel}
            </p>
            <p className="text-lg font-semibold text-slate-900">
              ~{template.budget_orientative_eur.total_hint.toLocaleString('it-IT')} € a persona
            </p>
          </div>

          <div className="space-y-1.5 p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Aree interesse
            </p>
            <p className="text-sm leading-relaxed text-slate-700">{template.summary}</p>
          </div>
        </div>
      </section>

      {/* ZONA 2 + 3 — Explorer panel */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f4f8f6] p-4 sm:p-5 md:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,42%)_minmax(0,58%)] lg:gap-6">
          {/* Mappa — sinistra */}
          <div className="order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white">
              <p className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Mappa dell&apos;itinerario
              </p>
              <div className="relative">
                <ItineraryWorldMap
                  template={template}
                  highlightedDay={activeDay}
                  staticMap
                  className="rounded-none border-0 shadow-none [&>div:last-child]:h-[min(52vh,420px)] sm:[&>div:last-child]:h-[min(56vh,480px)]"
                />
                <ItineraryMapInset template={template} />
              </div>
            </div>
          </div>

          {/* Timeline + tappe — destra */}
          <div className="order-1 space-y-5 lg:order-2">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="font-display text-base font-semibold text-slate-900 sm:text-lg">
                  Tappe del giorno selezionato
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Giorni precedenti"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-35"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Giorni successivi"
                    disabled={page >= pageCount - 1}
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-35"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}>
                  {pageDays.map((day) => {
                    const Icon = iconForDay(day);
                    const selected = day.day_number === activeDay;
                    return (
                      <button
                        key={day.day_number}
                        type="button"
                        onClick={() => selectDay(day.day_number)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition duration-150',
                          selected
                            ? 'border-primary/50 bg-primary/5 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-primary/30'
                        )}
                      >
                        <span className="text-xs font-medium text-slate-600">
                          {dayDateLabel(dateFrom, day.day_number)}
                        </span>
                        <Icon
                          className={cn('h-5 w-5', selected ? 'text-primary' : 'text-slate-500')}
                          aria-hidden
                        />
                        <span className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900">
                          {day.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative mx-2 mt-5 sm:mx-4">
                  <div className="absolute inset-x-0 top-[0.45rem] h-px bg-slate-200" aria-hidden />
                  <div
                    className="relative grid gap-3"
                    style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}
                  >
                    {pageDays.map((day) => {
                      const selected = day.day_number === activeDay;
                      return (
                        <button
                          key={`track-${day.day_number}`}
                          type="button"
                          onClick={() => selectDay(day.day_number)}
                          className="flex flex-col items-center gap-1.5 pt-0"
                          aria-label={`Giorno ${day.day_number}`}
                          aria-current={selected ? 'true' : undefined}
                        >
                          <span
                            className={cn(
                              'relative z-10 h-2.5 w-2.5 rounded-full border-2 border-white transition',
                              selected ? 'bg-primary shadow-[0_0_0_3px] shadow-primary/25' : 'bg-slate-300'
                            )}
                          />
                          <span
                            className={cn(
                              'text-[10px] font-semibold leading-none',
                              selected ? 'text-primary' : 'text-slate-500'
                            )}
                          >
                            Giorno {day.day_number}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Tappe del giorno selezionato
              </p>
              {active ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Giorno {active.day_number}
                    </p>
                    <h2 className="font-display text-xl font-semibold text-slate-900">{active.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{active.description}</p>
                  </div>
                  <ul className="space-y-2.5">
                    {stops.map((stop, i) => (
                      <li key={`${stop.label}-${i}`} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <stop.Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                        <span>{stop.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
