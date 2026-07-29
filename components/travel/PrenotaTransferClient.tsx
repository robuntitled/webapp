'use client';

import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AirportPlaceInput } from '@/components/travel/AirportPlaceInput';
import { FlightDateField } from '@/components/travel/FlightDateField';
import { GuestsPicker } from '@/components/travel/GuestsPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildGetTransferAffiliateHandoff } from '@/lib/gettransfer/affiliate-url';
import { isGetTransferAffiliateConfigured } from '@/lib/gettransfer/config';
import {
  resolvePlaceExact,
  type PlaceSuggestion,
} from '@/lib/travel/airport-catalog';
import {
  loadSearchFormCache,
  saveSearchFormCache,
} from '@/lib/travel/search-form-cache';

type FormCache = {
  from: string;
  to: string;
  pickupDate: string;
  pickupTime: string;
  adults: number;
  children: number;
};

const DEFAULT_TIME = '10:00';

export function PrenotaTransferClient() {
  const [cacheReady, setCacheReady] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fromPlace, setFromPlace] = useState<PlaceSuggestion | null>(null);
  const [toPlace, setToPlace] = useState<PlaceSuggestion | null>(null);
  const [pickupDate, setPickupDate] = useState(() =>
    format(addDays(new Date(), 1), 'yyyy-MM-dd')
  );
  const [pickupTime, setPickupTime] = useState(DEFAULT_TIME);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const affiliateReady = isGetTransferAffiliateConfigured();

  useEffect(() => {
    const cached = loadSearchFormCache<FormCache>('transfer');
    if (cached) {
      setFrom(cached.from ?? '');
      setTo(cached.to ?? '');
      if (cached.pickupDate) setPickupDate(cached.pickupDate);
      if (cached.pickupTime) setPickupTime(cached.pickupTime);
      if (cached.adults) setAdults(cached.adults);
      setChildren(cached.children ?? 0);
      setFromPlace(cached.from ? resolvePlaceExact(cached.from) : null);
      setToPlace(cached.to ? resolvePlaceExact(cached.to) : null);
    }
    setCacheReady(true);
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    const payload: FormCache = {
      from,
      to,
      pickupDate,
      pickupTime,
      adults,
      children,
    };
    saveSearchFormCache('transfer', payload);
    const onHide = () => saveSearchFormCache('transfer', payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [cacheReady, from, to, pickupDate, pickupTime, adults, children]);

  function handleSearch() {
    const fromLabel = from.trim();
    const toLabel = to.trim();
    if (!fromLabel || !toLabel) {
      toast.error('Inserisci partenza e destinazione.');
      return;
    }
    if (fromLabel.toLowerCase() === toLabel.toLowerCase()) {
      toast.error('Partenza e destinazione devono essere diverse.');
      return;
    }

    setSubmitting(true);
    const { url, hasAffiliateTracking } = buildGetTransferAffiliateHandoff({
      from: fromLabel,
      to: toLabel,
      pickupDate,
      pickupTime,
      adults,
      children,
    });

    window.open(url, '_blank', 'noopener,noreferrer');
    if (!hasAffiliateTracking) {
      toast.message('Apertura GetTransfer', {
        description:
          'Tracking affiliate non attivo: configura NEXT_PUBLIC_TRAVELPAYOUTS_MARKER in .env.local.',
      });
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-[oklch(0.22_0.05_220)] via-primary to-[oklch(0.5_0.1_200)] p-px shadow-lg shadow-primary/10">
        <div className="rounded-[0.95rem] bg-card px-3 py-3 sm:px-3.5 sm:py-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.7fr_1fr_auto] lg:items-end">
            <AirportPlaceInput
              label="Partenza"
              value={from}
              selected={fromPlace}
              onValueChange={(v) => {
                setFrom(v);
                setFromPlace(null);
              }}
              onClearSelection={() => setFromPlace(null)}
              onSelect={(place) => {
                setFromPlace(place);
                setFrom(place.label);
              }}
              placeholder="Aeroporto, hotel, indirizzo…"
              kinds={['city', 'airport', 'country']}
              showAirportCode
              placesFallback
            />
            <AirportPlaceInput
              label="Destinazione"
              value={to}
              selected={toPlace}
              onValueChange={(v) => {
                setTo(v);
                setToPlace(null);
              }}
              onClearSelection={() => setToPlace(null)}
              onSelect={(place) => {
                setToPlace(place);
                setTo(place.label);
              }}
              placeholder="Aeroporto, hotel, indirizzo…"
              kinds={['city', 'airport', 'country']}
              showAirportCode
              placesFallback
            />
            <FlightDateField
              tripType="oneway"
              startDate={pickupDate}
              endDate={pickupDate}
              onStartDateChange={setPickupDate}
              onEndDateChange={setPickupDate}
            />
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ora
              </p>
              <Input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="h-12 rounded-xl border-border/80 bg-background px-3 text-sm"
              />
            </div>
            <GuestsPicker
              adults={adults}
              childrenCount={children}
              onAdultsChange={setAdults}
              onChildrenChange={setChildren}
              label="Passeggeri"
              maxAdults={8}
              maxChildren={6}
            />
            <div className="flex items-end">
              <Button
                type="button"
                className="h-12 w-full rounded-xl px-5 font-semibold lg:w-auto"
                onClick={handleSearch}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Cerca transfer
              </Button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/40 pt-2.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Partner: <span className="text-foreground">GetTransfer</span>
              {!affiliateReady ? (
                <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                  (marker non configurato)
                </span>
              ) : null}
            </p>
            <p className="ml-auto text-[11px] text-muted-foreground">
              Confronta offerte da autisti locali · 150+ paesi
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <p>
          Riceverai proposte con foto del veicolo e prezzo fisso prima del pagamento.
          La prenotazione si completa su{' '}
          <span className="font-medium text-foreground">GetTransfer</span> in una
          nuova scheda
          <ExternalLink className="ml-0.5 inline h-3.5 w-3.5 align-text-bottom opacity-70" />
          .
        </p>
      </div>
    </div>
  );
}
