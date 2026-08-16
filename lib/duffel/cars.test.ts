import { describe, expect, it } from 'vitest';
import {
  canBookWithoutCard,
  formatMoneyAmount,
  mapCarRates,
  normalizePhoneE164,
  paymentTypeLabel,
  type DuffelCarRate,
} from '@/lib/duffel/cars-map';
import { buildCarsSearchBody } from '@/lib/duffel/cars-map';

describe('payment helpers', () => {
  it('only postpaid books without a card', () => {
    expect(canBookWithoutCard('postpaid')).toBe(true);
    expect(canBookWithoutCard('guarantee')).toBe(false);
    expect(canBookWithoutCard('prepaid')).toBe(false);
  });

  it('labels payment types in Italian', () => {
    expect(paymentTypeLabel('postpaid')).toBe('Paga al ritiro');
    expect(paymentTypeLabel('guarantee')).toBe('Carta a garanzia');
    expect(paymentTypeLabel('prepaid')).toBe('Paga ora');
  });

  it('formats EUR in it-IT', () => {
    expect(formatMoneyAmount(101.34, 'EUR')).toMatch(/101/);
  });
});

describe('normalizePhoneE164', () => {
  it('adds +39 for Italian mobiles', () => {
    expect(normalizePhoneE164('347 123 4567')).toBe('+393471234567');
  });

  it('keeps valid E.164', () => {
    expect(normalizePhoneE164('+447771231234')).toBe('+447771231234');
  });

  it('rejects short numbers', () => {
    expect(normalizePhoneE164('123')).toBeNull();
  });
});

describe('mapCarRates', () => {
  it('sorts postpaid first then by price', () => {
    const rates: DuffelCarRate[] = [
      {
        id: 'rae_pre',
        payment_type: 'prepaid',
        total_amount: '50.00',
        total_currency: 'EUR',
        car: { name: 'A', category: 'economy' },
        supplier: { name: 'Sixt' },
      },
      {
        id: 'rae_post_hi',
        payment_type: 'postpaid',
        total_amount: '90.00',
        total_currency: 'EUR',
        car: { name: 'B', category: 'suv' },
        supplier: { name: 'Hertz' },
      },
      {
        id: 'rae_post_lo',
        payment_type: 'postpaid',
        total_amount: '40.00',
        total_currency: 'EUR',
        car: { name: 'C', category: 'mini' },
        supplier: { name: 'Avis' },
      },
    ];
    const mapped = mapCarRates(rates);
    expect(mapped.map((r) => r.id)).toEqual(['rae_post_lo', 'rae_post_hi', 'rae_pre']);
    expect(mapped[0]?.categoryLabel).toBe('Mini');
    expect(mapped[0]?.bookableWithoutCard).toBe(true);
    expect(mapped[2]?.bookableWithoutCard).toBe(false);
  });
});

describe('buildCarsSearchBody', () => {
  it('wraps coordinates and driver', () => {
    const body = buildCarsSearchBody({
      pickupDate: '2026-09-05',
      pickupTime: '10:00',
      dropoffDate: '2026-09-10',
      dropoffTime: '18:00',
      pickup: { lat: 41.8, lng: 12.25 },
      dropoff: { lat: 41.8, lng: 12.25 },
      driverAge: 32,
      residenceCountryCode: 'it',
      radiusKm: 8,
    });
    expect(body.data.driver).toEqual({
      age: 32,
      residence_country_code: 'IT',
    });
    expect(body.data.pickup_location.geographic_coordinates).toEqual({
      latitude: 41.8,
      longitude: 12.25,
    });
  });
});
