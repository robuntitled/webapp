'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, subYears } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plane,
} from 'lucide-react';
import { toast } from 'sonner';
import { LiteApiPaymentWidget } from '@/components/travel/LiteApiPaymentWidget';
import { BookingComplianceNote } from '@/components/commerce/BookingComplianceNote';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COUNTRY_OPTIONS } from '@/lib/travel/countries';
import {
  formatFlightBookingStatus,
  isFlightPendingConfirmation,
} from '@/lib/itineraries/bookings';
import {
  clearFlightCheckoutDraft,
  clearFlightPaymentPending,
  loadFlightCheckoutDraft,
  loadFlightPaymentPending,
  saveFlightPaymentPending,
  type FlightCheckoutDraft,
  type FlightLegDraft,
} from '@/lib/travel/flight-checkout-draft';
import { cn } from '@/lib/utils';

type Step = 'details' | 'payment' | 'done';
type Title = 'MR' | 'MRS' | 'MS' | 'MISS';

const TITLES: Array<{ id: Title; label: string; gender: 'M' | 'F' }> = [
  { id: 'MR', label: 'Sig. (Mr)', gender: 'M' },
  { id: 'MRS', label: 'Sig.ra (Mrs)', gender: 'F' },
  { id: 'MS', label: 'Ms', gender: 'F' },
  { id: 'MISS', label: 'Sig.na (Miss)', gender: 'F' },
];

type VerifyState = {
  price: number | null;
  currency: string | null;
  priceChanged: boolean;
  previousPrice: number | null;
  expiration: string | null;
};

type PassengerForm = {
  title: Title;
  firstName: string;
  lastName: string;
  birthday: string;
  gender: 'M' | 'F';
  nationality: string;
  documentType: string;
  documentNumber: string;
  documentIssueCountry: string;
  documentExpiry: string;
};

type ContactForm = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
};

