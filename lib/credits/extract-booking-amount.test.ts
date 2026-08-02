import { describe, expect, it } from 'vitest';
import { extractBookingAmount } from '@/lib/credits/extract-booking-amount';

describe('extractBookingAmount', () => {
  it('reads pricing.display.total', () => {
    expect(
      extractBookingAmount({
        data: { pricing: { display: { total: 199.5, currency: 'eur' } } },
      })
    ).toEqual({ amount: 199.5, currency: 'EUR' });
  });

  it('reads nested booking price', () => {
    expect(
      extractBookingAmount({
        data: { booking: { price: { total: 88, currency: 'EUR' } } },
      })
    ).toEqual({ amount: 88, currency: 'EUR' });
  });

  it('returns nulls when missing', () => {
    expect(extractBookingAmount({})).toEqual({ amount: null, currency: null });
  });
});
