'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, subYears } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarDays, CheckCircle2, Loader2, Plane } from 'lucide-react';
import { toast } from 'sonner';
import { LiteApiPaymentWidget } from '@/components/travel/LiteApiPaymentWidget';
import {
  CheckoutBackLink,
  CheckoutStepShell,
  getCheckoutReturnHref,
} from '@/components/travel/CheckoutUi';
import { BookingComplianceNote } from '@/components/commerce/BookingComplianceNote';
import { AllegatoBLinkedNotice } from '@/components/legal/AllegatoBLinkedNotice';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COUNTRY_OPTIONS } from '@/lib/travel/countries';
import {
  formatFlightBookingStatus,
  isFlightPendingConfirmation,
} from '@/lib/itineraries/bookings';
import { legKindLabelIt } from '@/lib/itineraries/selected-flight-display';
import {
  clearFlightCheckoutDraft,
  clearFlightPaymentPending,
  loadFlightCheckoutDraft,
  loadFlightPaymentPending,
  saveFlightCheckoutDraft,
  saveFlightPaymentPending,
  type FlightCheckoutDraft,
  type FlightCheckoutLegItem,
  type FlightLegDraft,
} from '@/lib/travel/flight-checkout-draft';
import { ensureFlightPracticeOnCheckout } from '@/lib/travel/ensure-trip-for-checkout';
import { cn } from '@/lib/utils';

