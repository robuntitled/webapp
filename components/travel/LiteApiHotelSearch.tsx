'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { addDays, format } from 'date-fns';
import {
  BedDouble,
  Check,
  Coffee,
  Loader2,
  MapPin,
  Search,
  Star,
  Users,
  Waves,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type HotelOffer = {
  hotelId: string;
  name: string;
  address: string | null;
  city: string | null;
  photo: string | null;
  stars: number | null;
  rating: number | null;
  roomName: string;
  boardName: string | null;
  boardType: string | null;
  offerId: string;
  totalAmount: number;
  currency: string;
  freeCancellation: boolean;
  refundable: boolean;
  facilities: string[];
};

const COUNTRIES = [
  { code: 'IT', label: 'Italia' },
  { code: 'ES', label: 'Spagna' },
  { code: 'FR', label: 'Francia' },
  { code: 'PT', label: 'Portogallo' },
  { code: 'GR', label: 'Grecia' },
  { code: 'HR', label: 'Croazia' },
  { code: 'DE', label: 'Germania' },
  { code: 'GB', label: 'Regno Unito' },
  { code: 'US', label: 'USA' },
  { code: 'TH', label: 'Thailandia' },
] as const;

type FilterKey = 'freeCancel' | 'breakfast' | 'pool' | 'stars3' | 'stars4';

type LiteApiHotelSearchProps = {
  defaultCity?: string;
  defaultCountry?: string;
  defaultCheckin?: string;
  defaultCheckout?: string;
  defaultAdults?: number;
  compact?: boolean;
  className?: string;
};

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-[#003580] bg-[#003580] text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-[#003580]/40'
      )}
    >
      {children}
    </button>
  );
}

