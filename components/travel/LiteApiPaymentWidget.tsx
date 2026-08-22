'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchLiteApiStripePublishableKey } from '@/lib/liteapi/payment-wrapper';

type StripeLike = {
  elements: (opts: Record<string, unknown>) => {
    create: (type: string, opts?: Record<string, unknown>) => {
      mount: (el: HTMLElement) => void;
      unmount?: () => void;
      on: (event: string, handler: () => void) => void;
    };
    submit: () => Promise<{ error?: { message?: string } }>;
  };
  confirmPayment: (opts: {
    elements: unknown;
    confirmParams: { return_url: string };
  }) => Promise<{ error?: { message?: string } }>;
};

declare global {
  interface Window {
    Stripe?: (pk: string, opts?: { apiVersion?: string }) => StripeLike;
  }
}

const STRIPE_JS = 'https://js.stripe.com/v3';

function loadStripeJs(): Promise<NonNullable<Window['Stripe']>> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.Stripe) return Promise.resolve(window.Stripe);
  const existing = document.querySelector<HTMLScriptElement>(`script[src^="${STRIPE_JS}"]`);
  return new Promise((resolve, reject) => {
    const onReady = () => {
      if (window.Stripe) resolve(window.Stripe);
      else reject(new Error('Stripe.js non disponibile'));
    };
    if (existing) {
      if (window.Stripe) onReady();
      else existing.addEventListener('load', onReady, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = STRIPE_JS;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => reject(new Error('Stripe.js load failed'));
    document.head.appendChild(script);
  });
}

type LiteApiPaymentWidgetProps = {
  secretKey: string;
  paymentEnv: 'sandbox' | 'live';
  returnUrl: string;
  businessName?: string;
};

/**
 * Carta + wallet sul PaymentIntent LiteAPI.
 * Usa Stripe.js v3 (come il wrapper Nuitee), non @stripe/stripe-js v9 / Checkout Sessions.
 */
export function LiteApiPaymentWidget({
  secretKey,
  paymentEnv,
  returnUrl,
}: LiteApiPaymentWidgetProps) {
  const reactId = useId().replace(/:/g, '');
  const expressId = `nl-pay-express-${reactId}`;
  const cardId = `nl-pay-card-${reactId}`;
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const stripeRef = useRef<StripeLike | null>(null);
  const elementsRef = useRef<ReturnType<StripeLike['elements']> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    void (async () => {
      try {
        const pk = await fetchLiteApiStripePublishableKey(paymentEnv);
        if (!pk) throw new Error('Chiave pagamento LiteAPI non disponibile.');
        const StripeCtor = await loadStripeJs();
        if (cancelled) return;
        const stripe = StripeCtor(pk, { apiVersion: '2023-10-16' });
        stripeRef.current = stripe;
        const elements = stripe.elements({
          clientSecret: secretKey,
          locale: 'it',
          appearance: {
            theme: 'stripe',
            variables: { colorPrimary: '#365f73', borderRadius: '12px' },
          },
        });
        elementsRef.current = elements;

        const expressHost = document.getElementById(expressId);
        const cardHost = document.getElementById(cardId);
        if (!expressHost || !cardHost) throw new Error('Contenitore pagamento non trovato');

        try {
          const express = elements.create('expressCheckout', {
            buttonType: { applePay: 'buy', googlePay: 'buy', paypal: 'buynow' },
            wallets: { applePay: 'always', googlePay: 'always', paypal: 'auto' },
            layout: 'auto',
            buttonTheme: { applePay: 'black', googlePay: 'black' },
            buttonHeight: 48,
          });
          express.mount(expressHost);
          express.on('confirm', () => {
            void confirm(returnUrl);
          });
        } catch {
          // Wallet non disponibili: resta la carta.
        }

        const payment = elements.create('payment', {
          layout: 'tabs',
          wallets: { applePay: 'never', googlePay: 'never', link: 'never' },
          defaultValues: {
            billingDetails: { address: { country: 'IT' } },
          },
        });
        payment.mount(cardHost);
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Errore caricamento pagamento');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cardId, expressId, paymentEnv, returnUrl, secretKey]);

  async function confirm(url: string) {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    try {
      const submitted = await elements.submit();
      if (submitted.error) {
        setError(submitted.error.message ?? 'Controlla i dati della carta.');
        return;
      }
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: url },
      });
      if (result.error) {
        setError(result.error.message ?? 'Pagamento non riuscito. Riprova con un prebook nuovo.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pagamento non riuscito.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!ready && !error ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Caricamento form di pagamento…
        </div>
      ) : null}
      <div id={expressId} className="min-h-[8px]" />
      <div
        id={cardId}
        className="min-h-[220px] [&_iframe]:min-h-[200px] [&_iframe]:w-full"
      />
      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void confirm(returnUrl)}
        className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Paga e conferma
      </button>
      {paymentEnv === 'sandbox' ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Sandbox: carta test 4242 4242 4242 4242, qualsiasi CVC e data futura. Paese: Italia.
        </p>
      ) : null}
    </div>
  );
}