function emptyPassenger(): PassengerForm {
  return {
    title: 'MR',
    firstName: '',
    lastName: '',
    birthday: '',
    gender: 'M',
    nationality: 'IT',
    documentType: 'passport',
    documentNumber: '',
    documentIssueCountry: 'IT',
    documentExpiry: '',
  };
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

function formatMoney(amount: number, currency: string) {
  return `${roundMoney(amount).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatTime(iso?: string | null) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  return format(new Date(t), 'HH:mm');
}

function DatePickerField({
  label,
  value,
  onChange,
  fromYear,
  toYear,
  disabledAfter,
  disabledBefore,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  fromYear: number;
  toYear: number;
  disabledAfter?: Date;
  disabledBefore?: Date;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-12 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium transition',
              'hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
              !value && 'text-slate-400 font-normal'
            )}
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            {selected
              ? format(selected, 'd MMMM yyyy', { locale: it })
              : 'Seleziona data'}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto overflow-hidden rounded-2xl border-slate-200 p-0 shadow-xl"
        >
          <Calendar
            mode="single"
            locale={it}
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected ?? subYears(new Date(), 30)}
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            disabled={[
              ...(disabledAfter ? [{ after: disabledAfter }] : []),
              ...(disabledBefore ? [{ before: disabledBefore }] : []),
            ]}
            onSelect={(d) => {
              if (!d) return;
              onChange(format(d, 'yyyy-MM-dd'));
              setOpen(false);
            }}
            className="p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CountrySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {COUNTRY_OPTIONS.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LegSummary({
  title,
  leg,
}: {
  title: string;
  leg: FlightLegDraft;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
        {title}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div>
          <p className="font-display text-xl font-semibold tabular-nums">
            {formatTime(leg.departureAt)}
          </p>
          <p className="text-xs font-semibold text-slate-500">{leg.origin}</p>
        </div>
        <div className="min-w-0 flex-1 px-2 text-center">
          <p className="truncate text-[11px] text-slate-500">
            {leg.airline || leg.airlineCode || 'Volo'}
            {leg.flightNumber ? ` · ${leg.flightNumber}` : ''}
          </p>
          <div className="mx-auto mt-1 h-px w-full max-w-[80px] bg-slate-200" />
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-semibold tabular-nums">
            {formatTime(leg.arrivalAt)}
          </p>
          <p className="text-xs font-semibold text-slate-500">{leg.destination}</p>
        </div>
      </div>
      {leg.departureAt ? (
        <p className="mt-2 text-[11px] capitalize text-slate-500">
          {format(parseISO(leg.departureAt.slice(0, 10)), 'EEEE d MMMM', {
            locale: it,
          })}
        </p>
      ) : null}
    </div>
  );
}


export function FlightCheckoutClient({
  defaultEmail = '',
}: {
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<FlightCheckoutDraft | null>(null);
  const [step, setStep] = useState<Step>('details');
  const [verifying, setVerifying] = useState(true);
  const [verify, setVerify] = useState<VerifyState | null>(null);
  const [acceptedPriceChange, setAcceptedPriceChange] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [contact, setContact] = useState<ContactForm>({
    firstName: '',
    lastName: '',
    email: defaultEmail,
    phoneCountryCode: '39',
    phoneNumber: '',
  });
  const [passengers, setPassengers] = useState<PassengerForm[]>([emptyPassenger()]);

  const [payment, setPayment] = useState<{
    prebookId: string;
    transactionId: string;
    secretKey: string;
    publishableKey: string | null;
    paymentEnv: 'sandbox' | 'live';
    paymentMode: 'stripe_elements' | 'liteapi_sdk';
    price: number | null;
    currency: string | null;
  } | null>(null);

  const [confirmation, setConfirmation] = useState<{
    bookingId: string | null;
    bookingRef: string | null;
    status: string | null;
    amountEur: number;
    practiceId?: string;
  } | null>(null);

  const finalizeBooking = useCallback(
    async (prebookId: string, transactionId: string) => {
      setSubmitting(true);
      try {
        const amountEur =
          loadFlightPaymentPending()?.price ?? loadFlightCheckoutDraft()?.price ?? 0;
        const draft = loadFlightCheckoutDraft();
        const res = await fetch('/api/liteapi/flights/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
          prebookId,
          transactionId,
          amountEur,
          tripId: draft?.tripId,
          practiceId: draft?.practiceId,
          snapshot: draft
            ? {
                offerId: draft.offerId,
                currency: draft.currency,
                outbound: draft.outbound,
                returnLeg: draft.returnLeg,
              }
            : undefined,
        }),
        });
        const data = (await res.json()) as {
          error?: string;
          bookingId?: string | null;
          bookingRef?: string | null;
          status?: string | null;
        };
        if (!res.ok) {
          toast.error(data.error ?? 'Conferma prenotazione fallita');
          return;
        }
        setConfirmation({
          bookingId: data.bookingId ?? null,
          bookingRef: data.bookingRef ?? null,
          status: data.status ?? null,
          amountEur,
          practiceId: draft?.practiceId,
        });
        clearFlightCheckoutDraft();
        clearFlightPaymentPending();
        setStep('done');
        const pending = isFlightPendingConfirmation(data.status);
        toast.success(
          pending
            ? 'Pagamento ok — la compagnia sta confermando il biglietto'
            : 'Prenotazione confermata'
        );
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.search = '';
          window.history.replaceState({}, '', url.toString());
        }
      } catch {
        toast.error('Errore di rete in conferma');
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  useEffect(() => {
    const d = loadFlightCheckoutDraft();
    if (d) {
      setDraft(d);
      setPassengers(
        Array.from({ length: Math.max(1, d.adults) }, () => emptyPassenger())
      );
    } else {
      setDraft(null);
      setVerifying(false);
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paid = params.get('paid') === '1';
      const tid = params.get('tid');
      const pid = params.get('pid');
      const pending = loadFlightPaymentPending();

      const redirected =
        params.get('redirect_status') === 'succeeded' || Boolean(params.get('payment_intent'));
      if ((paid && tid && pid) || (redirected && pending)) {
        setStep('payment');
        setVerifying(false);
        void finalizeBooking(
          pid || pending?.prebookId || '',
          tid || pending?.transactionId || ''
        );
        return;
      }
      if (pending?.paymentMode === 'stripe_elements') {
        clearFlightPaymentPending();
      } else if (pending) {
        setPayment({
          prebookId: pending.prebookId,
          transactionId: pending.transactionId,
          secretKey: pending.secretKey,
          publishableKey: pending.publishableKey,
          paymentEnv: pending.paymentEnv,
          paymentMode: pending.paymentMode,
          price: pending.price,
          currency: pending.currency,
        });
        setStep('payment');
        setVerifying(false);
      }
    }
  }, [finalizeBooking]);

  const runVerify = useCallback(
    async (offerId: string) => {
      setVerifying(true);
      try {
        const res = await fetch('/api/liteapi/flights/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ offerId }),
        });
        const data = (await res.json()) as VerifyState & {
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          toast.error(data.error ?? 'Verifica fallita');
          if (data.code === 'offer_expired') {
            clearFlightCheckoutDraft();
            router.push('/prenota/voli');
          }
          return;
        }
        setVerify({
          price: data.price != null ? roundMoney(data.price) : null,
          currency: data.currency,
          priceChanged: data.priceChanged,
          previousPrice:
            data.previousPrice != null ? roundMoney(data.previousPrice) : null,
          expiration: data.expiration,
        });
        if (data.priceChanged) setAcceptedPriceChange(false);
      } catch {
        toast.error('Errore di rete in verifica');
      } finally {
        setVerifying(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (draft?.offerId && step === 'details') void runVerify(draft.offerId);
  }, [draft?.offerId, runVerify, step]);

  // Una sola fonte: dopo prebook usa il prezzo pagabile, altrimenti verify/draft
  const displayPrice = roundMoney(
    payment?.price ?? verify?.price ?? draft?.price ?? 0
  );
  const displayCurrency =
    payment?.currency ?? verify?.currency ?? draft?.currency ?? 'EUR';

  const updatePassenger = (idx: number, patch: Partial<PassengerForm>) => {
    setPassengers((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const next = { ...p, ...patch };
        if (patch.title) {
          const t = TITLES.find((x) => x.id === patch.title);
          if (t) next.gender = t.gender;
        }
        return next;
      })
    );
  };

  const startPrebook = async () => {
    if (!draft) return;
    if (draft.tripType === 'roundtrip' && !draft.returnLeg) {
      toast.error('Seleziona anche il volo di ritorno prima del pagamento');
      router.push('/prenota/voli');
      return;
    }
    if (verify?.priceChanged && !acceptedPriceChange) {
      toast.error('Conferma il nuovo prezzo per continuare');
      return;
    }
    for (const p of passengers) {
      if (
        !p.firstName ||
        !p.lastName ||
        !p.birthday ||
        !p.documentNumber ||
        !p.documentExpiry
      ) {
        toast.error('Completa i dati di tutti i passeggeri');
        return;
      }
    }

    const contactPayload = {
      ...contact,
      firstName: contact.firstName || passengers[0]?.firstName || '',
      lastName: contact.lastName || passengers[0]?.lastName || '',
    };
    if (!contactPayload.email || !contactPayload.phoneNumber) {
      toast.error('Completa email e telefono di contatto');
      return;
    }
    if (!contactPayload.firstName || !contactPayload.lastName) {
      toast.error('Completa nome e cognome di contatto');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/liteapi/flights/prebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          offerId: draft.offerId,
          contact: contactPayload,
          passengers,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        prebookId?: string;
        transactionId?: string;
        secretKey?: string;
        publishableKey?: string | null;
        paymentEnv?: 'sandbox' | 'live';
        price?: number | null;
        currency?: string | null;
      };
      if (!res.ok) {
        toast.error(data.error ?? 'Impossibile riservare il volo');
        if (data.code === 'offer_expired') {
          clearFlightCheckoutDraft();
          router.push('/prenota/voli');
        }
        return;
      }
      if (!data.prebookId || !data.transactionId || !data.secretKey) {
        toast.error('Risposta pagamento incompleta');
        return;
      }
      const paymentEnv = data.paymentEnv ?? 'sandbox';
      const pending = {
        prebookId: data.prebookId,
        transactionId: data.transactionId,
        secretKey: data.secretKey,
        publishableKey: data.publishableKey ?? null,
        paymentEnv,
        paymentMode: 'liteapi_sdk' as const,
        price: roundMoney(data.price ?? displayPrice),
        currency: data.currency ?? displayCurrency,
        createdAt: Date.now(),
      };
      saveFlightPaymentPending(pending);
      setPayment(pending);
      setStep('payment');
    } catch {
      toast.error('Errore di rete');
    } finally {
      setSubmitting(false);
    }
  };

  const paymentReturnUrl =
    typeof window !== 'undefined' && payment
      ? `${window.location.origin}/prenota/voli/checkout?paid=1&tid=${encodeURIComponent(payment.transactionId)}&pid=${encodeURIComponent(payment.prebookId)}`
      : '';

  if (!draft && !verifying && !payment && step !== 'done' && !submitting) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <p className="text-sm text-slate-600">
          Nessuna offerta selezionata. Torna alla ricerca voli.
        </p>
        <Button asChild className="mt-4 rounded-xl">
          <Link href="/prenota/voli">Cerca voli</Link>
        </Button>
      </div>
    );
  }

  if (step === 'done' && confirmation) {
    const pending = isFlightPendingConfirmation(confirmation.status);
    const statusInfo = formatFlightBookingStatus(confirmation.status);
    const practiceHref = confirmation.practiceId
      ? `/pratica/${confirmation.practiceId}?step=hotel`
      : '/pratiche';

    return (
      <div
        className={cn(
          'mx-auto max-w-lg space-y-6 rounded-3xl border p-6 shadow-sm sm:p-8',
          pending
            ? 'border-amber-200 bg-gradient-to-b from-amber-50/80 to-white'
            : 'border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3',
            pending ? 'text-amber-800' : 'text-emerald-700'
          )}
        >
          <CheckCircle2 className="h-9 w-9" />
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {pending ? 'Pagamento confermato' : 'Prenotazione confermata'}
            </h2>
            <p className={cn('text-sm', pending ? 'text-amber-900/80' : 'text-emerald-800/80')}>
              {pending
                ? statusInfo.description
                : 'Conserva il codice per il check-in.'}
            </p>
          </div>
        </div>
        <div
          className={cn(
            'rounded-2xl bg-white px-4 py-4 shadow-sm ring-1',
            pending ? 'ring-amber-100' : 'ring-emerald-100'
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {pending ? 'Codice prenotazione (valido)' : 'Codice prenotazione'}
          </p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-wide text-slate-900">
            {confirmation.bookingRef || confirmation.bookingId || '—'}
          </p>
          {pending ? (
            <p className="mt-2 text-xs text-amber-800/90">{statusInfo.label}</p>
          ) : null}
        </div>
        <BookingComplianceNote />
        <Button asChild className="w-full rounded-xl bg-primary">
          <Link href={practiceHref}>
            {confirmation.practiceId ? 'Continua con hotel e attività' : 'Vai ai tuoi viaggi'}
          </Link>
        </Button>
      </div>
    );
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Link
          href="/pratiche"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al viaggio
        </Link>

        {step === 'details' ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-[oklch(0.22_0.05_220)] to-primary px-5 py-4 text-white sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Passo 1 di 2
              </p>
              <h2 className="mt-0.5 font-display text-xl font-semibold">
                Passeggeri e contatto
              </h2>
              <p className="mt-1 text-sm text-white/75">
                Dati come sul documento di viaggio, poi pagamento sicuro.
              </p>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              {verifying ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Verifica disponibilità e prezzo…
                </div>
              ) : null}

              {verify?.priceChanged ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <p className="font-semibold">Il prezzo è cambiato</p>
                  <p className="mt-1">
                    {verify.previousPrice != null ? (
                      <>
                        <span className="line-through opacity-70">
                          {formatMoney(verify.previousPrice, displayCurrency)}
                        </span>
                        {' → '}
                      </>
                    ) : null}
                    <span className="font-semibold">
                      {formatMoney(displayPrice, displayCurrency)}
                    </span>
                  </p>
                  <label className="mt-3 flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={acceptedPriceChange}
                      onChange={(e) => setAcceptedPriceChange(e.target.checked)}
                    />
                    Accetto il nuovo prezzo e continuo
                  </label>
                </div>
              ) : null}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Contatto</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Email
                    </span>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={(e) =>
                        setContact((c) => ({ ...c, email: e.target.value }))
                      }
                      className="h-12 rounded-xl"
                      placeholder="nome@email.com"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Nome
                    </span>
                    <Input
                      value={contact.firstName}
                      onChange={(e) =>
                        setContact((c) => ({ ...c, firstName: e.target.value }))
                      }
                      className="h-12 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Cognome
                    </span>
                    <Input
                      value={contact.lastName}
                      onChange={(e) =>
                        setContact((c) => ({ ...c, lastName: e.target.value }))
                      }
                      className="h-12 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Prefisso
                    </span>
                    <Input
                      value={contact.phoneCountryCode}
                      onChange={(e) =>
                        setContact((c) => ({
                          ...c,
                          phoneCountryCode: e.target.value,
                        }))
                      }
                      className="h-12 rounded-xl"
                      placeholder="39"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Telefono
                    </span>
                    <Input
                      value={contact.phoneNumber}
                      onChange={(e) =>
                        setContact((c) => ({ ...c, phoneNumber: e.target.value }))
                      }
                      className="h-12 rounded-xl"
                      placeholder="3331234567"
                    />
                  </label>
                </div>
              </section>

              {passengers.map((p, idx) => (
                <section
                  key={idx}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Passeggero {idx + 1}
                    </h3>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                      Adulto
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Titolo
                      </span>
                      <select
                        value={p.title}
                        onChange={(e) =>
                          updatePassenger(idx, {
                            title: e.target.value as Title,
                          })
                        }
                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                      >
                        {TITLES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Nome
                      </span>
                      <Input
                        value={p.firstName}
                        onChange={(e) =>
                          updatePassenger(idx, { firstName: e.target.value })
                        }
                        className="h-12 rounded-xl bg-white"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Cognome
                      </span>
                      <Input
                        value={p.lastName}
                        onChange={(e) =>
                          updatePassenger(idx, { lastName: e.target.value })
                        }
                        className="h-12 rounded-xl bg-white"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DatePickerField
                      label="Data di nascita"
                      value={p.birthday}
                      onChange={(iso) => updatePassenger(idx, { birthday: iso })}
                      fromYear={1920}
                      toYear={new Date().getFullYear() - 12}
                      disabledAfter={subYears(new Date(), 12)}
                    />
                    <CountrySelect
                      label="Nazionalità"
                      value={p.nationality}
                      onChange={(code) =>
                        updatePassenger(idx, { nationality: code })
                      }
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Documento
                      </span>
                      <select
                        value={p.documentType}
                        onChange={(e) =>
                          updatePassenger(idx, { documentType: e.target.value })
                        }
                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                      >
                        <option value="passport">Passaporto</option>
                        <option value="id_card">Carta d’identità</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Numero documento
                      </span>
                      <Input
                        value={p.documentNumber}
                        onChange={(e) =>
                          updatePassenger(idx, {
                            documentNumber: e.target.value,
                          })
                        }
                        className="h-12 rounded-xl bg-white"
                      />
                    </label>
                    <CountrySelect
                      label="Paese di emissione"
                      value={p.documentIssueCountry}
                      onChange={(code) =>
                        updatePassenger(idx, { documentIssueCountry: code })
                      }
                    />
                    <DatePickerField
                      label="Scadenza documento"
                      value={p.documentExpiry}
                      onChange={(iso) =>
                        updatePassenger(idx, { documentExpiry: iso })
                      }
                      fromYear={new Date().getFullYear()}
                      toYear={new Date().getFullYear() + 20}
                      disabledBefore={today}
                    />
                  </div>
                </section>
              ))}

              <Button
                type="button"
                disabled={verifying || submitting}
                onClick={() => void startPrebook()}
                className="h-12 w-full rounded-xl bg-primary text-base font-semibold hover:bg-primary/90"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Continua al pagamento
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'payment' && payment ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-[oklch(0.22_0.05_220)] to-primary px-5 py-4 text-white sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Passo 2 di 2
              </p>
              <h2 className="mt-0.5 font-display text-xl font-semibold text-white">
                Pagamento
              </h2>
              <p className="mt-1 text-sm text-white/75">
                Totale{' '}
                <span className="font-semibold text-white">
                  {formatMoney(displayPrice, displayCurrency)}
                </span>
              </p>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              {paymentReturnUrl ? (
                <LiteApiPaymentWidget
                  key={payment.secretKey}
                  secretKey={payment.secretKey}
                  paymentEnv={payment.paymentEnv}
                  returnUrl={paymentReturnUrl}
                />
              ) : null}
              {submitting ? (
                <p className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conferma prenotazione in corso…
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {draft ? (
        <aside className="h-fit space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Riepilogo
            </p>
          </div>

          <LegSummary title="Andata" leg={draft.outbound} />
          {draft.returnLeg ? (
            <LegSummary title="Ritorno" leg={draft.returnLeg} />
          ) : draft.tripType === 'roundtrip' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Manca il volo di ritorno — torna ai risultati e completalo.
            </div>
          ) : null}

          <div className="rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
            <p className="text-[11px] uppercase tracking-wider text-white/70">
              Totale
            </p>
            <p className="font-display text-2xl font-semibold">
              {formatMoney(displayPrice, displayCurrency)}
            </p>
            <p className="text-[11px] text-white/60">
              {draft.adults}{' '}
              {draft.adults === 1 ? 'passeggero' : 'passeggeri'}
              {draft.tripType === 'roundtrip' ? ' · A/R' : ' · solo andata'}
            </p>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
