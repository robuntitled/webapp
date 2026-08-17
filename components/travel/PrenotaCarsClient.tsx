'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  Fuel,
  Loader2,
  MapPin,
  Search,
  Users,
  Snowflake,
} from 'lucide-react';
import { toast } from 'sonner';
import { BookingCashbackNote } from '@/components/commerce/BookingCashbackNote';
import { estimateParticipantCashbackEur } from '@/lib/commerce/cashback';
import { AirportPlaceInput } from '@/components/travel/AirportPlaceInput';
import { FlightDateField } from '@/components/travel/FlightDateField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COUNTRY_OPTIONS } from '@/lib/travel/countries';
import {
  loadSearchFormCache,
  saveSearchFormCache,
} from '@/lib/travel/search-form-cache';
import type { PlaceSuggestion } from '@/lib/travel/airport-catalog';
import { paymentTypeLabel, type CarRateHit } from '@/lib/duffel/cars-map';
import { cn } from '@/lib/utils';

type FormCache = {
  pickup: string;
  dropoff: string;
  differentDropoff: boolean;
  startDate: string;
  endDate: string;
  pickupTime: string;
  dropoffTime: string;
  driverAge: number;
  residenceCountryCode: string;
};

type SearchResponse = {
  rates?: CarRateHit[];
  pickup?: { label: string };
  dropoff?: { label: string };
  testMode?: boolean;
  configured?: boolean;
  error?: string;
  code?: string;
  hint?: string;
};

type QuotePayload = {
  id: string;
  paymentType: 'postpaid' | 'guarantee' | 'prepaid';
  paymentLabel: string;
  bookableWithoutCard: boolean;
  priceLabel: string;
  car: CarRateHit | null;
  pickupName: string | null;
  dropoffName: string | null;
  pickupDate?: string;
  pickupTime?: string;
  dropoffDate?: string;
  dropoffTime?: string;
  conditions: Array<{ title: string; text: string }>;
  charges: Array<{ amount?: string | null; currency?: string | null; description?: string | null }>;
  privacyPolicies: Array<{ title: string; text: string }>;
};

type QuoteResponse = { quote?: QuotePayload; error?: string };
type BookResponse = {
  booking?: { reference?: string; status?: string; carName?: string; supplierName?: string };
  error?: string;
  code?: string;
};

const DEFAULT_PICKUP = '10:00';
const DEFAULT_DROPOFF = '10:00';

function defaultStart(): string {
  return format(addDays(new Date(), 3), 'yyyy-MM-dd');
}
function defaultEnd(): string {
  return format(addDays(new Date(), 8), 'yyyy-MM-dd');
}

function splitName(full: string): { given: string; family: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { given: '', family: '' };
  if (parts.length === 1) return { given: parts[0], family: '' };
  return { given: parts[0], family: parts.slice(1).join(' ') };
}

