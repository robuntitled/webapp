import { describe, expect, it } from 'vitest';
import {
  calculateBookingCashback,
  centsToEuros,
  eurosToCents,
  formatCreditEuros,
} from '@/lib/credits/calc';

describe('calculateBookingCashback', () => {
  it('gives 3% of booking when margin 10% and cashback 30%', () => {
    // €400 → commission €40 → cashback €12
    const r = calculateBookingCashback({
      bookingAmountCents: 40000,
      marginPercent: 10,
      cashbackPercent: 30,
      maxCreditCents: 5000,
    });
    expect(r.commissionCents).toBe(4000);
    expect(r.creditCents).toBe(1200);
  });

  it('respects max cap', () => {
    const r = calculateBookingCashback({
      bookingAmountCents: 1_000_000,
      marginPercent: 10,
      cashbackPercent: 30,
      maxCreditCents: 500,
    });
    expect(r.creditCents).toBe(500);
  });

  it('returns zero for zero/negative amount', () => {
    expect(
      calculateBookingCashback({
        bookingAmountCents: 0,
        marginPercent: 10,
        cashbackPercent: 30,
        maxCreditCents: 5000,
      }).creditCents
    ).toBe(0);
  });
});

describe('money helpers', () => {
  it('converts euros <-> cents', () => {
    expect(eurosToCents(12.34)).toBe(1234);
    expect(centsToEuros(1234)).toBe(12.34);
  });

  it('formats EUR for it-IT', () => {
    expect(formatCreditEuros(1200, 'EUR')).toMatch(/12/);
  });
});
