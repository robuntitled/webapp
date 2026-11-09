import { describe, expect, it } from 'vitest';
import { getActiveMaster } from '@/lib/itineraries/masters/active-batch';
import { remapMasterToTemplate, allocateStops } from '@/lib/itineraries/masters/remap';
import { planDestination, plannerCoverageReport } from '@/lib/itineraries/deterministic-planner/plan-destination';
import { templatesForDestination, findItineraryBySlug } from '@/lib/itineraries/catalog';

describe('master remap', () => {
  it('compresses Vietnam without inventing reverse hops', () => {
    const master = getActiveMaster('vietnam')!;
    const short = remapMasterToTemplate(master, 7, 'relax');
    expect(short.template.days[0]?.is_arrival).toBe(true);
    expect(short.template.days.at(-1)?.is_departure).toBe(true);
    expect(short.template.days).toHaveLength(7);
    const areas = short.template.days.map((d) => d.area_segment);
    // Should not oscillate Hanoi → HCMC → Hanoi
    expect(areas.join('>')).not.toMatch(/Hanoi.*Ho Chi Minh.*Hanoi/);
  });

  it('respects nightsMin when allocating', () => {
    const master = getActiveMaster('islanda')!;
    const { allocated } = allocateStops(master, 5, 'relax');
    for (const a of allocated) {
      expect(a.nights).toBeGreaterThanOrEqual(a.stop.nightsMin);
    }
  });

  it('publishes catalog templates for all active masters', () => {
    for (const slug of [
      'thailandia',
      'vietnam',
      'islanda',
      'albania',
      'spagna',
      'portogallo',
      'grecia',
      'turchia',
      'repubblica-ceca',
      'marocco',
      'capo-verde',
      'zanzibar',
    ]) {
      const list = templatesForDestination(slug);
      expect(list.length).toBeGreaterThan(0);
      expect(findItineraryBySlug(slug, list[0]!.duration_days)?.destination_slug).toBe(slug);
    }
  });

  it('planDestination marks active masters as curated with Italian gaps', () => {
    const plan = planDestination({
      destinationSlug: 'vietnam',
      tripDays: 10,
      vibe: 'divertimento',
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.quality).toBe('curated');
    const blob = JSON.stringify(plan.gaps);
    expect(blob).not.toMatch(/UNVERIFIED_/);
    expect(plan.days.some((d) => /Hanoi|Hoi An|Ho Chi Minh|Ha Long/i.test(d.area))).toBe(true);
  });

  it('coverage: 12 active curated, rest skeleton', () => {
    const rows = plannerCoverageReport();
    const curatedActive = rows.filter((r) => r.active && r.quality === 'curated');
    expect(curatedActive.length).toBe(12);
    expect(rows.filter((r) => r.quality === 'skeleton').length).toBeGreaterThan(40);
  });
});
