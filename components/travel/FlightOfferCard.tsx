'use client';

import { format } from 'date-fns';
import { Clock3, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatLayoversLine,
  hasLongLayover,
  type FlightLayover,
} from '@/lib/liteapi/flight-layovers';

export type FlightOfferCardData = {
  offerId: string;
  price: number;
  currency: string;
  origin: string;
  destination: string;
  airline: string | null;
  airlineCode?: string | null;
  airlineLogo?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  durationMinutes?: number | null;
  stops?: number;
  layovers?: FlightLayover[];
  cabinClass?: string | null;
  flightNumber?: string | null;
};

function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = Date.parse(iso);
  if (!Number.isFinite(d)) {
    if (/^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5);
    return '—';
  }
  return format(new Date(d), 'HH:mm');
}

function formatDuration(mins?: number | null): string {
  if (mins == null || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function stopsLabel(stops?: number, layovers?: FlightLayover[]): string {
  return formatLayoversLine(layovers) ?? (
    stops == null ? '' : stops <= 0 ? 'Diretto' : stops === 1 ? '1 scalo' : `${stops} scali`
  );
}

function AirlineBadge({
  name,
  code,
  logo,
  flightNumber,
  dark,
}: {
  name: string | null;
  code?: string | null;
  logo?: string | null;
  flightNumber?: string | null;
  dark?: boolean;
}) {
  const label = name || (code ? `Compagnia ${code}` : 'Compagnia aerea');
  const initials =
    (code || label).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'FL';

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className={cn(
            'h-10 w-10 shrink-0 rounded-xl object-contain p-1',
            dark ? 'border border-white/15 bg-white/10' : 'border border-slate-100 bg-slate-50'
          )}
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b3d91] text-xs font-bold text-white">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className={cn('truncate text-sm font-semibold', dark ? 'text-white' : 'text-slate-900')}>
          {label}
        </p>
        <p className={cn('truncate text-[11px]', dark ? 'text-white/45' : 'text-slate-500')}>
          {[code, flightNumber].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
    </div>
  );
}

export function FlightOfferCard({
  offer,
  kicker = 'Volo',
  dark,
  saved,
  priceNote = 'a persona',
  actionLabel,
  onAction,
}: {
  offer: FlightOfferCardData;
  kicker?: string;
  dark?: boolean;
  saved?: boolean;
  priceNote?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl ring-1 transition',
        dark
          ? saved
            ? 'bg-accent/12 ring-accent/50'
            : 'bg-white/[0.04] ring-white/10 hover:bg-white/[0.07] hover:ring-white/20'
          : 'rounded-3xl bg-slate-50/80 ring-slate-100 hover:bg-white hover:ring-slate-200'
      )}
    >
      <div
        className={cn(
          'border-b px-4 py-2 sm:px-5',
          dark ? 'border-white/8' : 'border-slate-100/80'
        )}
      >
        <p
          className={cn(
            'text-[11px] font-semibold uppercase tracking-[0.18em]',
            dark ? 'text-white/45' : 'text-slate-500'
          )}
        >
          {saved ? 'Salvata per il gruppo' : kicker}
        </p>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[200px_1fr_150px] sm:items-center sm:p-5">
        <AirlineBadge
          name={offer.airline}
          code={offer.airlineCode}
          logo={offer.airlineLogo}
          flightNumber={offer.flightNumber}
          dark={dark}
        />

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="min-w-[64px] text-center">
            <p
              className={cn(
                'font-display text-2xl font-semibold tabular-nums',
                dark ? 'text-white' : 'text-slate-900'
              )}
            >
              {formatTime(offer.departureAt)}
            </p>
            <p className={cn('text-xs font-semibold', dark ? 'text-white/50' : 'text-slate-500')}>
              {offer.origin}
            </p>
          </div>

          <div className="min-w-[96px] flex-1 px-1">
            <p
              className={cn(
                'mb-1 flex items-center justify-center gap-1 text-[11px]',
                dark ? 'text-white/45' : 'text-slate-500'
              )}
            >
              <Clock3 className="h-3 w-3" />
              {formatDuration(offer.durationMinutes)}
            </p>
            <div className={cn('relative h-px', dark ? 'bg-white/15' : 'bg-slate-200')}>
              <Plane
                className={cn(
                  'absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-90',
                  dark ? 'text-accent' : 'text-primary'
                )}
              />
            </div>
            <p
              className={cn(
                'mt-1 text-center text-[11px] font-medium',
                hasLongLayover(offer.layovers)
                  ? dark
                    ? 'text-amber-300'
                    : 'text-amber-700'
                  : dark
                    ? 'text-white/50'
                    : 'text-slate-500'
              )}
            >
              {stopsLabel(offer.stops, offer.layovers)}
              {offer.cabinClass ? ` · ${offer.cabinClass}` : ''}
            </p>
          </div>

          <div className="min-w-[64px] text-center">
            <p
              className={cn(
                'font-display text-2xl font-semibold tabular-nums',
                dark ? 'text-white' : 'text-slate-900'
              )}
            >
              {formatTime(offer.arrivalAt)}
            </p>
            <p className={cn('text-xs font-semibold', dark ? 'text-white/50' : 'text-slate-500')}>
              {offer.destination}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex flex-row items-center justify-between gap-3 border-t pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0',
            dark ? 'border-white/8' : 'border-slate-100'
          )}
        >
          <div className="text-right">
            <p
              className={cn(
                'font-display text-2xl font-semibold tabular-nums',
                dark ? 'text-white' : 'text-slate-900'
              )}
            >
              {offer.price.toLocaleString('it-IT', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
              <span
                className={cn(
                  'ml-1 text-sm font-medium',
                  dark ? 'text-white/50' : 'text-slate-500'
                )}
              >
                {offer.currency}
              </span>
            </p>
            <p className={cn('text-[11px]', dark ? 'text-white/40' : 'text-slate-400')}>{priceNote}</p>
          </div>
          <Button
            type="button"
            className={cn(
              'px-5 font-semibold',
              dark
                ? saved
                  ? 'rounded-full bg-white/12 text-white hover:bg-white/18'
                  : 'rounded-full bg-accent text-[#0b1220] hover:bg-accent/90'
                : 'rounded-xl bg-primary hover:bg-primary/90'
            )}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </article>
  );
}
