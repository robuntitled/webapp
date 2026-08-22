'use client';

import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const LITEAPI_PAYMENT_ELEMENT_OPTIONS = {
  layout: 'tabs' as const,
  wallets: {
    applePay: 'auto' as const,
    googlePay: 'auto' as const,
    link: 'never' as const,
  },
  fields: {
    billingDetails: 'auto' as const,
  },
};

export function LiteApiStripePayForm({
  returnUrl,
  onPaid,
}: {
  returnUrl: string;
  onPaid?: () => void | Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mountKey, setMountKey] = useState(0);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setMessage(null);
    try {
      const submitted = await elements.submit();
      if (submitted.error) {
        setMessage(submitted.error.message ?? 'Controlla i dati della carta.');
        return;
      }

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      });

      if (result.error) {
        setMessage(result.error.message ?? 'Pagamento non riuscito');
        setMountKey((k) => k + 1);
        return;
      }

      await onPaid?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Pagamento non riuscito. Riprova.');
      setMountKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="min-h-[280px] rounded-xl bg-white p-1 [&_iframe]:min-h-[220px] [&_iframe]:w-full">
        <PaymentElement key={mountKey} options={LITEAPI_PAYMENT_ELEMENT_OPTIONS} />
      </div>
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
