import { describe, expect, it } from 'vitest';
import { planDestination, plannerCoverageReport } from '@/lib/itineraries/deterministic-planner/plan-destination';
import { groupGaps, humanizePoiName, attributionClaimIt } from '@/lib/itineraries/deterministic-planner/humanize';

describe('planDestination', () => {
  it('presents Thailand curated master without raw warning codes', () => {
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
    const blob = JSON.stringify(plan.gaps);
    expect(blob).not.toMatch(/UNVERIFIED_/);
    expect(blob).not.toMatch(/internal_flight/);
  });

  it('presents curated masters for other active destinations', () => {
    for (const slug of ['vietnam', 'islanda', 'spagna', 'marocco']) {
      const plan = planDestination({ destinationSlug: slug, tripDays: 10 });
      expect(plan.ok).toBe(true);
      if (!plan.ok) return;
      expect(plan.quality).toBe('curated');
      expect(plan.attributions.length).toBeGreaterThan(1);
    }
  });

  it('falls back to skeleton for destinations without master yet', () => {
    const plan = planDestination({ destinationSlug: 'fiji', tripDays: 10 });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.quality).toBe('skeleton');
  });

  it('coverage report: 12 active curated + batch2', () => {
    const rows = plannerCoverageReport();
    expect(rows.filter((r) => r.active && r.quality === 'curated')).toHaveLength(12);
    expect(rows.filter((r) => r.quality === 'curated').length).toBeGreaterThanOrEqual(25);
  });
});

describe('humanize', () => {
  it('maps stub POI labels to Italian', () => {
    expect(humanizePoiName('Soft')).toMatch(/Arrivo/i);
    expect(humanizePoiName('Local')).toMatch(/locale/i);
  });

  it('strips English map-anchor phrasing from attributions', () => {
    expect(attributionClaimIt('Bangkok area-segment map anchor.')).not.toMatch(/area-segment/i);
  });

  it('groups gaps without duplicates', () => {
    const g = groupGaps([
      { kind: 'activity', text: 'A' },
      { kind: 'activity', text: 'A' },
      { kind: 'transfer', text: 'T' },
    ]);
    expect(g.activities).toEqual(['A']);
    expect(g.transfers).toEqual(['T']);
  });
});
