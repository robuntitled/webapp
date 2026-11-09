import { describe, expect, it } from 'vitest';
import { planFromMaster } from '@/lib/itineraries/masters';
import { computeItineraryBudget } from '@/lib/itineraries/budget/compute';
import {
  combineMultiCountryPlan,
  isCuratedMultiSelection,
} from '@/lib/itineraries/multi-country/combine';
import { listCuratedMultiCountryPairs } from '@/lib/itineraries/multi-country/curated-pairs';
import { splitDaysAcrossCountries } from '@/lib/itineraries/multi-country/day-split';

describe('multi-country planner', () => {
  it('lists curated classic pairs only', () => {
    const ids = listCuratedMultiCountryPairs().map((p) => p.id);
    expect(ids).toContain('thailandia-cambogia');
    expect(ids).toContain('vietnam-cambogia');
    expect(ids).toContain('thailandia-malesia');
    expect(ids).toContain('spagna-portogallo');
    expect(ids).toContain('tanzania-zanzibar');
    expect(ids).toContain('inghilterra-scozia');
    expect(ids).toContain('danimarca-faer-oer');
    expect(ids).not.toContain('laos');
  });

  it('orders Thailandia→Cambogia (canonical) even if user picks reverse', () => {
    const plan = combineMultiCountryPlan({
      slugs: ['cambogia', 'thailandia'],
      tripDays: 14,
      vibe: 'divertimento',
      company: 'solo',
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.orderedSlugs).toEqual(['thailandia', 'cambogia']);
    expect(plan.arrivalIata).toBe('BKK');
    expect(plan.departureIata).toBe('REP');
  });

  it('splits 10/14/21 days for Thailandia+Cambogia with transfer day', () => {
    for (const days of [10, 14, 21]) {
      const shares = splitDaysAcrossCountries(['thailandia', 'cambogia'], days, 1);
      expect(shares).toBeTruthy();
      const sum = shares!.reduce((s, x) => s + x.days, 0);
      expect(sum).toBe(days - 1);
      expect(shares!.every((s) => s.days >= s.minDays)).toBe(true);

      const plan = combineMultiCountryPlan({
        slugs: ['thailandia', 'cambogia'],
        tripDays: days,
        company: 'solo',
      });
      expect(plan.ok).toBe(true);
      if (!plan.ok) return;
      expect(plan.days).toHaveLength(days);
      expect(plan.days.some((d) => /Trasferimento/i.test(d.title))).toBe(true);
      expect(plan.shares.reduce((s, x) => s + x.days, 0)).toBe(days - 1);
    }
  });

  it('budget changes with days for Thailandia+Cambogia', () => {
    const a = combineMultiCountryPlan({
      slugs: ['thailandia', 'cambogia'],
      tripDays: 10,
      company: 'solo',
    });
    const b = combineMultiCountryPlan({
      slugs: ['thailandia', 'cambogia'],
      tripDays: 14,
      company: 'solo',
    });
    const c = combineMultiCountryPlan({
      slugs: ['thailandia', 'cambogia'],
      tripDays: 21,
      company: 'solo',
    });
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok) return;
    expect(b.totalPerPersonEur!).toBeGreaterThan(a.totalPerPersonEur!);
    expect(c.totalPerPersonEur!).toBeGreaterThan(b.totalPerPersonEur!);
    // eslint-disable-next-line no-console
    console.log('[multi-qa] TH+KH', {
      d10: a.totalPerPersonEur,
      d14: b.totalPerPersonEur,
      d21: c.totalPerPersonEur,
      split14: b.shares,
      transferDay: b.days.find((d) => /Trasferimento/i.test(d.title))?.day_number,
      flight14: b.openJawFlightEurPerPerson,
      transferCost14: b.transfer.costEurPerPerson,
      countryBudgets14: b.countryBudgets.map((x) => ({
        name: x.nameIt,
        pp: x.breakdown.perPersonEur,
      })),
      hubs: `${b.arrivalIata}→${b.departureIata}`,
    });
  });

  it('Vietnam+Cambogia open-jaw HAN→REP matches SGN→REP flight transfer (not bus HCMC–PP)', () => {
    const plan = combineMultiCountryPlan({
      slugs: ['vietnam', 'cambogia'],
      tripDays: 14,
      company: 'solo',
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.arrivalIata).toBe('HAN');
    expect(plan.departureIata).toBe('REP');
    expect(plan.transfer.mode).toBe('internal_flight');
    expect(plan.transfer.notesIt).toMatch(/SGN/i);
    expect(plan.transfer.notesIt).not.toMatch(/bus|Phnom Penh|HCMC–/i);
    const transferDay = plan.days.find((d) => /Trasferimento/i.test(d.title));
    expect(transferDay?.description).toMatch(/volo|aereo|interno/i);
    expect(transferDay?.description).not.toMatch(/bus HCMC|Phnom Penh/i);
  });

  it('rejects non-curated pairs', () => {
    const plan = combineMultiCountryPlan({
      slugs: ['thailandia', 'islanda'],
      tripDays: 14,
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.reason).toBe('unknown_pair');
    expect(isCuratedMultiSelection(['thailandia', 'islanda'])).toBe(false);
  });

  it('single-destination budget path remains unchanged for Vietnam 10d', () => {
    const planned = planFromMaster('vietnam', 10, 'divertimento')!;
    const solo = computeItineraryBudget({
      destinationSlug: 'vietnam',
      tripDays: 10,
      vibe: 'divertimento',
      company: 'solo',
      days: planned.template.days,
    })!;
    expect(solo.perPersonEur).toBeGreaterThan(1000);
    expect(solo.byCategory.flights.amountEur).toBe(700);
  });
});
