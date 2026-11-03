import { describe, expect, it } from 'vitest';
import { OFFICIAL_EDITION_SEEDS } from '@/lib/itineraries/catalog';
import { isEditionComingSoon } from '@/lib/itineraries/edition-joinability';

describe('A4 edition coming soon without tour operator', () => {
  it('marks all published Thailand official seeds as coming soon', () => {
    expect(OFFICIAL_EDITION_SEEDS).toHaveLength(3);
    for (const seed of OFFICIAL_EDITION_SEEDS) {
      expect(seed.tourOperatorId == null).toBe(true);
      expect(
        isEditionComingSoon({
          template_id: seed.template_id,
          date_from: seed.date_from,
          edition_type: 'official',
          tourOperatorId: seed.tourOperatorId,
        })
      ).toBe(true);
    }
  });

  it('keeps private editions joinable', () => {
    expect(
      isEditionComingSoon({
        template_id: 'thailandia-10d',
        date_from: '2026-11-12',
        edition_type: 'private',
      })
    ).toBe(false);
  });

  it('allows official editions only when a tour operator is linked', () => {
    expect(
      isEditionComingSoon({
        template_id: 'thailandia-10d',
        date_from: '2026-11-12',
        edition_type: 'official',
        tourOperatorId: 'partner-to-1',
      })
    ).toBe(false);
  });
});
