'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  BedDouble,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { LiteApiPaymentWidget } from '@/components/travel/LiteApiPaymentWidget';
import { BookingCashbackNote } from '@/components/commerce/BookingCashbackNote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  clearHotelOfferDraft,
  clearHotelPaymentPending,
  loadHotelOfferDraft,
  loadHotelPaymentPending,
  saveHotelPaymentPending,
  type HotelOfferDraft,
} from '@/lib/travel/hotel-offer-draft';

type Step = 'details' | 'payment' | 'done';

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

function formatMoney(amount: number, currency: string) {
  return `${roundMoney(amount).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
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
              ? `${window.location.origin}/prenota/hotel/checkout`
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
      <PaymentElement options={{ layout: 'tabs' }} />
      <Button
        type="button"
        disabled={!stripe || busy}
        onClick={() => void pay()}
        className="h-12 w-full rounded-xl text-base font-semibold"
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="mr-2 h-4 w-4" />
        )}
        Paga e conferma
      </Button>
    </div>
  );
}

export function HotelCheckoutClient({
  defaultEmail = '',
}: {
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<HotelOfferDraft | null>(null);
  const [step, setStep] = useState<Step>('details');
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');

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
  } | null>(null);

  const stripePromise = useMemo(() => {
    if (!payment?.publishableKey || payment.paymentMode !== 'stripe_elements') {
      return null;
    }
    return loadStripe(payment.publishableKey) as Promise<Stripe | null>;
  }, [payment?.paymentMode, payment?.publishableKey]);

  const displayPrice = roundMoney(
    payment?.price ?? draft?.totalAmount ?? 0
  );
  const displayCurrency = payment?.currency ?? draft?.currency ?? 'EUR';

  const finalizeBooking = useCallback(
    async (
      prebookId: string,
      transactionId: string,
      holderOverride?: {
        firstName: string;
        lastName: string;
        email: string;
        guestFirstName?: string;
        guestLastName?: string;
      }
    ) => {
      const hFirst = holderOverride?.firstName || firstName;
      const hLast = holderOverride?.lastName || lastName;
      const hEmail = holderOverride?.email || email;
      if (!hFirst || !hLast || !hEmail) {
        toast.error('Completa i dati del titolare');
        return;
      }
      setSubmitting(true);
      try {
        const guestFn =
          holderOverride?.guestFirstName || guestFirstName || hFirst;
        const guestLn =
          holderOverride?.guestLastName || guestLastName || hLast;
        const amountEur =
          loadHotelPaymentPending()?.price ??
          loadHotelOfferDraft()?.totalAmount ??
          0;
        const res = await fetch('/api/liteapi/hotels/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            prebookId,
            transactionId,
            holder: { firstName: hFirst, lastName: hLast, email: hEmail },
            guests: [
              {
                firstName: guestFn,
                lastName: guestLn,
                email: hEmail,
                occupancyNumber: 1,
              },
            ],
            amountEur,
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
        });
        clearHotelOfferDraft();
        clearHotelPaymentPending();
        setStep('done');
        toast.success('Hotel prenotato');
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
    [email, firstName, guestFirstName, guestLastName, lastName]
  );

  useEffect(() => {
    const d = loadHotelOfferDraft();
    setDraft(d);

    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paid = params.get('paid') === '1';
    const tid = params.get('tid');
    const pending = loadHotelPaymentPending();
    if (pending) {
      setPayment(pending);
      setFirstName(pending.holder.firstName);
      setLastName(pending.holder.lastName);
      setEmail(pending.holder.email);
      setGuestFirstName(pending.guest.firstName);
      setGuestLastName(pending.guest.lastName);
      setStep('payment');
      if (paid && (!tid || tid === pending.transactionId)) {
        void finalizeBooking(pending.prebookId, pending.transactionId, {
          firstName: pending.holder.firstName,
          lastName: pending.holder.lastName,
          email: pending.holder.email,
          guestFirstName: pending.guest.firstName,
          guestLastName: pending.guest.lastName,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPrebook = async () => {
    if (!draft) return;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Compila nome, cognome ed email');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/liteapi/hotels/prebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ offerId: draft.offerId }),
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
        toast.error(data.error ?? 'Impossibile riservare l’hotel');
        if (data.code === 'offer_expired') {
          clearHotelOfferDraft();
          router.push('/prenota/hotel');
        }
        return;
      }
      if (!data.prebookId || !data.transactionId || !data.secretKey) {
        toast.error('Risposta pagamento incompleta');
        return;
      }
      const paymentEnv = data.paymentEnv ?? 'sandbox';
      const paymentMode: 'stripe_elements' | 'liteapi_sdk' = data.publishableKey
        ? 'stripe_elements'
        : 'liteapi_sdk';
      const pending = {
        prebookId: data.prebookId,
        transactionId: data.transactionId,
        secretKey: data.secretKey,
        publishableKey: data.publishableKey ?? null,
        paymentEnv,
        paymentMode,
        price: roundMoney(data.price ?? draft.totalAmount),
        currency: data.currency ?? draft.currency,
        holder: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
        },
        guest: {
          firstName: (guestFirstName || firstName).trim(),
          lastName: (guestLastName || lastName).trim(),
        },
        createdAt: Date.now(),
      };
      saveHotelPaymentPending(pending);
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
      ? `${window.location.origin}/prenota/hotel/checkout?paid=1&tid=${encodeURIComponent(payment.transactionId)}`
      : null;

  if (!draft && step !== 'done') {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nessuna offerta hotel selezionata.
        </p>
        <Button
          className="mt-4 rounded-xl"
          onClick={() => router.push('/prenota/hotel')}
        >
          Torna alla ricerca
        </Button>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="font-display text-2xl font-semibold">Prenotazione confermata</h2>
        <p className="text-sm text-muted-foreground">
          {confirmation?.bookingRef
            ? `Codice: ${confirmation.bookingRef}`
            : confirmation?.bookingId
              ? `ID: ${confirmation.bookingId}`
              : 'Riceverai i dettagli via email.'}
        </p>
        <BookingCashbackNote />
        <Button className="rounded-xl" onClick={() => router.push('/prenota/hotel')}>
          Altre ricerche
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {step === 'details' ? (
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="bg-gradient-to-r from-[oklch(0.22_0.05_220)] to-primary px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Passo 1 di 2
              </p>
              <h2 className="mt-0.5 font-display text-xl font-semibold">
                Ospiti e contatto
              </h2>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <Label>Nome titolare</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <Label>Cognome titolare</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </label>
              </div>
              <label className="space-y-1.5 text-sm">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </label>
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ospite in camera (se diverso)
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Nome ospite"
                    value={guestFirstName}
                    onChange={(e) => setGuestFirstName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <Input
                    placeholder="Cognome ospite"
                    value={guestLastName}
                    onChange={(e) => setGuestLastName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void startPrebook()}
                className="h-12 w-full rounded-xl text-base font-semibold"
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
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="bg-gradient-to-r from-[oklch(0.22_0.05_220)] to-primary px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Passo 2 di 2
              </p>
              <h2 className="mt-0.5 font-display text-xl font-semibold">Pagamento</h2>
              <p className="mt-1 text-sm text-white/75">
                Totale{' '}
                <span className="font-semibold text-white">
                  {formatMoney(displayPrice, displayCurrency)}
                </span>
              </p>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              {payment.paymentMode === 'stripe_elements' &&
              payment.publishableKey &&
              stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: payment.secretKey,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#365f73',
                        borderRadius: '12px',
                      },
                    },
                  }}
                >
                  <PaymentStep
                    onPaid={() =>
                      finalizeBooking(payment.prebookId, payment.transactionId)
                    }
                  />
                </Elements>
              ) : paymentReturnUrl ? (
                <LiteApiPaymentWidget
                  key={payment.secretKey}
                  secretKey={payment.secretKey}
                  paymentEnv={payment.paymentEnv}
                  returnUrl={paymentReturnUrl}
                />
              ) : null}
              {submitting ? (
                <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conferma prenotazione in corso…
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {draft ? (
        <aside className="h-fit space-y-3 rounded-3xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Riepilogo
            </p>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
            {draft.photo ? (
              <Image
                src={draft.photo}
                alt=""
                fill
                className="object-cover"
                sizes="320px"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/40">
                <BedDouble className="h-10 w-10" />
              </div>
            )}
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-snug">
              {draft.name}
            </p>
            {(draft.city || draft.address) && (
              <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{draft.address || draft.city}</span>
              </p>
            )}
            {draft.stars != null && draft.stars > 0 ? (
              <p className="mt-1 inline-flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: Math.min(5, Math.round(draft.stars)) }).map(
                  (_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  )
                )}
              </p>
            ) : null}
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              {draft.checkin} → {draft.checkout}
            </p>
            <p>{draft.roomName}</p>
            {draft.boardName ? <p>{draft.boardName}</p> : null}
            <p>
              {draft.adults} {draft.adults === 1 ? 'ospite' : 'ospiti'}
            </p>
          </div>
          <div className="rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
            <p className="text-[11px] uppercase tracking-wider text-white/70">
              Totale
            </p>
            <p className="font-display text-2xl font-semibold">
              {formatMoney(displayPrice, displayCurrency)}
            </p>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
