import { describe, expect, it } from 'vitest';
import { resolveBookedAmount } from '@/lib/liteapi/prebook-store';

describe('resolveBookedAmount', () => {
  it('prefers book response price', () => {
    const r = resolveBookedAmount({
      bookPrice: 120,
      bookCurrency: 'EUR',
      quote: {
        userId: 'u',
        kind: 'flight',
        offerId: 'o',
        price: 99,
        currency: 'EUR',
        createdAt: 'x',
      },
      clientAmountEur: 80,
    });
    expect(r.amountEur).toBe(120);
  });

  it('falls back to quote then client', () => {
    expect(
      resolveBookedAmount({
        bookPrice: null,
        quote: {
          userId: 'u',
          kind: 'flight',
          offerId: 'o',
          price: 95,
          currency: 'EUR',
          createdAt: 'x',
        },
      }).amountEur
    ).toBe(95);

    expect(
      resolveBookedAmount({
        bookPrice: null,
        quote: null,
        clientAmountEur: 88,
        clientCurrency: 'EUR',
      }).amountEur
    ).toBe(88);
  });

  it('returns null when nothing available', () => {
    expect(
      resolveBookedAmount({ bookPrice: null, quote: null, clientAmountEur: null })
        .amountEur
    ).toBeNull();
  });
});
