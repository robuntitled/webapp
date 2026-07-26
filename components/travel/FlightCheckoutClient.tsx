'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Plane,
} from 'lucide-react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  clearFlightCheckoutDraft,
  loadFlightCheckoutDraft,
  type FlightCheckoutDraft,
} from '@/lib/travel/flight-checkout-draft';
import { cn } from '@/lib/utils';

type Step = 'details' | 'payment' | 'done';

type VerifyState = {
  price: number | null;
  currency: string | null;
  priceChanged: boolean;
  previousPrice: number | null;
  expiration: string | null;
};

type PassengerForm = {
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

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatTime(iso?: string | null) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  return format(new Date(t), 'HH:mm');
}

function PaymentStep({ onPaid }: { onPaid: () => Promise<void> }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url:
            typeof window !== 'undefined'
              ? `${window.location.origin}/prenota/voli/checkout`
              : undefined,
        },
      });
      if (error) {
        toast.error(error.message ?? 'Pagamento non riuscito');
        return;
      }
      if (
        paymentIntent &&
        (paymentIntent.status === 'succeeded' ||
          paymentIntent.status === 'processing')
      ) {
        await onPaid();
      } else {
        toast.error('Pagamento non completato. Riprova.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore pagamento');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
      <Button
        type="button"
        disabled={!stripe || busy}
        onClick={() => void pay()}
        className="h-12 w-full rounded-xl bg-[#0770e3] text-base font-semibold hover:bg-[#0558b8]"
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="mr-2 h-4 w-4" />
        )}
        Paga e conferma
      </Button>
      <p className="text-center text-[11px] text-slate-500">
        Pagamento sicuro. La carta viene addebitata solo a conferma avvenuta.
      </p>
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
    publishableKey: string;
    price: number | null;
    currency: string | null;
  } | null>(null);

  const [confirmation, setConfirmation] = useState<{
    bookingId: string | null;
    bookingRef: string | null;
    status: string | null;
  } | null>(null);

  const stripePromise = useMemo(() => {
    if (!payment?.publishableKey) return null;
    return loadStripe(payment.publishableKey) as Promise<Stripe | null>;
  }, [payment?.publishableKey]);

  useEffect(() => {
    const d = loadFlightCheckoutDraft();
    if (!d) {
      setDraft(null);
      setVerifying(false);
      return;
    }
    setDraft(d);
    setPassengers(
      Array.from({ length: Math.max(1, d.adults) }, () => emptyPassenger())
    );
  }, []);

  const runVerify = useCallback(async (offerId: string) => {
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
        price: data.price,
        currency: data.currency,
        priceChanged: data.priceChanged,
        previousPrice: data.previousPrice,
        expiration: data.expiration,
      });
      if (data.priceChanged) setAcceptedPriceChange(false);
    } catch {
      toast.error('Errore di rete in verifica');
    } finally {
      setVerifying(false);
    }
  }, [router]);

  useEffect(() => {
    if (draft?.offerId) void runVerify(draft.offerId);
  }, [draft?.offerId, runVerify]);

  const displayPrice = verify?.price ?? draft?.price ?? 0;
  const displayCurrency = verify?.currency ?? draft?.currency ?? 'EUR';

  const updatePassenger = (idx: number, patch: Partial<PassengerForm>) => {
    setPassengers((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    );
  };

  const startPrebook = async () => {
    if (!draft) return;
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
    if (!contact.email || !contact.phoneNumber || !contact.firstName) {
      toast.error('Completa i dati di contatto');
      return;
    }

    const contactPayload = {
      ...contact,
      firstName: contact.firstName || passengers[0]?.firstName || '',
      lastName: contact.lastName || passengers[0]?.lastName || '',
    };
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
      const pk =
        data.publishableKey ||
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        '';
      if (!pk) {
        toast.error(
          'Chiave pagamento non disponibile. Contatta il supporto.'
        );
        return;
      }
      setPayment({
        prebookId: data.prebookId,
        transactionId: data.transactionId,
        secretKey: data.secretKey,
        publishableKey: pk,
        price: data.price ?? displayPrice,
        currency: data.currency ?? displayCurrency,
      });
      setStep('payment');
    } catch {
      toast.error('Errore di rete');
    } finally {
      setSubmitting(false);
    }
  };

  const finalizeBooking = async () => {
    if (!payment) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/liteapi/flights/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          prebookId: payment.prebookId,
          transactionId: payment.transactionId,
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
      });
      clearFlightCheckoutDraft();
      setStep('done');
      toast.success('Prenotazione confermata');
    } catch {
      toast.error('Errore di rete in conferma');
    } finally {
      setSubmitting(false);
    }
  };

  if (!draft && !verifying) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
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
    return (
      <div className="mx-auto max-w-lg space-y-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3 text-emerald-700">
          <CheckCircle2 className="h-8 w-8" />
          <div>
            <h2 className="font-display text-2xl font-semibold">
              Prenotazione confermata
            </h2>
            <p className="text-sm text-emerald-800/80">
              Salva il codice per il check-in in aeroporto.
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Codice prenotazione
          </p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-wide text-slate-900">
            {confirmation.bookingRef || confirmation.bookingId || '—'}
          </p>
          {confirmation.status ? (
            <p className="mt-1 text-xs text-slate-500">
              Stato: {confirmation.status}
            </p>
          ) : null}
        </div>
        {draft ? (
          <p className="text-sm text-slate-600">
            {draft.origin} → {draft.destination}
            {draft.airline ? ` · ${draft.airline}` : ''}
          </p>
        ) : null}
        <Button asChild className="w-full rounded-xl">
          <Link href="/prenota/voli">Nuova ricerca</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <Link
          href="/prenota/voli"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0770e3]"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna ai risultati
        </Link>

        {step === 'details' ? (
          <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Dati passeggeri
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Come sul documento di viaggio. Poi procedi al pagamento.
              </p>
            </div>

            {verifying ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#0770e3]" />
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

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Email contatto
                </span>
                <Input
                  type="email"
                  value={contact.email}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, email: e.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Nome contatto
                </span>
                <Input
                  value={contact.firstName}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, firstName: e.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Cognome contatto
                </span>
                <Input
                  value={contact.lastName}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, lastName: e.target.value }))
                  }
                  className="h-11 rounded-xl"
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
                  className="h-11 rounded-xl"
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
                  className="h-11 rounded-xl"
                  placeholder="3331234567"
                />
              </label>
            </div>

            {passengers.map((p, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <p className="text-sm font-semibold text-slate-800">
                  Passeggero {idx + 1}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Nome"
                    value={p.firstName}
                    onChange={(e) =>
                      updatePassenger(idx, { firstName: e.target.value })
                    }
                    className="h-11 rounded-xl bg-white"
                  />
                  <Input
                    placeholder="Cognome"
                    value={p.lastName}
                    onChange={(e) =>
                      updatePassenger(idx, { lastName: e.target.value })
                    }
                    className="h-11 rounded-xl bg-white"
                  />
                  <label className="space-y-1">
                    <span className="text-[11px] text-slate-500">Nascita</span>
                    <Input
                      type="date"
                      value={p.birthday}
                      onChange={(e) =>
                        updatePassenger(idx, { birthday: e.target.value })
                      }
                      className="h-11 rounded-xl bg-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-slate-500">Genere</span>
                    <select
                      value={p.gender}
                      onChange={(e) =>
                        updatePassenger(idx, {
                          gender: e.target.value as 'M' | 'F',
                        })
                      }
                      className="flex h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
                    >
                      <option value="M">Maschio</option>
                      <option value="F">Femmina</option>
                    </select>
                  </label>
                  <Input
                    placeholder="Nazionalità (IT)"
                    value={p.nationality}
                    maxLength={2}
                    onChange={(e) =>
                      updatePassenger(idx, {
                        nationality: e.target.value.toUpperCase(),
                      })
                    }
                    className="h-11 rounded-xl bg-white"
                  />
                  <Input
                    placeholder="N. documento"
                    value={p.documentNumber}
                    onChange={(e) =>
                      updatePassenger(idx, { documentNumber: e.target.value })
                    }
                    className="h-11 rounded-xl bg-white"
                  />
                  <Input
                    placeholder="Paese emissione (IT)"
                    value={p.documentIssueCountry}
                    maxLength={2}
                    onChange={(e) =>
                      updatePassenger(idx, {
                        documentIssueCountry: e.target.value.toUpperCase(),
                      })
                    }
                    className="h-11 rounded-xl bg-white"
                  />
                  <label className="space-y-1">
                    <span className="text-[11px] text-slate-500">
                      Scadenza documento
                    </span>
                    <Input
                      type="date"
                      value={p.documentExpiry}
                      onChange={(e) =>
                        updatePassenger(idx, { documentExpiry: e.target.value })
                      }
                      className="h-11 rounded-xl bg-white"
                    />
                  </label>
                </div>
              </div>
            ))}

            <Button
              type="button"
              disabled={verifying || submitting}
              onClick={() => void startPrebook()}
              className="h-12 w-full rounded-xl bg-[#0770e3] text-base font-semibold hover:bg-[#0558b8]"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Continua al pagamento
            </Button>
          </div>
        ) : null}

        {step === 'payment' && payment && stripePromise ? (
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Pagamento
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Totale{' '}
                <span className="font-semibold text-slate-800">
                  {formatMoney(
                    payment.price ?? displayPrice,
                    payment.currency ?? displayCurrency
                  )}
                </span>
              </p>
            </div>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: payment.secretKey,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#0770e3',
                    borderRadius: '12px',
                  },
                },
              }}
            >
              <PaymentStep onPaid={finalizeBooking} />
            </Elements>
            {submitting ? (
              <p className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Conferma prenotazione in corso…
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Summary sidebar */}
      {draft ? (
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Riepilogo volo
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Plane className="h-4 w-4 text-[#0770e3]" />
            <p className="text-sm font-semibold text-slate-900">
              {draft.airline || draft.airlineCode || 'Volo'}
              {draft.flightNumber ? ` · ${draft.flightNumber}` : ''}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {formatTime(draft.departureAt)}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {draft.origin}
              </p>
            </div>
            <div className="h-px flex-1 bg-slate-200" />
            <div className="text-right">
              <p className="font-display text-2xl font-semibold tabular-nums">
                {formatTime(draft.arrivalAt)}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {draft.destination}
              </p>
            </div>
          </div>
          {draft.departureAt ? (
            <p className="mt-3 text-xs text-slate-500">
              {format(parseISO(draft.departureAt.slice(0, 10)), 'EEEE d MMMM yyyy', {
                locale: it,
              })}
            </p>
          ) : null}
          <div
            className={cn(
              'mt-5 rounded-2xl bg-[#052e6b] px-4 py-3 text-white'
            )}
          >
            <p className="text-[11px] uppercase tracking-wider text-white/70">
              Totale
            </p>
            <p className="font-display text-2xl font-semibold">
              {formatMoney(displayPrice, displayCurrency)}
            </p>
            <p className="text-[11px] text-white/60">
              {draft.adults} {draft.adults === 1 ? 'passeggero' : 'passeggeri'}
            </p>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
