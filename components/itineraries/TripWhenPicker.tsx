'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  nextFriday,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { it as itDayPicker } from 'react-day-picker/locale';
import type { DateRange } from 'react-day-picker';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

export const TRIP_VIBES: {
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
  root: 'w-full min-w-0',
  months: 'relative flex w-full min-w-0 flex-col gap-6 2xl:flex-row 2xl:gap-8',
  month: 'w-full min-w-0 space-y-3',
  // MonthGrid è un <table>: table-fixed tiene 7 colonne a larghezza uguale.
  // Non usare display:grid su <tr> — collassa i giorni a sinistra (es. "282930").
  month_grid: 'w-full min-w-0 table-fixed border-collapse',
  month_caption:
    'pointer-events-none relative z-0 mb-2 flex h-11 items-center justify-center px-12',
  caption_label: 'truncate text-sm font-semibold capitalize text-slate-900 sm:text-base',
  nav: 'absolute inset-x-0 top-0 z-20 flex items-center justify-between',
  button_previous: 'pointer-events-auto z-20',
  button_next: 'pointer-events-auto z-20',
  weekdays: 'mb-1 w-full',
  weekday:
    'w-[14.2857%] p-0 text-center text-[0.72rem] font-semibold uppercase tracking-normal text-slate-700 sm:text-[0.8rem]',
  week: 'mt-1 w-full',
  day: 'h-auto w-[14.2857%] p-0 align-middle',
  day_button: 'h-full min-h-11 w-full min-w-0',
  range_start: 'rounded-l-full bg-primary/15',
  range_middle: 'rounded-none bg-primary/10',
  range_end: 'rounded-r-full bg-primary/15',
  today: 'font-semibold text-primary ring-1 ring-primary/40',
  outside: 'text-slate-400 opacity-70',
  disabled: 'text-slate-400 opacity-55',
} as const;

const CALENDAR_LABELS = {
  labelNext: () => 'Vai al mese successivo',
  labelPrevious: () => 'Vai al mese precedente',
  labelMonthDropdown: () => 'Scegli il mese',
  labelYearDropdown: () => 'Scegli l’anno',
} as const;

/** Una lettera: evita LUNMARMER… schiacciati nelle celle strette. */
const WEEKDAY_SHORT = ['L', 'M', 'M', 'G', 'V', 'S', 'D'] as const;

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
  /** Se false, la vibe è gestita dal parent. */
  showVibe?: boolean;
  vibe?: TripVibe | null;
  defaultExpanded?: boolean;
};

export function TripWhenPicker({
  destinationSlug,
  baseTemplate,
  value,
  onChange,
  showVibe = true,
  vibe: vibeProp,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [flexible, setFlexible] = useState(true);
  const [internalVibe, setInternalVibe] = useState<TripVibe>(value?.vibe ?? 'relax');
  const vibe = showVibe ? internalVibe : (vibeProp ?? value?.vibe ?? null);
  const [monthCount, setMonthCount] = useState(1);
  const bookingStart = startOfMonth(new Date());
  const bookingEnd = addMonths(bookingStart, 18);
  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => value?.dateFrom ?? nextFriday(startOfDay(new Date()))
  );
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
    const mq = window.matchMedia('(min-width: 1536px)');
    const apply = () => setMonthCount(mq.matches ? 2 : 1);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const applySelection = (
    from: Date,
    to: Date,
    isFlexible: boolean,
    vibeOverride?: TripVibe | null
  ) => {
    const activeVibe = vibeOverride ?? vibe;
    const tripDays = differenceInCalendarDays(to, from) + 1;
    if (tripDays < 3) return;
    const picked =
      pickTemplateForTrip(destinationSlug, tripDays, activeVibe ?? undefined) ?? baseTemplate;
    const fitted = templateWithFittedDays(picked, tripDays);
    onChange({
      dateFrom: from,
      dateTo: to,
      tripDays,
      vibe: activeVibe ?? 'relax',
      template: fitted,
      flexible: isFlexible,
    });
  };

  const onVibePick = (next: TripVibe) => {
    setInternalVibe(next);
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
      {showVibe ? (
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-900">Che vibe cerchi?</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {TRIP_VIBES.map((v) => {
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
      ) : null}

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

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white">
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
          <div className="min-w-0 p-4 sm:p-5">
            <p className="mb-3 text-center text-xs text-slate-600">
              Date selezionabili da oggi fino a{' '}
              {format(bookingEnd, 'MMMM yyyy', { locale: it })}. I giorni passati
              non sono cliccabili.
            </p>
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Vai al mese precedente"
                disabled={
                  startOfMonth(displayMonth).getTime() <= bookingStart.getTime()
                }
                onClick={() =>
                  setDisplayMonth((m) => {
                    const prev = addMonths(startOfMonth(m), -1);
                    return prev < bookingStart ? bookingStart : prev;
                  })
                }
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold capitalize text-slate-900 sm:text-base">
                {format(displayMonth, 'MMMM yyyy', { locale: it })}
                {monthCount > 1
                  ? ` – ${format(addMonths(displayMonth, 1), 'MMMM yyyy', { locale: it })}`
                  : ''}
              </p>
              <button
                type="button"
                aria-label="Vai al mese successivo"
                disabled={
                  startOfMonth(addMonths(displayMonth, monthCount)).getTime() >
                  startOfMonth(bookingEnd).getTime()
                }
                onClick={() =>
                  setDisplayMonth((m) => {
                    const next = addMonths(startOfMonth(m), 1);
                    const lastAllowed = startOfMonth(
                      addMonths(bookingEnd, 1 - monthCount)
                    );
                    return next > lastAllowed ? lastAllowed : next;
                  })
                }
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {flexible ? (
              <Calendar
                mode="range"
                locale={itDayPicker}
                labels={CALENDAR_LABELS}
                hideNavigation
                numberOfMonths={monthCount}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                startMonth={bookingStart}
                endMonth={bookingEnd}
                selected={range}
                onSelect={onRangeSelect}
                disabled={(d) => d < startOfDay(new Date()) || d > bookingEnd}
                formatters={{
                  formatWeekdayName: (date) => WEEKDAY_SHORT[(date.getDay() + 6) % 7]!,
                }}
                className="mx-auto w-full min-w-0 rounded-2xl bg-white p-1 text-slate-900 [--cell-size:2.75rem] sm:[--cell-size:2.5rem] [&_button[data-day]]:min-w-0"
                classNames={calendarClassNames}
              />
            ) : (
              <Calendar
                mode="single"
                locale={itDayPicker}
                labels={CALENDAR_LABELS}
                hideNavigation
                numberOfMonths={monthCount}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                startMonth={bookingStart}
                endMonth={bookingEnd}
                selected={single}
                onSelect={onSingleSelect}
                disabled={(d) => d < startOfDay(new Date()) || d > bookingEnd}
                formatters={{
                  formatWeekdayName: (date) => WEEKDAY_SHORT[(date.getDay() + 6) % 7]!,
                }}
                className="mx-auto w-full min-w-0 rounded-2xl bg-white p-1 text-slate-900 [--cell-size:2.75rem] sm:[--cell-size:2.5rem] [&_button[data-day]]:min-w-0"
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
