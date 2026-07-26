'use client';

import { useEffect, useRef, useState } from 'react';
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
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    void (async () => {
      try {
        await loadPaymentScript();
        if (cancelled) return;
        if (!window.LiteAPIPayment) {
          throw new Error('Payment SDK non disponibile');
        }
        const payment = new window.LiteAPIPayment({
          publicKey: paymentEnv,
          appearance: { theme: 'flat' },
          options: { business: { name: businessName } },
          targetElement: '#nomadlink-flight-payment',
          secretKey,
          returnUrl,
        });
        payment.handlePayment();
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore caricamento pagamento');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessName, paymentEnv, returnUrl, secretKey]);

  return (
    <div className="space-y-3">
      {!ready && !error ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#0770e3]" />
          Caricamento form di pagamento…
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div id="nomadlink-flight-payment" className="min-h-[220px]" />
      {paymentEnv === 'sandbox' ? (
        <p className="text-center text-[11px] text-slate-500">
          Sandbox: usa carta test 4242 4242 4242 4242, qualsiasi CVC e data futura.
        </p>
      ) : null}
    </div>
  );
}