export function LiteApiHotelSearch({
  defaultCity = 'Rome',
  defaultCountry = 'IT',
  defaultCheckin,
  defaultCheckout,
  defaultAdults = 1,
  compact = false,
  className,
}: LiteApiHotelSearchProps) {
  const defaults = useMemo(() => {
    const inDate = addDays(new Date(), 21);
    const outDate = addDays(inDate, 4);
    return {
      checkin: defaultCheckin || format(inDate, 'yyyy-MM-dd'),
      checkout: defaultCheckout || format(outDate, 'yyyy-MM-dd'),
    };
  }, [defaultCheckin, defaultCheckout]);

  const [cityName, setCityName] = useState(defaultCity);
  const [countryCode, setCountryCode] = useState(defaultCountry);
  const [checkin, setCheckin] = useState(defaults.checkin);
  const [checkout, setCheckout] = useState(defaults.checkout);
  const [adults, setAdults] = useState(defaultAdults);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    freeCancel: false,
    breakfast: false,
    pool: false,
    stars3: false,
    stars4: false,
  });
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState<HotelOffer[] | null>(null);

  const toggle = (key: FilterKey) => {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  const search = async () => {
    if (!cityName.trim()) {
      toast.error('Inserisci una città');
      return;
    }
    setLoading(true);
    setHotels(null);
    try {
      const qs = new URLSearchParams({
        cityName: cityName.trim(),
        countryCode,
        checkin,
        checkout,
        adults: String(Math.min(9, Math.max(1, adults))),
        currency: 'EUR',
      });
      if (filters.freeCancel) qs.set('refundableOnly', '1');
      if (filters.breakfast) qs.set('breakfast', '1');
      if (filters.pool) qs.set('pool', '1');
      if (filters.stars4) qs.set('minStars', '4');
      else if (filters.stars3) qs.set('minStars', '3');

      const res = await fetch(`/api/liteapi/hotels/search?${qs}`, {
        credentials: 'same-origin',
      });
      const data = (await res.json()) as {
        hotels?: HotelOffer[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca fallita', { duration: 8000 });
        return;
      }
      const list = data.hotels ?? [];
      setHotels(list);
      if (!list.length) {
        toast.message('Nessun hotel trovato — prova ad allentare i filtri');
      }
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('space-y-5', className)}>
      <div
        className={cn(
          'overflow-hidden rounded-3xl',
          compact
            ? 'border border-border/60 bg-card p-3.5'
            : 'bg-gradient-to-br from-[#003580] to-[#0057b8] p-1 shadow-xl shadow-blue-900/15'
        )}
      >
        <div className={cn(!compact && 'rounded-[1.35rem] bg-white p-4 sm:p-5')}>
          <div
            className={cn(
              'grid gap-3',
              compact ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-6'
            )}
          >
            <label className={cn('space-y-1.5', !compact && 'lg:col-span-2')}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Destinazione
              </span>
              <Input
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="Roma"
                className="h-12 rounded-xl border-slate-200 bg-slate-50 font-semibold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void search();
                }}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Paese
              </span>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Check-in
              </span>
              <Input
                type="date"
                value={checkin}
                onChange={(e) => setCheckin(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Check-out
              </span>
              <Input
                type="date"
                value={checkout}
                onChange={(e) => setCheckout(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Ospiti
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
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FilterChip
              active={filters.freeCancel}
              onClick={() => toggle('freeCancel')}
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancellazione gratis
            </FilterChip>
            <FilterChip
              active={filters.breakfast}
              onClick={() => toggle('breakfast')}
            >
              <Coffee className="h-3.5 w-3.5" />
              Colazione inclusa
            </FilterChip>
            <FilterChip active={filters.pool} onClick={() => toggle('pool')}>
              <Waves className="h-3.5 w-3.5" />
              Piscina
            </FilterChip>
            <FilterChip active={filters.stars3} onClick={() => toggle('stars3')}>
              <Star className="h-3.5 w-3.5" />
              3+ stelle
            </FilterChip>
            <FilterChip active={filters.stars4} onClick={() => toggle('stars4')}>
              <Star className="h-3.5 w-3.5" />
              4+ stelle
            </FilterChip>
            <Button
              type="button"
              onClick={() => void search()}
              disabled={loading}
              className={cn(
                'ml-auto h-10 rounded-xl px-5 font-semibold',
                compact
                  ? ''
                  : 'bg-[#003580] hover:bg-[#00275c]'
              )}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Cerca hotel
            </Button>
          </div>
        </div>
      </div>

      {loading && !hotels && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-[#003580]" />
          Cerchiamo le migliori tariffe…
        </div>
      )}

      {hotels && (
        <ul className={cn('grid gap-4', compact ? 'grid-cols-1' : 'lg:grid-cols-1')}>
          {hotels.map((h) => (
            <li
              key={`${h.hotelId}-${h.offerId}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className={cn('grid', compact ? '' : 'sm:grid-cols-[220px_1fr]')}>
                <div className="relative aspect-[16/10] bg-slate-100 sm:aspect-auto sm:min-h-[160px]">
                  {h.photo ? (
                    <Image
                      src={h.photo}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="220px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full min-h-[140px] items-center justify-center text-slate-300">
                      <BedDouble className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:p-5">
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="font-display text-lg font-semibold text-slate-900 line-clamp-1">
                        {h.name}
                      </p>
                      {(h.city || h.address) && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="line-clamp-1">{h.address || h.city}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {h.stars != null && h.stars > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-500">
                          {Array.from({
                            length: Math.min(5, Math.round(h.stars)),
                          }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </span>
                      ) : null}
                      {h.rating != null ? (
                        <span className="rounded-md bg-[#003580] px-1.5 py-0.5 font-bold text-white">
                          {h.rating.toFixed(1)}
                        </span>
                      ) : null}
                      <span className="text-slate-600">{h.roomName}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(h.freeCancellation || h.refundable) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <Check className="h-3 w-3" />
                          Cancellazione gratis
                        </span>
                      )}
                      {(h.boardName || h.boardType) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                          <Coffee className="h-3 w-3" />
                          {h.boardName || h.boardType}
                        </span>
                      )}
                      {h.facilities
                        .filter((f) => /pool|piscina|wifi|spa|parking|park/i.test(f))
                        .slice(0, 3)
                        .map((f) => (
                          <span
                            key={f}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            {f}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:w-40 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <div className="text-right">
                      <p className="font-display text-2xl font-semibold tabular-nums text-[#003580]">
                        {h.totalAmount.toFixed(0)}
                        <span className="ml-1 text-sm font-medium text-slate-500">
                          {h.currency}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">totale soggiorno</p>
                    </div>
                    <Button
                      type="button"
                      className="rounded-xl bg-[#003580] font-semibold hover:bg-[#00275c]"
                      onClick={() =>
                        toast.message('Checkout LiteAPI in arrivo', {
                          description:
                            'Prebook + pagamento Stripe nel prossimo step.',
                        })
                      }
                    >
                      Vedi offerta
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
