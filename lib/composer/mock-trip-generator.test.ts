import { describe, expect, it } from 'vitest';
import { generateMockTrip, type MockTripContext } from '@/lib/composer/mock-trip-generator';
import { resolveDestinationContext } from '@/lib/composer/destination-context';
import { containsVagueAirport } from '@/lib/composer/trip-schema';
import type { ComposerTripGenerateRequest } from '@/types/composer';

function makeCtx(overrides: Partial<MockTripContext> = {}, dayCount = 5): MockTripContext {
  const days = Array.from({ length: dayCount }, (_, i) => ({
    dayIndex: i + 1,
    date: `2026-09-0${i + 1}`,
  }));

  const req = {
    destination: 'Sydney, Australia',
    destinationMeta: {
      label: 'Sydney',
      lat: -33.87,
      lng: 151.21,
      country: 'Australia',
      countryCode: 'AU',
      placeType: 'city',
    },
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    days,
    planningMode: 'group',
    maxParticipants: 4,
  } as unknown as ComposerTripGenerateRequest;

  return {
    req,
    destination: resolveDestinationContext(req.destination, req.destinationMeta),
    originIata: 'FCO',
    originCity: 'Roma',
    roundtrip: true,
    ...overrides,
  };
}

describe('generateMockTrip', () => {
  it('fills every day in the range', () => {
    const trip = generateMockTrip(makeCtx({}, 5));

    expect(trip.days).toHaveLength(5);
    expect(trip.days.map((d) => d.dayIndex)).toEqual([1, 2, 3, 4, 5]);
    expect(trip.days.every((d) => d.blocks.length >= 3)).toBe(true);
    expect(trip.days.every((d) => Boolean(d.suggestedTitle))).toBe(true);
  });

  it('opens with the outbound flight, transfer and check-in', () => {
    const trip = generateMockTrip(makeCtx({}, 4));
    const first = trip.days[0];
    const types = first.blocks.map((b) => b.type);

    expect(types[0]).toBe('flight');
    expect(types).toContain('transport');
    expect(types).toContain('hotel');
    expect(first.blocks[0].content.origin).toBe('FCO');
    expect(first.blocks[0].content.destination).toBe('SYD');
    expect(String(first.blocks[0].content.title)).toContain('SYD');
  });

  it('closes with checkout, transfer to the airport and return flight', () => {
    const trip = generateMockTrip(makeCtx({}, 4));
    const last = trip.days[trip.days.length - 1];
    const types = last.blocks.map((b) => b.type);

    expect(types[0]).toBe('hotel');
    expect(last.blocks[0].content.hotelPhase).toBe('checkout');
    expect(types).toContain('transport');

    const flight = last.blocks.find((b) => b.type === 'flight');
    expect(flight?.content.origin).toBe('SYD');
    expect(flight?.content.destination).toBe('FCO');
  });

  it('omits the return flight for one-way trips', () => {
    const trip = generateMockTrip(makeCtx({ roundtrip: false }, 4));
    const last = trip.days[trip.days.length - 1];

    expect(last.blocks.some((b) => b.type === 'flight')).toBe(false);
    expect(last.blocks.some((b) => b.type === 'note')).toBe(true);
  });

  it('links check-in and check-out to the same stay with the right night count', () => {
    const trip = generateMockTrip(makeCtx({}, 5));
    const checkIn = trip.days[0].blocks.find((b) => b.content.hotelPhase === 'checkin');
    const checkOut = trip.days[4].blocks.find((b) => b.content.hotelPhase === 'checkout');

    expect(checkIn).toBeDefined();
    expect(checkOut).toBeDefined();
    expect(checkOut!.content.hotelRootId).toBe(checkIn!.content.hotelRootId);
    expect(checkIn!.content.nights).toBe(4);
    expect(checkIn!.content.checkInDate).toBe('2026-09-01');
    expect(checkOut!.content.checkOutDate).toBe('2026-09-05');
  });

  it('never places hotel blocks on the middle days', () => {
    const trip = generateMockTrip(makeCtx({}, 6));
    const middle = trip.days.slice(1, -1);

    expect(middle.every((d) => d.blocks.every((b) => b.type !== 'hotel'))).toBe(true);
    expect(middle.every((d) => d.blocks.some((b) => b.type === 'meal'))).toBe(true);
  });

  it('never emits a vague airport placeholder, even without a resolved airport', () => {
    const ctx = makeCtx(
      {
        destination: resolveDestinationContext('Villaggio remoto, Nowhereland', {
          label: 'Villaggio remoto',
          lat: 1,
          lng: 1,
          countryCode: 'ZZ',
          placeType: 'village',
        }),
      },
      3
    );
    const trip = generateMockTrip(ctx);

    expect(containsVagueAirport(JSON.stringify(trip))).toBe(false);
    expect(trip.days[0].blocks[0].content.needsAirport).toBe(true);
  });

  it('keeps sortOrder contiguous per day', () => {
    const trip = generateMockTrip(makeCtx({}, 4));

    for (const day of trip.days) {
      expect(day.blocks.map((b) => b.sortOrder)).toEqual(day.blocks.map((_, i) => i));
    }
  });

  it('handles a single-day trip without a stay', () => {
    const trip = generateMockTrip(makeCtx({}, 1));

    expect(trip.days).toHaveLength(1);
    expect(trip.tripTitle).toContain('1 giorno');
  });
});
