import { describe, expect, it } from 'vitest';
import { validatePublishDraft } from '@/lib/composer/publish-validation';
import type { ComposerDraft } from '@/types/composer';

function draftWithFlight(content: Record<string, unknown>): ComposerDraft {
  return {
    title: 'Test',
    destination: 'Islanda',
    startDate: '2026-09-02',
    endDate: '2026-09-09',
    planningMode: 'solo',
    maxParticipants: 1,
    days: [
      {
        dayIndex: 1,
        date: '2026-09-02',
        title: 'Arrivo',
        blocks: [
          {
            id: 'f1',
            type: 'flight',
            sortOrder: 0,
            content,
            alternatives: [],
            selectedAlternativeId: null,
          },
        ],
      },
    ],
  };
}

describe('validatePublishDraft flights', () => {
  it('accepts a saved LiteAPI offer with origin/destination even without HH:mm fields', () => {
    const issues = validatePublishDraft(
      draftWithFlight({
        title: 'MXP → KEF',
        origin: 'MXP',
        destination: 'KEF',
        offerId: 'off_1',
        price: 86.85,
      })
    );
    expect(issues).toEqual([]);
  });

  it('accepts origin + ISO departure/arrival', () => {
    const issues = validatePublishDraft(
      draftWithFlight({
        title: 'MXP → KEF',
        origin: 'MXP',
        departureTime: '2026-09-02T08:10:00Z',
        arrivalTime: '2026-09-02T11:40:00Z',
      })
    );
    expect(issues).toEqual([]);
  });
});
