import { describe, expect, it } from 'vitest';
import { nightsFromTripDays, tripDurationLabelIt } from '@/lib/itineraries/trip-duration';
import { datesForDuration } from '@/lib/itineraries/dates';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { planFromMaster } from '@/lib/itineraries/masters';
import { planDestination } from '@/lib/itineraries/deterministic-planner/plan-destination';
import { computeItineraryBudget } from '@/lib/itineraries/budget/compute';

describe('trip duration nights/days', () => {
  it('10–19 nov is 10 days / 9 nights', () => {
    const { date_from, date_to } = datesForDuration('2026-11-10', 10);
    expect(date_from).toBe('2026-11-10');
    expect(date_to).toBe('2026-11-19');
    const days =
      differenceInCalendarDays(parseISO(date_to), parseISO(date_from)) + 1;
    expect(days).toBe(10);
    expect(nightsFromTripDays(days)).toBe(9);
    expect(tripDurationLabelIt(days)).toBe('10 giorni · 9 notti');
  });

  it('10–20 nov is 11 days / 10 nights', () => {
    const days =
      differenceInCalendarDays(parseISO('2026-11-20'), parseISO('2026-11-10')) + 1;
    expect(days).toBe(11);
    expect(tripDurationLabelIt(11)).toBe('11 giorni · 10 notti');
  });
});

describe('vietnam budget coherence with itinerary engine', () => {
  it('panel budget matches computeItineraryBudget for 10 and 11 days', () => {
    for (const days of [10, 11]) {
      const remapped = planFromMaster('vietnam', days)!;
      const computed = computeItineraryBudget({
        destinationSlug: 'vietnam',
        tripDays: days,
        vibe: 'divertimento',
        company: 'solo',
        days: remapped.template.days,
      })!;
      const presented = planDestination({
        destinationSlug: 'vietnam',
        tripDays: days,
        vibe: 'divertimento',
        company: 'solo',
      });
      expect(presented.ok).toBe(true);
      if (!presented.ok) return;
      expect(presented.durationDays).toBe(days);
      expect(presented.budgetTotalHint).toBe(computed.perPersonEur);
      expect(presented.budgetBreakdown?.totalEur).toBe(computed.totalEur);
    }
  });
});
