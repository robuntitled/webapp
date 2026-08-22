'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchLiteApiStripePublishableKey } from '@/lib/liteapi/payment-wrapper';
import { isStripeClientSecret } from '@/lib/travel/stripe-client-secret';

type LiteApiPaymentCtor = new (config: {
  publicKey: 'sandbox' | 'live';
  appearance?: { theme?: string };
  options?: { business?: { name?: string } };
  targetElement: string;
  secretKey: string;
  returnUrl: string;
}) => { handlePayment: () => void };

declare global {
  interface Window {
    LiteAPIPayment?: LiteApiPaymentCtor;
  }
}

const SCRIPT_SRC = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';

function loadPaymentScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.LiteAPIPayment) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.LiteAPIPayment) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('SDK load failed')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('SDK load failed'));
    document.head.appendChild(script);
  });
}

function StripePayForm({ onPaid }: { onPaid?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setMessage(null);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: typeof window !== 'undefined' ? window.location.href : undefined,
        },
      });
      if (error) {
        setMessage(error.message ?? 'Pagamento non riuscito');
        return;
      }
      if (
        paymentIntent &&
        (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')
      ) {
        onPaid?.();
        return;
      }
      setMessage('Pagamento non completato. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {message ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <Button
        type="button"
        disabled={!stripe || busy}
        onClick={() => void pay()}
        className="h-12 w-full rounded-xl bg-primary text-base font-semibold"
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
        Paga e conferma
      </Button>
    </div>
  );
}

type LiteApiPaymentWidgetProps = {
  secretKey: string;
  paymentEnv: 'sandbox' | 'live';
  returnUrl: string;
  businessName?: string;
  publishableKey?: string | null;
  onPaid?: () => void;
};

export function LiteApiPaymentWidget({
  secretKey,
  paymentEnv,
  returnUrl,
  businessName = 'NomadLink',
  publishableKey,
  onPaid,
}: LiteApiPaymentWidgetProps) {
  const reactId = useId().replace(/:/g, '');
  const targetId = `nomadlink-payment-${reactId}`;
  const mounted = useRef(false);
  const [pk, setPk] = useState<string | null>(publishableKey ?? null);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const canUseStripe = Boolean(pk && isStripeClientSecret(secretKey));
  const stripePromise = useMemo(
    () => (canUseStripe && pk ? loadStripe(pk) : null),
    [canUseStripe, pk]
  );

  useEffect(() => {
    if (publishableKey) {
      setPk(publishableKey);
      return;
    }
    let cancelled = false;
    void fetchLiteApiStripePublishableKey(paymentEnv).then((key) => {
      if (!cancelled && key) setPk(key);
    });
    return () => {
      cancelled = true;
    };
  }, [paymentEnv, publishableKey]);

  useEffect(() => {
    if (canUseStripe) return;
    let cancelled = false;
    mounted.current = false;
    setSdkReady(false);
    setError(null);

    void (async () => {
      try {
        await loadPaymentScript();
        if (cancelled || !window.LiteAPIPayment) {
          throw new Error('Payment SDK non disponibile');
        }
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        const host = document.getElementById(targetId);
        if (!host) throw new Error('Contenitore pagamento non trovato');
        if (mounted.current) return;
        mounted.current = true;

        const payment = new window.LiteAPIPayment({
          publicKey: paymentEnv,
          appearance: { theme: 'flat' },
          options: { business: { name: businessName } },
          targetElement: `#${targetId}`,
          secretKey,
          returnUrl,
        });
        payment.handlePayment();

        const started = Date.now();
        while (!cancelled && Date.now() - started < 12000) {
          if (host.querySelector('iframe, form, input, .lp-submit-button')) {
            setSdkReady(true);
            return;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!cancelled) {
          setSdkReady(true);
          if (!host.querySelector('iframe, form, input, .lp-submit-button')) {
            setError('Il form carta non si è caricato. Riprova.');
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Errore caricamento pagamento');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, businessName, canUseStripe, paymentEnv, returnUrl, secretKey, targetId]);

  if (canUseStripe && stripePromise) {
    return (
      <div className="space-y-3">
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: secretKey,
            appearance: {
              theme: 'stripe',
              variables: { colorPrimary: '#0F766E', borderRadius: '12px' },
            },
          }}
        >
          <StripePayForm onPaid={onPaid} />
        </Elements>
        {paymentEnv === 'sandbox' ? (
          <p className="text-center text-[11px] text-muted-foreground">
            Sandbox: usa carta test 4242 4242 4242 4242, qualsiasi CVC e data futura.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!sdkReady && !error ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Caricamento form di pagamento…
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
          <button
            type="button"
            className="ml-2 font-semibold underline"
            onClick={() => {
              mounted.current = false;
              const el = document.getElementById(targetId);
              if (el) el.innerHTML = '';
              setAttempt((n) => n + 1);
            }}
          >
            Riprova
          </button>
        </p>
      ) : null}
      <div
        id={targetId}
        className="min-h-[320px] rounded-2xl bg-white p-2 [&_iframe]:min-h-[300px] [&_iframe]:w-full"
        aria-busy={!sdkReady && !error}
      />
      {paymentEnv === 'sandbox' ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Sandbox: usa carta test 4242 4242 4242 4242, qualsiasi CVC e data futura.
        </p>
      ) : null}
    </div>
  );
}
