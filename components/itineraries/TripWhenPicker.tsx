'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, nextFriday, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { it as itDayPicker } from 'react-day-picker/locale';
import type { DateRange } from 'react-day-picker';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Palmtree,
  PartyPopper,
  Mountain,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  pickTemplateForTrip,
  templateWithFittedDays,
  type TripVibe,
} from '@/lib/itineraries/fit';
import type { ItineraryTemplate } from '@/lib/itineraries/types';
import { cn } from '@/lib/utils';

const VIBES: {
  id: TripVibe;
  label: string;
  hint: string;
  icon: typeof Palmtree;
}[] = [
  { id: 'relax', label: 'Relax', hint: 'Ritmo lento, spiaggia e buffer', icon: Palmtree },
  { id: 'divertimento', label: 'Divertimento', hint: 'Città, cibo, serate', icon: PartyPopper },
  { id: 'avventura', label: 'Avventura', hint: 'Nord, trekking, più tappe', icon: Mountain },
];

const calendarClassNames = {
  months: 'flex w-full flex-col gap-6 md:flex-row md:gap-8',
  month: 'w-full space-y-3',
  month_caption: 'relative mb-2 flex h-10 items-center justify-center',
  caption_label: 'text-base font-semibold capitalize text-slate-900',
  nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
  weekday: 'flex-1 text-center text-[0.65rem] font-bold uppercase tracking-wider text-slate-400',
  week: 'mt-1 flex w-full',
  day: 'aspect-square flex-1 p-0',
  range_start: 'rounded-l-full bg-primary/15',
  range_middle: 'rounded-none bg-primary/10',
  range_end: 'rounded-r-full bg-primary/15',
  today: 'font-bold text-primary',
  outside: 'text-slate-300 opacity-50',
  disabled: 'text-slate-200 opacity-40',
} as const;

export type TripWhenSelection = {
  dateFrom: Date;
  dateTo: Date;
  tripDays: number;
  vibe: TripVibe;
  template: ItineraryTemplate;
  flexible: boolean;
};

type Props = {
  destinationSlug: string;
  baseTemplate: ItineraryTemplate;
  value: TripWhenSelection | null;
  onChange: (next: TripWhenSelection | null) => void;
};

