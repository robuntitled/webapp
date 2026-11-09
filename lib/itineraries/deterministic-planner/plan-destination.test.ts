import { describe, expect, it } from 'vitest';
import { planDestination, plannerCoverageReport } from '@/lib/itineraries/deterministic-planner/plan-destination';
import { groupGaps, humanizePoiName, attributionClaimIt } from '@/lib/itineraries/deterministic-planner/humanize';

describe('planDestination', () => {
  it('presents Thailand curated plan without raw warning codes in gaps text', () => {
    const plan = planDestination({
      destinationSlug: 'thailandia',
      tripDays: 21,
      vibe: 'avventura',
      travelMonth: 8,
      arrivalIata: 'BKK',
      departureIata: 'BKK',
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.quality).toBe('curated');
    expect(plan.days).toHaveLength(21);
    expect(plan.days.at(-2)?.title).not.toMatch(/buffer/i);
    const blob = JSON.stringify(plan.gaps);
    expect(blob).not.toMatch(/UNVERIFIED_/);
    expect(blob).not.toMatch(/internal_flight/);
    expect(blob).not.toMatch(/geografia ≠/);
  });

  it('builds skeleton for every non-Thailand catalog destination (sample)', () => {
    for (const slug of ['vietnam', 'islanda', 'spagna', 'giappone', 'australia']) {
      const plan = planDestination({ destinationSlug: slug, tripDays: 10 });
      expect(plan.ok).toBe(true);
      if (!plan.ok) return;
      expect(plan.quality).toBe('skeleton');
      expect(plan.days[0]?.isArrival).toBe(true);
      expect(plan.days.at(-1)?.isDeparture).toBe(true);
      expect(plan.attributions.some((a) => /OpenStreetMap/i.test(a.attribution))).toBe(true);
    }
  });

  it('coverage report includes all wizard destinations', () => {
    const rows = plannerCoverageReport();
    expect(rows.length).toBeGreaterThanOrEqual(50);
    expect(rows.some((r) => r.slug === 'thailandia' && r.quality === 'curated')).toBe(true);
    expect(rows.filter((r) => r.quality === 'skeleton').length).toBeGreaterThan(40);
  });
});

describe('humanize', () => {
  it('maps stub POI labels to Italian', () => {
    expect(humanizePoiName('Soft')).toMatch(/Arrivo/i);
    expect(humanizePoiName('Local')).toMatch(/locale/i);
    expect(humanizePoiName('Doi / nature')).toMatch(/Natura/i);
  });

  it('strips English map-anchor phrasing from attributions', () => {
    expect(attributionClaimIt('Bangkok area-segment map anchor.')).not.toMatch(/area-segment/i);
    expect(attributionClaimIt('Bangkok area-segment map anchor.')).toMatch(/coordinate|Bangkok/i);
  });

  it('groups gaps without duplicates', () => {
    const g = groupGaps([
      { kind: 'activity', text: 'A' },
      { kind: 'activity', text: 'A' },
      { kind: 'transfer', text: 'T' },
      { kind: 'budget', text: 'B' },
    ]);
    expect(g.activities).toEqual(['A']);
    expect(g.transfers).toEqual(['T']);
    expect(g.other).toEqual(['B']);
  });
});
