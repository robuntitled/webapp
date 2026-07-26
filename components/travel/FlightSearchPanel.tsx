'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowRightLeft,
  Clock3,
  Loader2,
  Plane,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type FlightOfferView = {
  offerId: string;
  price: number;
  currency: string;
  origin: string;
  destination: string;
  airline: string | null;
  airlineCode?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  durationMinutes?: number | null;
  stops?: number;
  cabinClass?: string | null;
};

type FlightSearchPanelProps = {
  /** Prefill da trip page */
  defaultOrigin?: string;
  defaultDestination?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  defaultAdults?: number;
  autoSearch?: boolean;
  className?: string;
};

function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = Date.parse(iso);
  if (!Number.isFinite(d)) {
    // già HH:mm?
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

function stopsLabel(stops?: number): string {
  if (stops == null) return '';
  if (stops <= 0) return 'Diretto';
  if (stops === 1) return '1 scalo';
  return `${stops} scali`;
}

function AirlineBadge({
  name,
  code,
}: {
  name: string | null;
  code?: string | null;
}) {
  const label = name || code || 'Volo';
  const initials = (code || label).slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b3d91] text-xs font-bold text-white">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
        {code ? (
          <p className="text-[11px] text-slate-500">{code}</p>
        ) : null}
      </div>
    </div>
  );
}

export function FlightSearchPanel({
  defaultOrigin = 'MIL',
  defaultDestination = 'Londra',
  defaultStartDate,
  defaultEndDate,
  defaultAdults = 1,
  autoSearch = true,
  className,
}: FlightSearchPanelProps) {
  const dateDefaults = useMemo(() => {
    const start = defaultStartDate
      ? parseISO(defaultStartDate)
      : addDays(new Date(), 21);
    const end = defaultEndDate ? parseISO(defaultEndDate) : addDays(start, 7);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [defaultStartDate, defaultEndDate]);

  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [startDate, setStartDate] = useState(dateDefaults.startDate);
  const [endDate, setEndDate] = useState(dateDefaults.endDate);
  const [adults, setAdults] = useState(defaultAdults);
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<FlightOfferView[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const search = useCallback(async () => {
    if (!origin.trim() || !destination.trim()) {
      toast.error('Inserisci partenza e destinazione');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        destination: destination.trim(),
        startDate,
        endDate,
        originIata: origin.trim().toUpperCase().slice(0, 3),
        adults: String(Math.min(9, Math.max(1, adults))),
        currency: 'EUR',
      });
      params.set('originIata', origin.trim());

      const res = await fetch(`/api/liteapi/flights/search?${params}`, {
        credentials: 'same-origin',
      });
      const data = (await res.json()) as {
        offers?: FlightOfferView[];
        message?: string;
        error?: string;
      };

      if (res.status === 401) {
        toast.error('Accedi per cercare voli');
        setOffers(null);
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca voli fallita', { duration: 7000 });
        setOffers(null);
        return;
      }

      const list = data.offers ?? [];
      setOffers(list);
      setMessage(list.length ? null : data.message ?? 'Nessuna tariffa trovata');
    } catch {
      toast.error('Errore di rete');
      setOffers(null);
    } finally {
      setLoading(false);
    }
  }, [adults, destination, endDate, origin, startDate]);

  useEffect(() => {
    if (autoSearch) void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search bar — stile OTA */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#052e6b] via-[#0b4db5] to-[#0770e3] p-1 shadow-xl shadow-blue-900/20">
        <div className="rounded-[1.35rem] bg-white p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_1fr_1fr_auto] lg:items-end">
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Partenza
              </span>
              <Input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="MIL o Milano"
                className="h-12 rounded-xl border-slate-200 bg-slate-50 text-base font-semibold"
              />
            </label>

            <div className="flex justify-center lg:pb-1">
              <button
                type="button"
                onClick={swap}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0770e3] shadow-sm transition hover:bg-slate-50"
                aria-label="Inverti tratta"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            </div>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Destinazione
              </span>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Londra o LHR"
                className="h-12 rounded-xl border-slate-200 bg-slate-50 text-base font-semibold"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Andata
              </span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Ritorno
              </span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50"
              />
            </label>

            <div className="grid grid-cols-[1fr_auto] gap-2 lg:contents">
              <label className="space-y-1.5 lg:col-auto">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Passeggeri
                </span>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    min={1}
                    max={9}
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value) || 1)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-9"
                  />
                </div>
              </label>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={() => void search()}
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-[#0770e3] px-6 text-base font-semibold text-white hover:bg-[#0558b8] lg:w-auto"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Cerca
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">
            {origin.toUpperCase().slice(0, 3)} → {destination}
          </p>
          <p className="text-xs text-slate-500">
            {format(parseISO(startDate), 'd MMM yyyy', { locale: it })}
            {' – '}
            {format(parseISO(endDate), 'd MMM yyyy', { locale: it })}
            {' · '}
            {adults} {adults === 1 ? 'passeggero' : 'passeggeri'}
          </p>
        </div>
        {offers && (
          <p className="text-xs font-medium text-slate-500">
            {offers.length} offerte
          </p>
        )}
      </div>

      {loading && !offers && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-[#0770e3]" />
          Cerchiamo i voli migliori…
        </div>
      )}

      {message && !loading && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </div>
      )}

      {offers && offers.length > 0 && (
        <ul className="space-y-3">
          {offers.map((o) => (
            <li
              key={o.offerId}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-[#0770e3]/40 hover:shadow-md"
            >
              <div className="grid gap-4 p-4 sm:grid-cols-[180px_1fr_140px] sm:items-center sm:p-5">
                <AirlineBadge name={o.airline} code={o.airlineCode} />

                <div className="flex items-center gap-3 sm:gap-5">
                  <div className="text-center">
                    <p className="font-display text-2xl font-semibold tabular-nums text-slate-900">
                      {formatTime(o.departureAt)}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">{o.origin}</p>
                  </div>

                  <div className="min-w-[88px] flex-1 px-1">
                    <p className="mb-1 flex items-center justify-center gap-1 text-[11px] text-slate-500">
                      <Clock3 className="h-3 w-3" />
                      {formatDuration(o.durationMinutes)}
                    </p>
                    <div className="relative h-px bg-slate-200">
                      <Plane className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[#0770e3]" />
                    </div>
                    <p className="mt-1 text-center text-[11px] font-medium text-slate-500">
                      {stopsLabel(o.stops)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="font-display text-2xl font-semibold tabular-nums text-slate-900">
                      {formatTime(o.arrivalAt)}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {o.destination}
                    </p>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold tabular-nums text-[#052e6b]">
                      {o.price.toLocaleString('it-IT', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                      <span className="ml-1 text-sm font-medium text-slate-500">
                        {o.currency}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">a persona</p>
                  </div>
                  <Button
                    type="button"
                    className="rounded-xl bg-[#0770e3] px-5 font-semibold hover:bg-[#0558b8]"
                    onClick={() =>
                      toast.message('Checkout volo in arrivo', {
                        description:
                          'Prebook + Stripe LiteAPI nel prossimo step.',
                      })
                    }
                  >
                    Seleziona
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