export function TripWhenPicker({ destinationSlug, baseTemplate, value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [flexible, setFlexible] = useState(true);
  const [vibe, setVibe] = useState<TripVibe>(value?.vibe ?? 'relax');
  const [monthCount, setMonthCount] = useState(1);
  const [range, setRange] = useState<DateRange | undefined>(() =>
    value
      ? { from: value.dateFrom, to: value.dateTo }
      : undefined
  );
  const [single, setSingle] = useState<Date | undefined>(value?.dateFrom);

  const fridayHints = useMemo(() => {
    const first = nextFriday(startOfDay(new Date()));
    return [0, 1, 2, 3].map((w) => addDays(first, w * 7));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setMonthCount(mq.matches ? 2 : 1);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const applySelection = (
    from: Date,
    to: Date,
    isFlexible: boolean,
    vibeOverride?: TripVibe
  ) => {
    const activeVibe = vibeOverride ?? vibe;
    const tripDays = differenceInCalendarDays(to, from) + 1;
    if (tripDays < 3) return;
    const picked = pickTemplateForTrip(destinationSlug, tripDays, activeVibe) ?? baseTemplate;
    const fitted = templateWithFittedDays(picked, tripDays);
    onChange({
      dateFrom: from,
      dateTo: to,
      tripDays,
      vibe: activeVibe,
      template: fitted,
      flexible: isFlexible,
    });
  };

  const onVibePick = (next: TripVibe) => {
    setVibe(next);
    const from = range?.from ?? single;
    const to =
      range?.to ??
      (from && !flexible ? addDays(from, baseTemplate.duration_days - 1) : undefined);
    if (from && to) applySelection(from, to, flexible, next);
  };

  const onRangeSelect = (next: DateRange | undefined) => {
    setRange(next);
    if (next?.from && next?.to) {
      applySelection(next.from, next.to, true);
    } else if (next?.from) {
      onChange(null);
    }
  };

  const onSingleSelect = (d: Date | undefined) => {
    setSingle(d);
    if (!d) {
      onChange(null);
      return;
    }
    const to = addDays(d, baseTemplate.duration_days - 1);
    setRange({ from: d, to });
    applySelection(d, to, false);
  };

  const switchMode = (nextFlexible: boolean) => {
    setFlexible(nextFlexible);
    if (nextFlexible && range?.from && range?.to) {
      applySelection(range.from, range.to, true);
    } else if (!nextFlexible && single) {
      onSingleSelect(single);
    } else {
      onChange(null);
    }
  };

  const summary = value
    ? `${format(value.dateFrom, 'd MMM', { locale: it })} → ${format(value.dateTo, 'd MMM yyyy', { locale: it })} · ${value.tripDays} giorni`
    : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-900">Che vibe cerchi?</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {VIBES.map((v) => {
            const Icon = v.icon;
            const active = vibe === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onVibePick(v.id)}
                className={cn(
                  'rounded-2xl border px-3 py-3 text-left transition',
                  active
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-slate-200 bg-white hover:border-primary/40'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-slate-400')} />
                <p className="mt-2 text-sm font-semibold text-slate-900">{v.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{v.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchMode(true)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
            flexible
              ? 'bg-primary text-white'
              : 'border border-slate-200 bg-slate-50 text-slate-800'
          )}
        >
          Partenza e rientro liberi
        </button>
        <button
          type="button"
          onClick={() => switchMode(false)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
            !flexible
              ? 'bg-primary text-white'
              : 'border border-slate-200 bg-slate-50 text-slate-800'
          )}
        >
          Partenza + {baseTemplate.duration_days} giorni
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {expanded ? 'Scegli le date' : 'Date rapide'}
            </p>
            {summary ? (
              <p className="truncate text-xs text-slate-500">{summary}</p>
            ) : (
              <p className="text-xs text-slate-500">
                {flexible
                  ? 'Tocca partenza e rientro sul calendario'
                  : 'Un venerdì o un giorno qualsiasi'}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-slate-700"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? (
              <>
                Comprimi <ChevronUp className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Calendario <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {!expanded ? (
          <div className="space-y-3 px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {fridayHints.map((d) => {
                const active =
                  value &&
                  format(value.dateFrom, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd');
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => {
                      if (flexible) {
                        const to = addDays(d, 13);
                        setRange({ from: d, to });
                        applySelection(d, to, true);
                      } else {
                        onSingleSelect(d);
                      }
                      setExpanded(true);
                    }}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                      active
                        ? 'bg-primary text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-800 hover:border-primary'
                    )}
                  >
                    Ven {format(d, 'd MMM', { locale: it })}
                  </button>
                );
              })}
            </div>
            {value ? (
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {format(value.dateFrom, 'EEEE d MMMM', { locale: it })} →{' '}
                    {format(value.dateTo, 'EEEE d MMMM yyyy', { locale: it })}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Piano adattato · {value.tripDays} giorni · vibe {value.vibe}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="p-4 md:p-5">
            {flexible ? (
              <Calendar
                mode="range"
                locale={itDayPicker}
                numberOfMonths={monthCount}
                selected={range}
                onSelect={onRangeSelect}
                disabled={(d) => d < startOfDay(new Date())}
                defaultMonth={range?.from ?? fridayHints[0]}
                className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-2 text-slate-900 [--cell-size:2.5rem] sm:[--cell-size:2.85rem]"
                classNames={calendarClassNames}
              />
            ) : (
              <Calendar
                mode="single"
                locale={itDayPicker}
                numberOfMonths={monthCount}
                selected={single}
                onSelect={onSingleSelect}
                disabled={(d) => d < startOfDay(new Date())}
                defaultMonth={single ?? fridayHints[0]}
                className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-2 text-slate-900 [--cell-size:2.5rem] sm:[--cell-size:2.85rem]"
                classNames={calendarClassNames}
              />
            )}
            {value && value.tripDays !== value.template.duration_days ? (
              <p className="mt-3 text-center text-xs text-slate-500">
                Abbiamo rimodulato il piano da {value.template.duration_days} a {value.tripDays}{' '}
                giorni (tolti buffer e tappe secondarie).
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
