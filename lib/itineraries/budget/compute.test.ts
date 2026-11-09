import { describe, expect, it } from 'vitest';
import { planFromMaster } from '@/lib/itineraries/masters';
import { computeItineraryBudget } from '@/lib/itineraries/budget/compute';

function totalFor(
  slug: string,
  days: number,
  vibe: 'relax' | 'divertimento' | 'avventura' = 'divertimento',
  company: 'solo' | 'coppia' | 'amici' = 'solo'
) {
  const planned = planFromMaster(slug, days, vibe)!;
  const b = computeItineraryBudget({
    destinationSlug: slug,
    tripDays: days,
    vibe,
    company,
    days: planned.template.days,
  });
  expect(b).toBeTruthy();
  expect(b!.totalEur).toBeTruthy();
  return b!;
}

describe('itinerary budget engine', () => {
  it('7 vs 14 vs 21 days give different totals for Vietnam, Thailandia, Spagna', () => {
    for (const slug of ['vietnam', 'thailandia', 'spagna'] as const) {
      const t7 = totalFor(slug, 7).perPersonEur!;
      const t14 = totalFor(slug, 14).perPersonEur!;
      const t21 = totalFor(slug, 21).perPersonEur!;
      expect(t14).toBeGreaterThan(t7);
      expect(t21).toBeGreaterThan(t14);
      // Hotel+living must move with nights (not only a clamped scale)
      const hotels7 = totalFor(slug, 7).byCategory.hotels.amountEur!;
      const hotels14 = totalFor(slug, 14).byCategory.hotels.amountEur!;
      expect(hotels14).toBeGreaterThan(hotels7);
      const living7 = totalFor(slug, 7).byCategory.daily_living.amountEur!;
      const living14 = totalFor(slug, 14).byCategory.daily_living.amountEur!;
      expect(living14).toBeGreaterThan(living7);
    }
  });

  it('style changes the total (Vietnam 10d)', () => {
    const relax = totalFor('vietnam', 10, 'relax').perPersonEur!;
    const divertimento = totalFor('vietnam', 10, 'divertimento').perPersonEur!;
    const avventura = totalFor('vietnam', 10, 'avventura').perPersonEur!;
    // Relax uses comfort hotels → higher; avventura uses budget hotels → lower living/hotel mix
    expect(relax).not.toBe(divertimento);
    expect(avventura).not.toBe(divertimento);
    expect(relax).toBeGreaterThan(avventura);
  });

  it('travelers (Con chi) change party total and per-person hotel share', () => {
    const solo = totalFor('vietnam', 10, 'divertimento', 'solo');
    const amici = totalFor('vietnam', 10, 'divertimento', 'amici');
    expect(amici.travelers).toBe(2);
    expect(amici.totalEur!).toBeGreaterThan(solo.totalEur!);
    // Shared room → hotel per person lower for amici
    expect(amici.byCategory.hotels.amountEur! / amici.travelers).toBeLessThan(
      solo.byCategory.hotels.amountEur! / solo.travelers
    );
  });

  it('Vietnam 7/10/14 example totals are published for QA', () => {
    const samples = [7, 10, 14].map((d) => {
      const b = totalFor('vietnam', d, 'divertimento', 'solo');
      return {
        days: d,
        perPerson: b.perPersonEur,
        flights: b.byCategory.flights.amountEur,
        hotels: b.byCategory.hotels.amountEur,
        transfers: b.byCategory.internal_transfers.amountEur,
        living: b.byCategory.daily_living.amountEur,
        activities: b.byCategory.activities.amountEur,
      };
    });
    // eslint-disable-next-line no-console
    console.log('[budget-qa] Vietnam solo divertimento', samples);
    expect(samples[0]!.perPerson).toBeLessThan(samples[1]!.perPerson!);
    expect(samples[1]!.perPerson).toBeLessThan(samples[2]!.perPerson!);
  });

  it('live flight overrides estimate', () => {
    const planned = planFromMaster('vietnam', 10, 'divertimento')!;
    const est = computeItineraryBudget({
      destinationSlug: 'vietnam',
      tripDays: 10,
      vibe: 'divertimento',
      company: 'solo',
      days: planned.template.days,
    })!;
    const live = computeItineraryBudget({
      destinationSlug: 'vietnam',
      tripDays: 10,
      vibe: 'divertimento',
      company: 'solo',
      days: planned.template.days,
      liveFlightEurPerPerson: 999,
    })!;
    expect(live.byCategory.flights.kind).toBe('live');
    expect(live.byCategory.flights.amountEur).toBe(999);
    expect(live.byCategory.flights.amountEur).not.toBe(est.byCategory.flights.amountEur);
  });
});