function RateCard({
  rate,
  selected,
  onSelect,
}: {
  rate: CarRateHit;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={cn(
        'group overflow-hidden rounded-2xl border bg-card shadow-[0_1px_0_rgba(15,23,42,0.04)] transition duration-200',
        selected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border/50 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]'
      )}
    >
      <div className="grid sm:grid-cols-[132px_1fr]">
        <div className="relative flex min-h-[120px] items-center justify-center bg-muted/60 sm:min-h-[148px]">
          {rate.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rate.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Car className="h-10 w-10 text-muted-foreground/40" />
          )}
          <span className="absolute left-2.5 top-2.5 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground backdrop-blur-sm">
            {rate.bookableWithoutCard ? 'Al ritiro' : paymentTypeLabel(rate.paymentType)}
          </span>
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-3 p-3.5 sm:p-4">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              {rate.supplierName}
              {rate.categoryLabel ? ` · ${rate.categoryLabel}` : ''}
            </p>
            <h3 className="font-display text-[15px] font-semibold leading-snug tracking-tight sm:text-base">
              {rate.carName}
            </h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
              {rate.transmissionLabel ? <span>{rate.transmissionLabel}</span> : null}
              {rate.fuelLabel ? (
                <span className="inline-flex items-center gap-1">
                  <Fuel className="h-3 w-3" />
                  {rate.fuelLabel}
                </span>
              ) : null}
              {rate.passengers ? (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {rate.passengers}
                </span>
              ) : null}
              {rate.airConditioning ? (
                <span className="inline-flex items-center gap-1">
                  <Snowflake className="h-3 w-3" />
                  A/C
                </span>
              ) : null}
            </div>
            {rate.pickupName ? (
              <p className="truncate text-[12px] text-muted-foreground">
                <MapPin className="mr-1 inline h-3 w-3" />
                {rate.pickupName}
              </p>
            ) : null}
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-border/40 pt-3">
            <div>
              <p className="text-sm font-semibold tracking-tight">{rate.priceLabel}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {paymentTypeLabel(rate.paymentType)}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={selected ? 'default' : 'outline'}
              className="shrink-0 rounded-xl px-3 font-semibold"
              onClick={onSelect}
            >
              {selected ? 'Selezionata' : 'Scegli'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function PrenotaCarsClient({
  defaultEmail,
  defaultName,
  defaultPickup,
  defaultStartDate,
  defaultEndDate,
  tripId,
  compact = false,
}: {
  defaultEmail: string;
  defaultName: string;
  defaultPickup?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  tripId?: string;
  compact?: boolean;
}) {
  const split = splitName(defaultName);
  const [cacheReady, setCacheReady] = useState(false);
  const [pickup, setPickup] = useState(defaultPickup ?? '');
  const [dropoff, setDropoff] = useState(defaultPickup ?? '');
  const [pickupPlace, setPickupPlace] = useState<PlaceSuggestion | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<PlaceSuggestion | null>(null);
  const [differentDropoff, setDifferentDropoff] = useState(false);
  const [startDate, setStartDate] = useState(defaultStartDate ?? defaultStart());
  const [endDate, setEndDate] = useState(defaultEndDate ?? defaultEnd());
  const [pickupTime, setPickupTime] = useState(DEFAULT_PICKUP);
  const [dropoffTime, setDropoffTime] = useState(DEFAULT_DROPOFF);
  const [driverAge, setDriverAge] = useState(30);
  const [residenceCountryCode, setResidenceCountryCode] = useState('IT');
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [booking, setBooking] = useState(false);
  const [rates, setRates] = useState<CarRateHit[] | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [unavailableCode, setUnavailableCode] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuotePayload | null>(null);
  const [givenName, setGivenName] = useState(split.given);
  const [familyName, setFamilyName] = useState(split.family);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [accepted, setAccepted] = useState<Record<number, boolean>>({});
  const [confirmed, setConfirmed] = useState<{
    reference?: string;
    carName?: string;
    supplierName?: string;
  } | null>(null);

  useEffect(() => {
    if (defaultPickup || defaultStartDate) {
      setCacheReady(true);
      return;
    }
    const cached = loadSearchFormCache<FormCache>('cars');
    if (cached) {
      setPickup(cached.pickup ?? '');
      setDropoff(cached.dropoff ?? '');
      setDifferentDropoff(Boolean(cached.differentDropoff));
      if (cached.startDate) setStartDate(cached.startDate);
      if (cached.endDate) setEndDate(cached.endDate);
      if (cached.pickupTime) setPickupTime(cached.pickupTime);
      if (cached.dropoffTime) setDropoffTime(cached.dropoffTime);
      if (cached.driverAge) setDriverAge(cached.driverAge);
      if (cached.residenceCountryCode) setResidenceCountryCode(cached.residenceCountryCode);
    }
    setCacheReady(true);
  }, [defaultPickup, defaultStartDate]);

  useEffect(() => {
    if (!cacheReady) return;
    const payload: FormCache = {
      pickup,
      dropoff,
      differentDropoff,
      startDate,
      endDate,
      pickupTime,
      dropoffTime,
      driverAge,
      residenceCountryCode,
    };
    saveSearchFormCache('cars', payload);
  }, [
    cacheReady,
    pickup,
    dropoff,
    differentDropoff,
    startDate,
    endDate,
    pickupTime,
    dropoffTime,
    driverAge,
    residenceCountryCode,
  ]);

  const dropoffLabel = differentDropoff ? dropoff.trim() : pickup.trim();

  const handleSearch = async () => {
    const pickupLabel = pickup.trim();
    if (!pickupLabel) {
      toast.error('Inserisci il luogo di ritiro.');
      return;
    }
    if (differentDropoff && !dropoff.trim()) {
      toast.error('Inserisci il luogo di restituzione.');
      return;
    }
    if (!endDate) {
      toast.error('Scegli le date di ritiro e restituzione.');
      return;
    }

    setLoading(true);
    setRates(null);
    setQuote(null);
    setSelectedId(null);
    setConfirmed(null);
    setApiUnavailable(false);
    setUnavailableCode(null);
    setHint(null);

    try {
      const res = await fetch('/api/duffel/cars/search', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupLabel,
          dropoffLabel,
          pickupDate: startDate,
          pickupTime,
          dropoffDate: endDate,
          dropoffTime,
          driverAge,
          residenceCountryCode,
        }),
      });
      const data = (await res.json()) as SearchResponse;
      if (res.status === 503 && data.code === 'missing_token') {
        setApiUnavailable(true);
        setUnavailableCode('missing_token');
        toast.message('Duffel non configurato', {
          description: 'Aggiungi DUFFEL_ACCESS_TOKEN (token test va bene).',
        });
        return;
      }
      if (res.status === 403 && data.code === 'cars_not_enabled') {
        setApiUnavailable(true);
        setUnavailableCode('cars_not_enabled');
        toast.error(data.error ?? 'Duffel Cars non attivo');
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca fallita');
        return;
      }
      setRates(data.rates ?? []);
      setTestMode(Boolean(data.testMode));
      setHint(data.hint ?? null);
      if (!(data.rates ?? []).length) {
        toast.message('Nessuna auto trovata', {
          description: data.hint ?? 'Prova un aeroporto (es. Fiumicino, Heathrow) o altre date.',
        });
      }
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (rate: CarRateHit) => {
    setSelectedId(rate.id);
    setQuote(null);
    setAccepted({});
    setQuoting(true);
    try {
      const res = await fetch('/api/duffel/cars/quotes', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rateId: rate.id }),
      });
      const data = (await res.json()) as QuoteResponse;
      if (!res.ok || !data.quote) {
        toast.error(data.error ?? 'Preventivo non disponibile');
        return;
      }
      setQuote(data.quote);
    } catch {
      toast.error('Errore preventivo');
    } finally {
      setQuoting(false);
    }
  };

  const policiesOk = useMemo(() => {
    if (!quote?.privacyPolicies.length) return true;
    return quote.privacyPolicies.every((_, i) => accepted[i]);
  }, [quote, accepted]);

  const handleBook = async () => {
    if (!quote) return;
    if (!quote.bookableWithoutCard) {
      toast.error('Questa tariffa richiede una carta. Scegli “Paga al ritiro”.');
      return;
    }
    if (!givenName || !familyName || !email || !phone || !dateOfBirth) {
      toast.error('Compila i dati del conducente.');
      return;
    }
    if (!policiesOk) {
      toast.error('Accetta le informative privacy.');
      return;
    }
    setBooking(true);
    try {
      const res = await fetch('/api/duffel/cars/book', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.id,
          givenName,
          familyName,
          email,
          phone,
          dateOfBirth,
          paymentType: quote.paymentType,
          policyCount: quote.privacyPolicies.length,
          acceptedPolicies: quote.privacyPolicies
            .map((p, i) => (accepted[i] ? p.title : null))
            .filter(Boolean),
          amountEur: quote.car?.totalAmount,
          tripId,
        }),
      });
      const data = (await res.json()) as BookResponse;
      if (!res.ok) {
        toast.error(data.error ?? 'Prenotazione fallita');
        return;
      }
      setConfirmed({
        reference: data.booking?.reference,
        carName: data.booking?.carName ?? quote.car?.carName,
        supplierName: data.booking?.supplierName ?? quote.car?.supplierName,
      });
      toast.success('Prenotazione confermata');
    } catch {
      toast.error('Errore di rete');
    } finally {
      setBooking(false);
    }
  };

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-3 font-display text-xl font-semibold">Prenotazione confermata</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {confirmed.carName}
          {confirmed.supplierName ? ` · ${confirmed.supplierName}` : ''}
        </p>
        {confirmed.reference ? (
          <p className="mt-1 font-mono text-sm font-semibold">Ref. {confirmed.reference}</p>
        ) : null}
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Paghi al ritiro dal noleggiatore. Porta documento, patente e la carta usata in sede se
          richiesta.
        </p>
        <div className="mx-auto mt-3 max-w-md text-left">
          <BookingCashbackNote
            estimatedEur={estimateParticipantCashbackEur(quote?.car?.totalAmount ?? 0)}
          />
        </div>
        <Button
          type="button"
          className="mt-5 rounded-xl"
          onClick={() => {
            setConfirmed(null);
            setQuote(null);
            setSelectedId(null);
          }}
        >
          Nuova ricerca
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-[oklch(0.22_0.05_220)] via-primary to-[oklch(0.5_0.1_200)] p-px shadow-lg shadow-primary/10">
        <div className="rounded-[0.95rem] bg-card px-3 py-3 sm:px-3.5 sm:py-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_auto] lg:items-end">
            <AirportPlaceInput
              label="Ritiro"
              value={pickup}
              selected={pickupPlace}
              onValueChange={(v) => {
                setPickup(v);
                setPickupPlace(null);
              }}
              onClearSelection={() => setPickupPlace(null)}
              onSelect={(place) => {
                setPickupPlace(place);
                setPickup(place.label);
              }}
              placeholder="Città o aeroporto…"
              kinds={['city', 'airport']}
              showAirportCode
              placesFallback
            />
            <FlightDateField
              tripType="stay"
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ora ritiro
              </p>
              <Input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="h-12 rounded-xl border-border/80 bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ora reso
              </p>
              <Input
                type="time"
                value={dropoffTime}
                onChange={(e) => setDropoffTime(e.target.value)}
                className="h-12 rounded-xl border-border/80 bg-background px-3 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                className="h-12 w-full rounded-xl px-5 font-semibold lg:w-auto"
                onClick={() => void handleSearch()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Cerca auto
              </Button>
            </div>
          </div>

          <div className="mt-2.5 grid gap-2 border-t border-border/40 pt-2.5 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={differentDropoff}
                onCheckedChange={(v) => setDifferentDropoff(Boolean(v))}
              />
              Restituzione diversa
            </label>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Età conducente
              </p>
              <Input
                type="number"
                min={18}
                max={99}
                value={driverAge}
                onChange={(e) => setDriverAge(Number(e.target.value) || 18)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Residenza
              </p>
              <select
                value={residenceCountryCode}
                onChange={(e) => setResidenceCountryCode(e.target.value)}
                className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {differentDropoff ? (
            <div className="mt-2">
              <AirportPlaceInput
                label="Restituzione"
                value={dropoff}
                selected={dropoffPlace}
                onValueChange={(v) => {
                  setDropoff(v);
                  setDropoffPlace(null);
                }}
                onClearSelection={() => setDropoffPlace(null)}
                onSelect={(place) => {
                  setDropoffPlace(place);
                  setDropoff(place.label);
                }}
                placeholder="Città o aeroporto…"
                kinds={['city', 'airport']}
                showAirportCode
                placesFallback
              />
            </div>
          ) : null}

          <p className="mt-2.5 text-[11px] text-muted-foreground">
            Partner: <span className="font-medium text-foreground">Duffel Cars</span>
            {testMode ? ' · ambiente test' : ''} · prenotazione in-app, pagamento al ritiro
          </p>
        </div>
      </div>

      {apiUnavailable ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="space-y-1 text-muted-foreground">
              <p className="font-medium text-foreground">
                {unavailableCode === 'cars_not_enabled'
                  ? 'Duffel Cars non ancora abilitato'
                  : 'Token Duffel mancante'}
              </p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  Account su{' '}
                  <a
                    href="https://app.duffel.com"
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    app.duffel.com
                  </a>
                </li>
                <li>Developers → Access tokens → token di test (`duffel_test_…`)</li>
                <li>Richiedi accesso a Duffel Cars</li>
                <li>
                  Imposta <code className="text-xs">DUFFEL_ACCESS_TOKEN</code> su Vercel / .env.local
                </li>
              </ol>
            </div>
          </div>
        </div>
      ) : null}

      {loading && !rates ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/20 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Ricerca auto in corso…
        </div>
      ) : null}

      {rates && rates.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{rates.length}</span> auto
            {testMode ? ' · test' : ''}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {rates.map((rate) => (
              <RateCard
                key={rate.id}
                rate={rate}
                selected={selectedId === rate.id}
                onSelect={() => void handleSelect(rate)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {rates && rates.length === 0 && !loading ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Nessuna tariffa per queste date.</p>
          {hint ? <p className="mt-1.5 text-[13px] text-amber-600">{hint}</p> : null}
        </div>
      ) : null}

      {quoting ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Conferma prezzo in corso…
        </div>
      ) : null}

      {quote ? (
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <div>
            <h2 className="font-display text-lg font-semibold">Checkout</h2>
            <p className="text-sm text-muted-foreground">
              {quote.car?.carName} · {quote.priceLabel} · {quote.paymentLabel}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {quote.pickupName} ({quote.pickupDate} {quote.pickupTime}) → {quote.dropoffName} (
              {quote.dropoffDate} {quote.dropoffTime})
            </p>
          </div>

          {!quote.bookableWithoutCard ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
              Questa tariffa richiede una carta (Duffel Payments). Scegli un’auto{' '}
              <strong>Paga al ritiro</strong>.
            </p>
          ) : null}

          {quote.conditions.length ? (
            <div className="space-y-1 text-[13px] text-muted-foreground">
              {quote.conditions.slice(0, 4).map((c) => (
                <p key={c.title}>
                  <span className="font-medium text-foreground">{c.title}.</span> {c.text}
                </p>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="car-given">Nome</Label>
              <Input id="car-given" value={givenName} onChange={(e) => setGivenName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="car-family">Cognome</Label>
              <Input
                id="car-family"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="car-email">Email</Label>
              <Input
                id="car-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="car-phone">Telefono</Label>
              <Input
                id="car-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39…"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="car-dob">Data di nascita</Label>
              <Input
                id="car-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
          </div>

          {quote.privacyPolicies.map((p, i) => (
            <label key={`${p.title}-${i}`} className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={Boolean(accepted[i])}
                onCheckedChange={(v) => setAccepted((prev) => ({ ...prev, [i]: Boolean(v) }))}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{p.title}.</span> {p.text}
              </span>
            </label>
          ))}

          <Button
            type="button"
            className="h-12 w-full rounded-xl font-semibold sm:w-auto"
            disabled={booking || !quote.bookableWithoutCard}
            onClick={() => void handleBook()}
          >
            {booking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Conferma prenotazione
          </Button>
        </div>
      ) : null}
    </div>
  );
}
