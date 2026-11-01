import { describe, expect, it } from 'vitest';
import {
  formatHotelCancellationLabel,
  parseTaxesAndFees,
  payAtPropertyLines,
  taxesIncludedLabel,
} from '@/lib/liteapi/hotel-rate-disclosures';

describe('hotel rate disclosures', () => {
  it('parseTaxesAndFees returns null when field missing', () => {
    expect(parseTaxesAndFees(undefined)).toBeNull();
    expect(parseTaxesAndFees(null)).toBeNull();
  });

  it('taxesIncludedLabel when all included', () => {
    const fees = parseTaxesAndFees([
      { included: true, description: 'IVA', amount: 10, currency: 'EUR' },
    ]);
    expect(taxesIncludedLabel(fees)).toBe('Tasse incluse.');
    expect(payAtPropertyLines(fees)).toEqual([]);
  });

  it('pay at property line for excluded fee', () => {
    const fees = parseTaxesAndFees([
      { included: true, description: 'IVA', amount: 10, currency: 'EUR' },
      { included: false, description: 'Tassa di soggiorno', amount: 5, currency: 'EUR' },
    ]);
    expect(taxesIncludedLabel(fees)).toBeNull();
    expect(payAtPropertyLines(fees)).toEqual([
      'Da pagare in struttura: Tassa di soggiorno 5,00 EUR',
    ]);
  });

  it('formatHotelCancellationLabel', () => {
    expect(formatHotelCancellationLabel({ refundable: false })).toBe(
      'Tariffa non rimborsabile'
    );
    expect(
      formatHotelCancellationLabel({
        refundable: true,
        freeCancelUntil: '2026-06-01T23:59:00',
      })
    ).toMatch(/Cancellazione gratuita fino al 1 giugno 2026/);
  });
});
