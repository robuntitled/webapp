import { describe, expect, it } from 'vitest';
import {
  parsePriceFloat,
  parseRouteInfoOffers,
  transportLabelIt,
} from '@/lib/gettransfer/route-info';

const SAMPLE_RESPONSE = {
  Result: 'success',
  Data: {
    status: 'OK',
    distance: 33,
    duration: 65,
    success: true,
    prices: {
      economy: {
        min: '€191',
        min_float: 191,
        book_now: '€219',
      },
      comfort: {
        min: '€213',
        min_float: 213,
      },
      business: {
        min: '€246',
        min_float: 246,
        book_now: '€659',
      },
      suv: {},
      van: {
        min: '€258',
        min_float: 258,
      },
    },
  },
};

describe('parsePriceFloat', () => {
  it('parses European formatted prices', () => {
    expect(parsePriceFloat('€455')).toBe(455);
    expect(parsePriceFloat('€4,659')).toBe(4659);
    expect(parsePriceFloat('€2.701')).toBe(2701);
  });
});

describe('transportLabelIt', () => {
  it('returns Italian labels', () => {
    expect(transportLabelIt('economy')).toBe('Economy');
    expect(transportLabelIt('bus')).toBe('Autobus');
  });
});

describe('parseRouteInfoOffers', () => {
  it('extracts offers sorted by price', () => {
    const { offers, distance, duration, success } =
      parseRouteInfoOffers(SAMPLE_RESPONSE);

    expect(success).toBe(true);
    expect(distance).toBe(33);
    expect(duration).toBe(65);
    expect(offers.length).toBe(4);
    expect(offers[0].transportType).toBe('economy');
    expect(offers[0].priceLabel).toBe('€219');
    expect(offers[0].bookNow).toBe('€219');
    expect(offers.map((o) => o.transportType)).not.toContain('suv');
  });

  it('handles lowercase result/data keys', () => {
    const { offers } = parseRouteInfoOffers({
      result: 'success',
      data: {
        success: true,
        prices: {
          economy: { min: '€100', min_float: 100 },
        },
      },
    });
    expect(offers).toHaveLength(1);
    expect(offers[0].labelIt).toBe('Economy');
  });

  it('returns empty for invalid payload', () => {
    expect(parseRouteInfoOffers(null).offers).toEqual([]);
    expect(parseRouteInfoOffers({ foo: 'bar' }).success).toBe(false);
  });
});
