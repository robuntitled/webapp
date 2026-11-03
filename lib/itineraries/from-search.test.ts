import { describe, expect, it } from 'vitest';
import {
  buildTripDraftFromFlight,
  buildTripDraftFromHotel,
  resolveDestinationSlugFromIataOrCity,
  templateIdForInsert,
} from '@/lib/itineraries/from-search';
import { FREE_TRIP_TEMPLATE_ID } from '@/lib/itineraries/free-trip';

describe('from-search (Fase 1)', () => {
  it('maps Thailand IATA to thailandia slug', () => {
    expect(resolveDestinationSlugFromIataOrCity('BKK')).toBe('thailandia');
    expect(resolveDestinationSlugFromIataOrCity('HKT')).toBe('thailandia');
  });

  it('builds a flight draft with Thailand template when possible', () => {
    const draft = buildTripDraftFromFlight({
      origin: 'MXP',
      destination: 'BKK',
      departureAt: '2026-12-01T10:00:00.000Z',
      returnDepartureAt: '2026-12-14T10:00:00.000Z',
      tripType: 'roundtrip',
    });
    expect(draft.hasItinerary).toBe(true);
    expect(draft.templateId).toMatch(/^thailandia-/);
    expect(draft.dateFrom).toBe('2026-12-01');
    expect(draft.dateTo).toBe('2026-12-14');
    expect(draft.plannedLegs).toHaveLength(2);
    expect(draft.plannedLegs[0]?.kind).toBe('outbound');
  });

  it('builds a free-trip draft for unknown destinations', () => {
    const draft = buildTripDraftFromFlight({
      origin: 'MXP',
      destination: 'XYZ',
      departureAt: '2026-12-01T10:00:00.000Z',
      tripType: 'oneway',
    });
    expect(draft.hasItinerary).toBe(false);
    expect(draft.templateId).toBe(FREE_TRIP_TEMPLATE_ID);
    expect(templateIdForInsert(draft)).toBe(FREE_TRIP_TEMPLATE_ID);
    expect(templateIdForInsert(draft, { allowNullTemplate: true })).toBeNull();
  });

  it('builds a hotel draft from check-in/out', () => {
    const draft = buildTripDraftFromHotel({
      city: 'Bangkok',
      checkin: '2026-12-02',
      checkout: '2026-12-10',
    });
    expect(draft.dateFrom).toBe('2026-12-02');
    expect(draft.dateTo).toBe('2026-12-10');
    expect(draft.hasItinerary).toBe(true);
  });
});
