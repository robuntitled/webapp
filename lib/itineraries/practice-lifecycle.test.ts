import { describe, expect, it } from 'vitest';
import {
  getPracticeLifecyclePhase,
  nextPostFlightStep,
} from '@/lib/itineraries/practice-lifecycle';
import type { PracticeRow } from '@/lib/itineraries/types';

function practice(overrides: Partial<PracticeRow>): PracticeRow {
  return {
    id: 'p1',
    user_id: 'u1',
    template_id: 'thailand-14d',
    edition_id: null,
    mode: 'solo',
    date_from: '2026-12-01',
    date_to: '2026-12-14',
    status: 'draft',
    flight_confirmed_at: null,
    hotel_confirmed_at: null,
    activity_confirmed_at: null,
    ...overrides,
  };
}

describe('practice lifecycle', () => {
  it('interested when no flight and trip in future', () => {
    expect(getPracticeLifecyclePhase(practice({}))).toBe('interested');
  });

  it('booked when flight confirmed before departure', () => {
    expect(
      getPracticeLifecyclePhase(
        practice({ flight_confirmed_at: '2026-06-01T10:00:00Z' })
      )
    ).toBe('booked');
  });

  it('active when between date_from and date_to with flight', () => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 1);
    const to = new Date(today);
    to.setDate(to.getDate() + 5);
    expect(
      getPracticeLifecyclePhase(
        practice({
          flight_confirmed_at: from.toISOString(),
          date_from: from.toISOString().slice(0, 10),
          date_to: to.toISOString().slice(0, 10),
        })
      )
    ).toBe('active');
  });

  it('next post-flight step is hotel then sights', () => {
    expect(nextPostFlightStep(practice({ flight_confirmed_at: '2026-06-01' }))).toBe('hotel');
    expect(
      nextPostFlightStep(practice({ flight_confirmed_at: '2026-06-01' }), {
        hotelsComplete: true,
      })
    ).toBe('sights');
    expect(
      nextPostFlightStep(
        practice({
          flight_confirmed_at: '2026-06-01',
          hotel_confirmed_at: '2026-06-02',
        }),
        { hotelsComplete: true }
      )
    ).toBe('sights');
    expect(
      nextPostFlightStep(
        practice({
          flight_confirmed_at: '2026-06-01',
          hotel_confirmed_at: '2026-06-02',
          activity_confirmed_at: '2026-06-03',
        }),
        { hotelsComplete: true }
      )
    ).toBe('done');
  });
});
