/** Stripe PaymentElement richiede un client secret PI, non il secret LiteAPI. */
export function isStripeClientSecret(value?: string | null): boolean {
  if (!value) return false;
  return /_secret_/.test(value) || value.startsWith('pi_');
}
