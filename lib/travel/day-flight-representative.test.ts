import { describe, expect, it } from 'vitest';
import {
  chipMatchesSelectedPerPerson,
  chipStatsFromOffer,
  dayChipFromOffers,
  pickCheapestDayOffer,
  selectedPerPersonPrice,
} from '@/lib/travel/day-flight-representative';

const offers = [
  {
    id: 'iberia-scalo',
    price: 474,
    stops: 1,
    durationMinutes: 15 * 60,
    airline: 'Iberia',
  },
  {
    id: 'direct-cheap',
    price: 421,
    stops: 0,
    durationMinutes: 13 * 60,
    airline: 'Vietnam Airlines',
  },
  {
    id: 'direct-fast',
    price: 520,
    stops: 0,
    durationMinutes: 5 * 60,
    airline: 'Emirates',
  },
];

describe('day-flight-representative', () => {
  it('picks cheapest offer (not frankenstein mins across offers)', () => {
    const best = pickCheapestDayOffer(offers);
    expect(best?.id).toBe('direct-cheap');
    const chip = dayChipFromOffers(offers);
    expect(chip).toEqual(chipStatsFromOffer(best!));
    // Must NOT mix 421€ with another offer's 5h / or Iberia's 1 stop
    expect(chip!.cheapestPrice).toBe(421);
    expect(chip!.minStops).toBe(0);
    expect(chip!.minDurationMinutes).toBe(13 * 60);
    expect(chip!.airline).toBe('Vietnam Airlines');
  });

  it('chip price == selected per-person price after tap (adults=2 party)', () => {
    const chip = dayChipFromOffers(offers)!;
    const adults = 2;
    // selectDay stores total = perPerson * adults on the snapshot
    const total = Math.round(chip.cheapestPrice * adults * 100) / 100;
    const perPerson = selectedPerPersonPrice(total, adults);
    expect(chipMatchesSelectedPerPerson(chip.cheapestPrice, perPerson)).toBe(
      true
    );
    expect(perPerson).toBe(421);
    expect(total).toBe(842);
  });

  it('Altre opzioni: chip override follows newly selected offer', () => {
    const alt = offers[0]!; // Iberia 474
    const chip = chipStatsFromOffer(alt);
    const adults = 2;
    const total = Math.round(alt.price * adults * 100) / 100;
    const perPerson = selectedPerPersonPrice(total, adults);
    expect(chipMatchesSelectedPerPerson(chip.cheapestPrice, perPerson)).toBe(
      true
    );
    expect(chip.minStops).toBe(1);
    expect(chip.airline).toBe('Iberia');
  });

  it('returns null for empty offer list', () => {
    expect(pickCheapestDayOffer([])).toBeNull();
    expect(dayChipFromOffers([])).toBeNull();
  });
});
