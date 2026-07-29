'use client';

import { useEffect, useState } from 'react';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type FlightDateFieldProps = {
  /** stay = hotel check-in/out · activity = periodo esperienze · voli = oneway/roundtrip */
  tripType: 'oneway' | 'roundtrip' | 'stay' | 'activity';
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  className?: string;
};

function toDate(value: string): Date | undefined {
  if (!value) return undefined;
  const d = parseISO(value);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

export function FlightDateField({
  tripType,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}: FlightDateFieldProps) {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const start = toDate(startDate);
  const end = toDate(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const apply = () => setMonths(mq.matches ? 2 : 1);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const isStay = tripType === 'stay';
  const isActivity = tripType === 'activity';
  const isRange = tripType === 'roundtrip' || isStay || isActivity;

  const label =
    tripType === 'oneway'
      ? start
        ? format(start, 'EEE d MMM yyyy', { locale: it })
        : 'Scegli data andata'
      : start && end
        ? `${format(start, 'd MMM', { locale: it })} – ${format(end, 'd MMM yyyy', { locale: it })}`
        : start
          ? isStay
            ? `${format(start, 'd MMM', { locale: it })} – check-out`
            : isActivity
              ? `${format(start, 'd MMM', { locale: it })} – fine`
              : `${format(start, 'd MMM', { locale: it })} – ritorno`
          : isStay
            ? 'Check-in – check-out'
            : isActivity
              ? 'Dal – al'
              : 'Andata – ritorno';

  const fieldTitle = tripType === 'oneway' ? 'Data' : isStay ? 'Soggiorno' : 'Date';
  const fieldHint =
    tripType === 'oneway'
      ? 'Solo andata'
      : isStay
        ? 'Check-in e check-out'
        : isActivity
          ? 'Periodo esperienze'
          : 'Andata e ritorno';
  const calendarTitle = isStay
    ? 'Calendario soggiorno'
    : isActivity
      ? 'Calendario esperienze'
      : 'Calendario voli';

  /** Niente evidenziazione “oggi” (underline / accent) */
  const todayClassNames = {
    today: 'bg-transparent text-foreground rounded-md',
  };

  return (
    <div className={cn('space-y-1', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {fieldTitle}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-12 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left transition',
              'hover:border-slate-300 hover:bg-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary',
              open && 'border-primary bg-white ring-2 ring-primary/20'
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold capitalize text-slate-900">
                {label}
              </span>
              <span className="block text-[11px] text-slate-500">{fieldHint}</span>
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto overflow-hidden rounded-2xl border-slate-200 p-0 shadow-2xl shadow-slate-900/15"
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-[oklch(0.22_0.05_220)] to-primary px-4 py-3 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
              {calendarTitle}
            </p>
            <p className="mt-0.5 text-sm font-semibold capitalize">{label}</p>
          </div>

          {!isRange ? (
            <Calendar
              mode="single"
              locale={it}
              selected={start}
              defaultMonth={start ?? today}
              disabled={{ before: today }}
              onSelect={(d) => {
                if (!d) return;
                onStartDateChange(format(d, 'yyyy-MM-dd'));
                setOpen(false);
              }}
              className="p-3"
              classNames={todayClassNames}
            />
          ) : (
            <Calendar
              mode="range"
              locale={it}
              numberOfMonths={months}
              selected={
                start ? ({ from: start, to: end } satisfies DateRange) : undefined
              }
              defaultMonth={start ?? today}
              disabled={{ before: today }}
              onSelect={(range) => {
                if (!range?.from) return;
                const fromIso = format(range.from, 'yyyy-MM-dd');
                onStartDateChange(fromIso);
                if (range.to) {
                  // Hotel: checkout non può essere lo stesso giorno del check-in
                  const to =
                    isStay && isSameDay(range.to, range.from)
                      ? addDays(range.from, 1)
                      : range.to;
                  onEndDateChange(format(to, 'yyyy-MM-dd'));
                  setOpen(false);
                } else if (isStay) {
                  // Prima selezione: checkout = giorno successivo
                  onEndDateChange(format(addDays(range.from, 1), 'yyyy-MM-dd'));
                } else {
                  onEndDateChange('');
                }
              }}
              className="p-3"
              classNames={todayClassNames}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
