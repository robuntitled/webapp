import { describe, expect, it } from 'vitest';
import {
  formatDestinationsWithPrepositions,
  generateTripTitle,
  placeWithPreposition,
  polishTripTitle,
} from '@/lib/composer/title-generator';

describe('title-generator italian grammar', () => {
  it('uses in for regions and a for cities', () => {
    expect(placeWithPreposition('Sicilia')).toBe('in Sicilia');
    expect(placeWithPreposition('Dubai')).toBe('a Dubai');
    expect(placeWithPreposition('Roma')).toBe('a Roma');
    expect(placeWithPreposition('Francia')).toBe('in Francia');
  });

  it('joins destinations with e and correct preps', () => {
    expect(formatDestinationsWithPrepositions(['Sicilia', 'Dubai'])).toBe(
      'in Sicilia e a Dubai'
    );
  });

  it('polishes legacy bad titles', () => {
    expect(polishTripTitle('Viaggio a Sicilia & Dubai')).toBe(
      'Viaggio in Sicilia e a Dubai'
    );
  });

  it('generateTripTitle with seed is deterministic and grammatical', () => {
    const title = generateTripTitle(['Sicilia', 'Dubai'], 'Sicilia-Dubai');
    expect(title.includes('&')).toBe(false);
    expect(title.toLowerCase()).not.toContain('a sicilia');
  });
});
