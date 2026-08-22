/** Chiave Stripe di Nuitee/LiteAPI (non quella del nostro account). */
const CONFIG_URL = 'https://payment-wrapper.liteapi.travel/config';

export async function fetchLiteApiStripePublishableKey(
  env: 'sandbox' | 'live'
): Promise<string | null> {
  const res = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: env }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { publicKey?: unknown };
  const key = typeof data.publicKey === 'string' ? data.publicKey.trim() : '';
  return key.startsWith('pk_') ? key : null;
}
