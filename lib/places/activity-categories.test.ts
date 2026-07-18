import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_PLACE_CATEGORY_ORDER,
  buildCategoryQuery,
  buildOverpassCategoryClauses,
  isGenericCategoryQuery,
  matchesActivityCategory,
  tagsMatchActivityCategory,
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

describe('tagsMatchActivityCategory', () => {
  it('classifies OSM tags correctly and excludes food from attractions', () => {
    expect(
      tagsMatchActivityCategory({ amenity: 'restaurant', name: 'Da Mario' }, 'meal')
    ).toBe(true);
    expect(
      tagsMatchActivityCategory({ amenity: 'restaurant', name: 'Da Mario' }, 'attraction')
    ).toBe(false);
    expect(tagsMatchActivityCategory({ tourism: 'museum', name: 'Uffizi' }, 'attraction')).toBe(
      true
    );
    expect(tagsMatchActivityCategory({ tourism: 'museum', name: 'Uffizi' }, 'meal')).toBe(false);
    expect(
      tagsMatchActivityCategory({ leisure: 'swimming_pool', name: 'Piscina' }, 'activity')
    ).toBe(true);
    expect(tagsMatchActivityCategory({ leisure: 'park', name: 'Villa Borghese' }, 'attraction')).toBe(
      true
    );
    // City parks non devono finire in "Attività"
    expect(tagsMatchActivityCategory({ leisure: 'park', name: 'Villa Borghese' }, 'activity')).toBe(
      false
    );
  });
});

describe('isGenericCategoryQuery', () => {
  it('detects generic browse terms per tab', () => {
    expect(isGenericCategoryQuery('museo', 'attraction')).toBe(true);
    expect(isGenericCategoryQuery('pizzeria', 'meal')).toBe(true);
    expect(isGenericCategoryQuery('piscina', 'activity')).toBe(true);
    expect(isGenericCategoryQuery('Colosseo', 'attraction')).toBe(false);
    expect(isGenericCategoryQuery('Da Mario', 'meal')).toBe(false);
  });
});

describe('buildOverpassCategoryClauses', () => {
  it('scopes name filter inside category selectors', () => {
    const withName = buildOverpassCategoryClauses('meal', 41.9, 12.5, 10000, 'pizza');
    expect(withName).toContain('amenity');
    expect(withName).toContain('pizza');
    expect(withName).toContain('around:10000,41.9,12.5');
    expect(withName).toMatch(/name/);

    const browse = buildOverpassCategoryClauses('attraction', 41.9, 12.5, 8000);
    expect(browse).toContain('tourism');
    expect(browse).not.toContain('pizza');
  });
});

describe('buildCategoryQuery', () => {
  it('appends boost terms', () => {
    expect(buildCategoryQuery('Colosseo', 'attraction').toLowerCase()).toMatch(
      /museo|monumento|attrazione/
    );
    expect(buildCategoryQuery('pizza', 'meal')).toContain('ristorante');
  });
});