type LegCheckoutResult = {
  legId: string;
  labelIt: string;
  route: string;
  ok: boolean;
  bookingId: string | null;
  bookingRef: string | null;
  status: string | null;
  amountEur: number;
  error?: string;
};

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
          // overflow-visible: native month/year <select> menus must not be clipped on iOS
          className="z-[80] w-auto overflow-visible rounded-2xl border-slate-200 p-0 shadow-xl"
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
  price,
  currency,
  status,
}: {
  title: string;
  leg: FlightLegDraft;
  price?: number | null;
  currency?: string | null;
  status?: 'pending' | 'paid' | 'failed' | 'active' | null;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-3',
        status === 'paid'
          ? 'border-emerald-200 bg-emerald-50/70'
          : status === 'failed'
            ? 'border-rose-200 bg-rose-50/70'
            : status === 'active'
              ? 'border-primary/40 bg-primary/5'
              : 'border-slate-100 bg-slate-50/80'
      )}
      data-testid="checkout-leg-summary"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {title}
        </p>
        {status === 'paid' ? (
          <span className="text-[11px] font-semibold text-emerald-700">Prenotato</span>
        ) : status === 'failed' ? (
          <span className="text-[11px] font-semibold text-rose-700">Fallito</span>
        ) : status === 'active' ? (
          <span className="text-[11px] font-semibold text-primary">In pagamento</span>
        ) : null}
      </div>
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
      <div className="mt-2 flex items-center justify-between gap-2">
        {leg.departureAt ? (
          <p className="text-[11px] capitalize text-slate-500">
            {format(parseISO(leg.departureAt.slice(0, 10)), 'EEEE d MMMM', {
              locale: it,
            })}
          </p>
        ) : (
          <span />
        )}
        {price != null ? (
          <p className="text-xs font-bold tabular-nums text-slate-800">
            {formatMoney(price, currency || 'EUR')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function checkoutLegsOf(draft: FlightCheckoutDraft | null): FlightCheckoutLegItem[] {
  if (!draft) return [];
  if (draft.checkoutLegs?.length) return draft.checkoutLegs;
  return [
    {
      id: 'legacy-outbound',
      offerId: draft.offerId,
      price: draft.price,
      currency: draft.currency,
      kind: 'outbound',
      labelIt: `${draft.outbound.origin} → ${draft.outbound.destination}`,
      leg: draft.outbound,
    },
    ...(draft.returnLeg
      ? [
          {
            id: 'legacy-return',
            offerId: draft.offerId,
            price: 0,
            currency: draft.currency,
            kind: 'return',
            labelIt: `${draft.returnLeg.origin} → ${draft.returnLeg.destination}`,
            leg: draft.returnLeg,
          } satisfies FlightCheckoutLegItem,
        ]
      : []),
  ];
}

function draftPlanTotal(draft: FlightCheckoutDraft | null): number {
  if (!draft) return 0;
  if (draft.checkoutLegs?.length) {
    return draft.checkoutLegs.reduce(
      (s, l) => s + (Number.isFinite(l.price) ? l.price : 0),
      0
    );
  }
  return draft.price;
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
    reconciliationPending?: boolean;
    reconciliationMessage?: string;
  } | null>(null);
  const [legResults, setLegResults] = useState<LegCheckoutResult[]>([]);
  const [advanceToken, setAdvanceToken] = useState(0);

  const finalizeBooking = useCallback(
    async (prebookId: string, transactionId: string) => {
      setSubmitting(true);
      try {
        const pendingPay = loadFlightPaymentPending();
        const draft = loadFlightCheckoutDraft();
        const legs = draft?.checkoutLegs;
        const idx = draft?.activeLegIndex ?? 0;
        const activeLeg = legs?.[idx];
        const amountEur =
          pendingPay?.price ??
          activeLeg?.price ??
          draft?.price ??
          0;
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
                offerId: activeLeg?.offerId ?? draft.offerId,
                currency: activeLeg?.currency ?? draft.currency,
                outbound: activeLeg?.leg ?? draft.outbound,
                returnLeg: legs && legs.length > 1 ? null : draft.returnLeg,
              }
            : undefined,
        }),
        });
        const data = (await res.json()) as {
          error?: string;
          bookingId?: string | null;
          bookingRef?: string | null;
          status?: string | null;
          practiceId?: string;
          reconciliationPending?: boolean;
          message?: string;
        };
        if (!res.ok) {
          const fail: LegCheckoutResult = {
            legId: activeLeg?.id ?? 'unknown',
            labelIt: activeLeg?.labelIt ?? 'Tratta',
            route: activeLeg
              ? `${activeLeg.leg.origin} → ${activeLeg.leg.destination}`
              : '—',
            ok: false,
            bookingId: null,
            bookingRef: null,
            status: null,
            amountEur,
            error: data.error ?? 'Conferma prenotazione fallita',
          };
          setLegResults((prev) => [...prev, fail]);
          toast.error(fail.error);
          // Honest partial state: keep prior successes, stop the queue.
          clearFlightPaymentPending();
          setPayment(null);
          setConfirmation({
            bookingId: null,
            bookingRef: null,
            status: 'FAILED',
            amountEur: 0,
            practiceId: draft?.practiceId,
          });
          setStep('done');
          return;
        }
        const okResult: LegCheckoutResult = {
          legId: activeLeg?.id ?? 'legacy',
          labelIt: activeLeg?.labelIt ?? 'Tratta',
          route: activeLeg
            ? `${activeLeg.leg.origin} → ${activeLeg.leg.destination}`
            : `${draft?.outbound.origin ?? ''} → ${draft?.outbound.destination ?? ''}`,
          ok: true,
          bookingId: data.bookingId ?? null,
          bookingRef: data.bookingRef ?? null,
          status: data.status ?? null,
          amountEur,
        };
        setLegResults((prev) => [...prev, okResult]);

        const hasMore =
          Boolean(legs && legs.length > 1) && idx + 1 < (legs?.length ?? 0);

        if (hasMore && draft && legs) {
          const nextIdx = idx + 1;
          const next = legs[nextIdx]!;
          const nextDraft: FlightCheckoutDraft = {
            ...draft,
            activeLegIndex: nextIdx,
            offerId: next.offerId,
            outbound: next.leg,
            returnLeg: null,
            tripType: 'oneway',
            currency: next.currency || draft.currency,
          };
          saveFlightCheckoutDraft(nextDraft);
          setDraft(nextDraft);
          clearFlightPaymentPending();
          setPayment(null);
          toast.success(
            `Tratta ${idx + 1}/${legs.length} ok — continuo con la successiva`
          );
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.search = '';
            window.history.replaceState({}, '', url.toString());
          }
          setAdvanceToken((n) => n + 1);
          return;
        }

        setConfirmation({
          bookingId: data.bookingId ?? null,
          bookingRef: data.bookingRef ?? null,
          status: data.status ?? null,
          amountEur,
          practiceId: data.practiceId ?? draft?.practiceId,
          reconciliationPending: Boolean(data.reconciliationPending),
          reconciliationMessage: data.message,
        });
        clearFlightCheckoutDraft();
        clearFlightPaymentPending();
        setStep('done');
        if (data.reconciliationPending) {
          toast.message(
            data.message ?? 'Prenotazione ricevuta, stiamo completando la registrazione'
          );
        } else {
          const pending = isFlightPendingConfirmation(data.status);
          toast.success(
            pending
              ? 'Pagamento ok — la compagnia sta confermando il biglietto'
              : legs && legs.length > 1
                ? 'Tutte le tratte prenotate'
                : 'Prenotazione confermata'
          );
        }
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
    let cancelled = false;

    async function boot() {
      // Fase 1: dopo login, crea/aggancia il viaggio prima del checkout.
      const practiceId = await ensureFlightPracticeOnCheckout().catch(() => null);
      const d = loadFlightCheckoutDraft();
      if (cancelled) return;
      if (d) {
        setDraft(
          practiceId && !d.practiceId ? { ...d, practiceId } : d
        );
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
          params.get('redirect_status') === 'succeeded' ||
          Boolean(params.get('payment_intent'));
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
    }

    void boot();
    return () => {
      cancelled = true;
    };
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
            router.push(
              getCheckoutReturnHref(undefined, 'voli', 'offer_unavailable')
            );
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

  const checkoutLegs = checkoutLegsOf(draft);
  const activeLegIndex = draft?.activeLegIndex ?? 0;
  const activeCheckoutLeg = checkoutLegs[activeLegIndex] ?? checkoutLegs[0] ?? null;
  const planTotal = roundMoney(draftPlanTotal(draft));
  const isMultiLeg = Boolean(draft?.checkoutLegs && draft.checkoutLegs.length > 1);

  // Una sola fonte: dopo prebook usa il prezzo pagabile della tratta attiva;
  // in riepilogo details mostriamo il totale piano multi-tratta.
  const displayPrice = roundMoney(
    payment?.price ??
      (step === 'payment'
        ? activeCheckoutLeg?.price ?? verify?.price ?? draft?.price ?? 0
        : isMultiLeg
          ? planTotal
          : verify?.price ?? draft?.price ?? 0)
  );
  const displayCurrency =
    payment?.currency ??
    activeCheckoutLeg?.currency ??
    verify?.currency ??
    draft?.currency ??
    'EUR';

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

  const startPrebook = useCallback(async (opts?: { skipValidation?: boolean }) => {
    const current = loadFlightCheckoutDraft() ?? draft;
    if (!current) return;
    if (current.tripType === 'roundtrip' && !current.returnLeg && !current.checkoutLegs?.length) {
      toast.error('Seleziona anche il volo di ritorno prima del pagamento');
      router.push('/prenota/voli');
      return;
    }
    if (!opts?.skipValidation && verify?.priceChanged && !acceptedPriceChange) {
      toast.error('Conferma il nuovo prezzo per continuare');
      return;
    }
    if (!opts?.skipValidation) {
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

    // Checkout bloccato senza viaggio (Fase 1): crea/aggancia prima del pagamento.
    const practiceId =
      current.practiceId ?? (await ensureFlightPracticeOnCheckout().catch(() => null));
    if (!practiceId) {
      toast.error('Crea prima il viaggio da questo volo, poi paga.');
      return;
    }
    let working = current;
    if (!current.practiceId) {
      working = { ...current, practiceId };
      setDraft(working);
      saveFlightCheckoutDraft(working);
    }

    const legs = working.checkoutLegs;
    const idx = working.activeLegIndex ?? 0;
    const active = legs?.[idx];
    const offerId = active?.offerId ?? working.offerId;
    const expectedLegPrice = active?.price;

    setSubmitting(true);
    try {
      const res = await fetch('/api/liteapi/flights/prebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          offerId,
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
        if (legs && legs.length > 1 && legResults.length > 0) {
          // Partial success already saved — show honest done state.
          setConfirmation({
            bookingId: legResults[legResults.length - 1]?.bookingId ?? null,
            bookingRef: legResults[legResults.length - 1]?.bookingRef ?? null,
            status: 'PARTIAL',
            amountEur: legResults.reduce((s, r) => s + (r.ok ? r.amountEur : 0), 0),
            practiceId: working.practiceId,
          });
          setStep('done');
        }
        if (data.code === 'offer_expired') {
          if (!(legs && legs.length > 1 && legResults.length > 0)) {
            clearFlightCheckoutDraft();
            router.push(
              getCheckoutReturnHref(undefined, 'voli', 'offer_unavailable')
            );
          }
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
        price: roundMoney(data.price ?? expectedLegPrice ?? working.price),
        currency: data.currency ?? active?.currency ?? working.currency,
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
  }, [
    acceptedPriceChange,
    contact,
    draft,
    legResults,
    passengers,
    router,
    verify?.priceChanged,
  ]);

  useEffect(() => {
    if (advanceToken <= 0) return;
    void startPrebook({ skipValidation: true });
    // Only re-run when a leg advances — startPrebook identity must not loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advanceToken gate
  }, [advanceToken]);

  const paymentReturnUrl =
    typeof window !== 'undefined' && payment
      ? `${window.location.origin}/prenota/voli/checkout?paid=1&tid=${encodeURIComponent(payment.transactionId)}&pid=${encodeURIComponent(payment.prebookId)}`
      : '';

  if (verifying && !draft && !payment && step !== 'done') {
    return (
      <div
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-busy="true"
        aria-label="Caricamento checkout"
      >
        <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-50" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-50" />
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Preparo il checkout…
        </p>
      </div>
    );
  }

  if (!draft && !verifying && !payment && step !== 'done' && !submitting) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <p className="text-sm text-slate-600">
          Nessuna offerta selezionata. Torna alla selezione voli.
        </p>
        <Button asChild className="mt-4 min-h-11 rounded-xl">
          <Link href={getCheckoutReturnHref(undefined, 'voli')}>Torna ai voli</Link>
        </Button>
      </div>
    );
  }

  if (step === 'done' && (confirmation || legResults.length > 0)) {
    const reconciling = Boolean(confirmation?.reconciliationPending);
    const pending =
      !reconciling && isFlightPendingConfirmation(confirmation?.status);
    const statusInfo = formatFlightBookingStatus(confirmation?.status);
    const practiceHref = confirmation?.practiceId
      ? `/pratica/${confirmation.practiceId}?tab=voli`
      : '/pratiche';
    const failedAny = legResults.some((r) => !r.ok);
    const okAny = legResults.some((r) => r.ok);
    const partial = failedAny && okAny;
    const multiDone = legResults.length > 1;

    return (
      <div
        className={cn(
          'mx-auto max-w-lg space-y-6 rounded-3xl border p-6 shadow-sm sm:p-8',
          reconciling || pending || partial
            ? 'border-amber-200 bg-gradient-to-b from-amber-50/80 to-white'
            : failedAny && !okAny
              ? 'border-rose-200 bg-gradient-to-b from-rose-50/80 to-white'
              : 'border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white'
        )}
        data-testid="checkout-done"
      >
        <div
          className={cn(
            'flex items-center gap-3',
            reconciling || pending || partial
              ? 'text-amber-800'
              : failedAny && !okAny
                ? 'text-rose-800'
                : 'text-emerald-700'
          )}
        >
          <CheckCircle2 className="h-9 w-9" />
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {partial
                ? 'Prenotazione parziale'
                : reconciling
                  ? 'Prenotazione ricevuta'
                  : pending
                    ? 'Pagamento confermato'
                    : multiDone
                      ? 'Tratte prenotate'
                      : 'Prenotazione confermata'}
            </h2>
            <p
              className={cn(
                'text-sm',
                reconciling || pending || partial
                  ? 'text-amber-900/80'
                  : 'text-emerald-800/80'
              )}
            >
              {partial
                ? 'Alcune tratte sono andate a buon fine, altre no. Controlla lo stato sotto e sul viaggio.'
                : reconciling
                  ? confirmation?.reconciliationMessage ??
                    'Prenotazione ricevuta, stiamo completando la registrazione'
                  : pending
                    ? statusInfo.description
                    : 'Conserva i codici per il check-in.'}
            </p>
          </div>
        </div>

        {legResults.length > 0 ? (
          <ul className="space-y-2" data-testid="checkout-leg-results">
            {legResults.map((r) => (
              <li
                key={`${r.legId}-${r.bookingRef ?? r.error ?? 'x'}`}
                className={cn(
                  'rounded-2xl bg-white px-4 py-3 shadow-sm ring-1',
                  r.ok ? 'ring-emerald-100' : 'ring-rose-100'
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {r.labelIt}
                </p>
                <p className="mt-0.5 font-semibold text-slate-900">{r.route}</p>
                {r.ok ? (
                  <>
                    <p className="mt-1 font-display text-xl font-semibold tracking-wide">
                      {r.bookingRef || r.bookingId || '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatMoney(r.amountEur, 'EUR')}
                      {r.status ? ` · ${formatFlightBookingStatus(r.status).label}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-rose-700">{r.error ?? 'Fallita'}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div
            className={cn(
              'rounded-2xl bg-white px-4 py-4 shadow-sm ring-1',
              reconciling || pending ? 'ring-amber-100' : 'ring-emerald-100'
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {pending ? 'Codice prenotazione (valido)' : 'Codice prenotazione'}
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tracking-wide text-slate-900">
              {confirmation?.bookingRef || confirmation?.bookingId || '—'}
            </p>
            {pending ? (
              <p className="mt-2 text-xs text-amber-800/90">{statusInfo.label}</p>
            ) : null}
          </div>
        )}
        <BookingComplianceNote showMerchantOfRecord />
        <Button asChild className="w-full rounded-xl bg-primary">
          <Link href={practiceHref}>
            {confirmation?.practiceId || legResults.length
              ? 'Torna al viaggio'
              : 'Vai ai tuoi viaggi'}
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
        <CheckoutBackLink
          href={getCheckoutReturnHref(draft?.practiceId, 'voli')}
          label={draft?.practiceId ? 'Torna alla selezione voli' : 'Torna alla ricerca voli'}
        />

        {step === 'details' ? (
          <CheckoutStepShell
            step={1}
            totalSteps={2}
            title="Passeggeri e contatto"
            description="Dati come sul documento di viaggio, poi pagamento sicuro."
          >
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
                <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
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

            {/* A7: Allegato B prima di passare al pagamento (Continua con hotel). */}
            <AllegatoBLinkedNotice />

            {draft ? (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:hidden"
                data-testid="checkout-summary-mobile"
              >
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {isMultiLeg ? 'Totale tratte' : 'Totale'}
                    </p>
                    <p className="truncate text-xs text-slate-600">
                      {draft.adults}{' '}
                      {draft.adults === 1 ? 'passeggero' : 'passeggeri'}
                      {isMultiLeg
                        ? ` · ${checkoutLegs.length} tratte`
                        : draft.tripType === 'roundtrip'
                          ? ' · A/R'
                          : ' · solo andata'}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-xl font-semibold tabular-nums text-slate-900">
                    {formatMoney(
                      isMultiLeg ? planTotal : displayPrice,
                      displayCurrency
                    )}
                  </p>
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              disabled={verifying || submitting}
              onClick={() => void startPrebook()}
              className="h-12 min-h-12 w-full rounded-xl bg-primary text-base font-semibold hover:bg-primary/90"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Continua al pagamento
            </Button>
          </CheckoutStepShell>
        ) : null}

        {step === 'payment' && payment ? (
          <CheckoutStepShell
            step={2}
            totalSteps={2}
            title={
              isMultiLeg
                ? `Pagamento tratta ${activeLegIndex + 1} di ${checkoutLegs.length}`
                : 'Pagamento'
            }
            description={
              isMultiLeg
                ? `${activeCheckoutLeg?.leg.origin ?? ''} → ${activeCheckoutLeg?.leg.destination ?? ''}`
                : `Totale ${formatMoney(displayPrice, displayCurrency)}`
            }
            footer={
              <CheckoutBackLink
                label="Modifica passeggeri"
                onClick={() => setStep('details')}
              />
            }
          >
            {isMultiLeg ? (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">
                  Addebito di questa tratta:{' '}
                  <span className="tabular-nums">
                    {formatMoney(displayPrice, displayCurrency)}
                  </span>
                  <span className="font-normal text-slate-500">
                    {' '}
                    · piano {formatMoney(planTotal, displayCurrency)}
                  </span>
                </p>
                <p>
                  Ogni tratta è un biglietto one-way: paghi in sequenza. Se una fallisce, le
                  altre già confermate restano valide.
                </p>
              </div>
            ) : null}
            <AllegatoBLinkedNotice />
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
          </CheckoutStepShell>
        ) : null}
      </div>

      {draft ? (
        <aside
          className="h-fit space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24"
          data-testid="checkout-summary"
        >
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Riepilogo
            </p>
          </div>

          {draft.checkoutLegs?.length ? (
            draft.checkoutLegs.map((item, i) => {
              const paid = legResults.find((r) => r.legId === item.id && r.ok);
              const failed = legResults.find((r) => r.legId === item.id && !r.ok);
              const status =
                paid
                  ? 'paid'
                  : failed
                    ? 'failed'
                    : step === 'payment' && i === activeLegIndex
                      ? 'active'
                      : 'pending';
              return (
                <LegSummary
                  key={item.id}
                  title={`${legKindLabelIt(item.kind)} · ${item.leg.origin}→${item.leg.destination}`}
                  leg={item.leg}
                  price={item.price}
                  currency={item.currency}
                  status={status}
                />
              );
            })
          ) : (
            <>
              <LegSummary title="Andata" leg={draft.outbound} />
              {draft.returnLeg ? (
                <LegSummary title="Ritorno" leg={draft.returnLeg} />
              ) : draft.tripType === 'roundtrip' ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Manca il volo di ritorno — torna ai risultati e completalo.
                </div>
              ) : null}
            </>
          )}

          <div className="rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
            <p className="text-[11px] uppercase tracking-wider text-white/70">
              {isMultiLeg ? 'Totale tratte' : 'Totale'}
            </p>
            <p className="font-display text-2xl font-semibold" data-testid="checkout-total">
              {formatMoney(
                isMultiLeg ? planTotal : displayPrice,
                displayCurrency
              )}
            </p>
            <p className="text-[11px] text-white/60">
              {draft.adults}{' '}
              {draft.adults === 1 ? 'passeggero' : 'passeggeri'}
              {isMultiLeg
                ? ` · ${checkoutLegs.length} tratte (biglietti one-way)`
                : draft.tripType === 'roundtrip'
                  ? ' · A/R'
                  : ' · solo andata'}
            </p>
          </div>
          <BookingComplianceNote showMerchantOfRecord />
          <AllegatoBLinkedNotice compact />
        </aside>
      ) : null}
    </div>
  );
}
