'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { addDays, format } from 'date-fns';
import { BedDouble, Loader2, MapPin, Search, Star } from 'lucide-react';
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
  offerId: string;
  totalAmount: number;
  currency: string;
  commissionAmount: number | null;
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

type LiteApiHotelSearchProps = {
  defaultCity?: string;
  defaultCountry?: string;
  defaultCheckin?: string;
  defaultCheckout?: string;
  defaultAdults?: number;
  /** Layout compatto per sidebar trip */
  compact?: boolean;
  className?: string;
};

export function LiteApiHotelSearch({
  defaultCity = 'Roma',
  defaultCountry = 'IT',
  defaultCheckin,
  defaultCheckout,
  defaultAdults = 2,
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
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState<HotelOffer[] | null>(null);

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
        adults: String(adults),
        currency: 'EUR',
      });
      const res = await fetch(`/api/liteapi/hotels/search?${qs}`, {
        credentials: 'same-origin',
      });
      const data = (await res.json()) as {
        hotels?: HotelOffer[];
        error?: string;
        count?: number;
        code?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca fallita', { duration: 8000 });
        return;
      }
      const list = data.hotels ?? [];
      setHotels(list);
      if (!list.length) {
        toast.message('Nessun hotel trovato per queste date');
      } else {
        toast.success(`${list.length} hotel con tariffa disponibile`);
      }
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'rounded-2xl border border-border/60 bg-card',
          compact ? 'p-3.5' : 'rounded-3xl p-5 shadow-sm sm:p-6'
        )}
      >
        {!compact && (
          <div className="mb-4 flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-accent" />
            <div>
              <h2 className="font-display text-lg font-semibold">Hotel in-app</h2>
              <p className="text-sm text-muted-foreground">
                LiteAPI · tariffe live (sandbox può avere catalogo ridotto)
              </p>
            </div>
          </div>
        )}

        <div
          className={cn(
            'grid gap-3',
            compact ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'
          )}
        >
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Città</span>
            <Input
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="Roma"
              className="h-11 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void search();
              }}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Paese</span>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Adulti</span>
            <Input
              type="number"
              min={1}
              max={9}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value) || 1)}
              className="h-11 rounded-xl"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Check-in</span>
            <Input
              type="date"
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
              className="h-11 rounded-xl"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Check-out</span>
            <Input
              type="date"
              value={checkout}
              onChange={(e) => setCheckout(e.target.value)}
              className="h-11 rounded-xl"
            />
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              className="h-11 w-full rounded-xl"
              onClick={() => void search()}
              disabled={loading}
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

      {hotels && (
        <ul className={cn('grid gap-3', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
          {hotels.map((h) => (
            <li
              key={`${h.hotelId}-${h.offerId}`}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[16/10] bg-muted">
                {h.photo ? (
                  <Image
                    src={h.photo}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 400px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <BedDouble className="h-8 w-8 opacity-40" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-sm font-semibold text-white tabular-nums">
                  {h.totalAmount.toFixed(0)} {h.currency}
                </div>
              </div>
              <div className="space-y-1.5 p-3.5">
                <p className="font-display font-semibold leading-snug line-clamp-1">
                  {h.name}
                </p>
                {(h.city || h.address) && (
                  <p className="flex items-start gap-1 text-xs text-muted-foreground line-clamp-1">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    {h.address || h.city}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {h.stars != null && h.stars > 0 ? (
                    <span className="inline-flex items-center gap-0.5">
                      {Array.from({ length: Math.min(5, Math.round(h.stars)) }).map(
                        (_, i) => (
                          <Star
                            key={i}
                            className={cn('h-3 w-3 fill-amber-400 text-amber-400')}
                          />
                        )
                      )}
                    </span>
                  ) : null}
                  {h.rating != null ? <span>★ {h.rating.toFixed(1)}</span> : null}
                </div>
                <p className="text-sm text-foreground/80 line-clamp-1">{h.roomName}</p>
                {h.boardName ? (
                  <p className="text-xs text-muted-foreground">{h.boardName}</p>
                ) : null}
                {h.commissionAmount != null ? (
                  <p className="text-[11px] text-teal-700 dark:text-teal-300">
                    Stima commissione: {h.commissionAmount.toFixed(2)} {h.currency}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full rounded-full"
                  onClick={() =>
                    toast.message('Checkout LiteAPI in arrivo', {
                      description:
                        'Ricerca attiva. Il prebook + pagamento Stripe arriva nel prossimo step.',
                    })
                  }
                >
                  Seleziona camera
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
