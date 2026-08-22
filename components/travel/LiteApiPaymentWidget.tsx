'use client';

import { useEffect, useId, useState } from 'react';
import { Loader2 } from 'lucide-react';

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

const SCRIPT_SRC =
  'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';

function loadPaymentScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.LiteAPIPayment) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${SCRIPT_SRC}"]`
  );
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

type LiteApiPaymentWidgetProps = {
  secretKey: string;
  paymentEnv: 'sandbox' | 'live';
  returnUrl: string;
  businessName?: string;
};

export function LiteApiPaymentWidget({
  secretKey,
  paymentEnv,
  returnUrl,
  businessName = 'NomadLink',
}: LiteApiPaymentWidgetProps) {
  const reactId = useId().replace(/:/g, '');
  const targetId = `nomadlink-payment-${reactId}`;
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    const target = document.getElementById(targetId);
    if (target) target.innerHTML = '';

    void (async () => {
      try {
        await loadPaymentScript();
        if (cancelled) return;
        if (!window.LiteAPIPayment) {
          throw new Error('Payment SDK non disponibile');
        }
        // Attendi un frame così il target è montato (Strict Mode / HMR)
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        if (cancelled) return;
        if (!document.getElementById(targetId)) {
          throw new Error('Contenitore pagamento non trovato');
        }

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
        while (!cancelled && Date.now() - started < 8000) {
          const host = document.getElementById(targetId);
          if (host?.querySelector('iframe, form, input, .StripeElement')) {
            if (!cancelled) setReady(true);
            return;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!cancelled) {
          setReady(true);
          if (!document.getElementById(targetId)?.querySelector('iframe, form, input')) {
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
      const el = document.getElementById(targetId);
      if (el) el.innerHTML = '';
    };
  }, [attempt, businessName, paymentEnv, returnUrl, secretKey, targetId]);

  return (
    <div className="space-y-3">
      {!ready && !error ? (
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
            onClick={() => setAttempt((n) => n + 1)}
          >
            Riprova
          </button>
        </p>
      ) : null}
      <div
        id={targetId}
        className="min-h-[320px] rounded-2xl bg-white p-2 [&_iframe]:min-h-[300px] [&_iframe]:w-full"
        aria-busy={!ready && !error}
      />
      {paymentEnv === 'sandbox' ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Sandbox: usa carta test 4242 4242 4242 4242, qualsiasi CVC e data futura.
        </p>
      ) : null}
    </div>
  );
}
