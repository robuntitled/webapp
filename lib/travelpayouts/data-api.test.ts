import { describe, expect, it } from 'vitest';

function extractCheapest(
  data: Record<string, Record<string, { price: number; airline?: string }>> | null
) {
  if (!data) return null;
  let cheapest: { price: number; airline?: string } | null = null;
  for (const bucket of Object.values(data)) {
    for (const entry of Object.values(bucket)) {
      if (!cheapest || entry.price < cheapest.price) cheapest = entry;
    }
  }
  return cheapest;
}

describe('Travelpayouts cheap ticket parsing', () => {
  it('picks the lowest price across buckets', () => {
    const cheapest = extractCheapest({
      BKK: {
        '0': { price: 520, airline: 'TG' },
        '1': { price: 480, airline: 'QR' },
      },
      HKT: {
        '0': { price: 610, airline: 'TG' },
      },
    });

    expect(cheapest?.price).toBe(480);
    expect(cheapest?.airline).toBe('QR');
  });
});