import { describe, expect, it } from 'vitest';
import { buildThailandPilotPlan } from '@/lib/itineraries/thailand-pilot/ui-plan';

/** Legacy entry still used by library tests; UI now uses DeterministicPlanPanel. */
describe('buildThailandPilotPlan (compat)', () => {
  it('still plans Thailand curated templates', () => {
    const plan = buildThailandPilotPlan({
      destinationSlug: 'thailandia',
      tripDays: 10,
      vibe: 'relax',
    });
    expect(plan.ok).toBe(true);
  });
});
