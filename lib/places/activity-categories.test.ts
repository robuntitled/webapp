import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_PLACE_CATEGORY_ORDER,
  buildCategoryQuery,
  matchesActivityCategory,
} from '@/lib/places/activity-categories';

describe('ACTIVITY_PLACE_CATEGORY_ORDER', () => {
  it('lists Attrazioni → Attività → Ristoranti', () => {
    expect(ACTIVITY_PLACE_CATEGORY_ORDER).toEqual([
      'attraction',
      'activity',
      'meal',
    ]);
  });
});

describe('matchesActivityCategory', () => {
  it('keeps restaurants only in meal', () => {
    const restaurant = {
      label: 'Trattoria da Mario',
      subtitle: 'Via Roma',
      placeType: 'restaurant',
      types: ['amenity', 'restaurant'],
    };
    expect(matchesActivityCategory('meal', restaurant)).toBe(true);
    expect(matchesActivityCategory('attraction', restaurant)).toBe(false);
    expect(matchesActivityCategory('activity', restaurant)).toBe(false);
  });

  it('keeps museums only in attraction', () => {
    const museum = {
      label: 'Museo Egizio',
      subtitle: 'Torino',
      placeType: 'museum',
      types: ['tourism', 'museum'],
    };
    expect(matchesActivityCategory('attraction', museum)).toBe(true);
    expect(matchesActivityCategory('meal', museum)).toBe(false);
    expect(matchesActivityCategory('activity', museum)).toBe(false);
  });

  it('keeps tours in activity', () => {
    const tour = {
      label: 'Bike tour centro',
      subtitle: 'Roma',
      placeType: 'tour',
      types: ['tourism', 'tour'],
    };
    expect(matchesActivityCategory('activity', tour)).toBe(true);
    expect(matchesActivityCategory('meal', tour)).toBe(false);
  });

  it('drops plain cities without category signals', () => {
    const city = {
      label: 'Roma',
      subtitle: 'Italia',
      placeType: 'city',
      types: ['place', 'city'],
    };
    expect(matchesActivityCategory('meal', city)).toBe(false);
    expect(matchesActivityCategory('attraction', city)).toBe(false);
  });
});

describe('buildCategoryQuery', () => {
  it('appends boost terms', () => {
    expect(buildCategoryQuery('Colosseo', 'attraction')).toContain('attrazione');
    expect(buildCategoryQuery('pizza', 'meal')).toContain('ristorante');
  });
});
