import { describe, expect, it } from 'vitest';
import { resolveBookedAmount } from '@/lib/liteapi/prebook-store';

describe('resolveBookedAmount', () => {
  it('prefers book response over quote and never invents client values', () => {
    expect(
      resolveBookedAmount({
        bookPrice: 199.5,
        bookCurrency: 'EUR',
        quote: {
          userId: 'u',
          kind: 'flight',
          offerId: 'off',
          price: 150,
          currency: 'USD',
          createdAt: new Date().toISOString(),
        },
      })
    ).toEqual({ amountEur: 199.5, currency: 'EUR', offerId: 'off' });
  });

  it('falls back to quote then null', () => {
    expect(
      resolveBookedAmount({
        quote: {
          userId: 'u',
          kind: 'hotel',
          offerId: 'h1',
          price: 88,
          currency: 'EUR',
          createdAt: new Date().toISOString(),
        },
      })
    ).toEqual({ amountEur: 88, currency: 'EUR', offerId: 'h1' });

    expect(resolveBookedAmount({})).toEqual({
      amountEur: null,
      currency: null,
      offerId: null,
    });
  });
});
