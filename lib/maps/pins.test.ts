import { describe, expect, it } from 'vitest';
import { buildPinsFromDraft } from '@/lib/maps/pins';
import type { ComposerDraft } from '@/types/composer';

describe('buildPinsFromDraft', () => {
  it('returns destination pin when no mappable blocks', () => {
    const draft: ComposerDraft = {
      title: 'Test',
      destination: 'Thailandia',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      planningMode: 'group',
      maxParticipants: 8,
      days: [
        {
          dayIndex: 1,
          date: '2026-08-01',
          title: 'Day 1',
          blocks: [],
        },
      ],
    };
    const pins = buildPinsFromDraft(draft);
    expect(pins.length).toBeGreaterThanOrEqual(1);
    expect(pins[0].label).toBe('Thailandia');
  });
});