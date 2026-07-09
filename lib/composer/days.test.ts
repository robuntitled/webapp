import { describe, expect, it } from 'vitest';
import { buildComposerDays, estimateTripBudget } from '@/lib/composer/days';
import type { ComposerDay } from '@/types/composer';

describe('buildComposerDays', () => {
  it('creates one day per calendar day in range', () => {
    const days = buildComposerDays('2026-08-01', '2026-08-03');
    expect(days).toHaveLength(3);
    expect(days[0].dayIndex).toBe(1);
    expect(days[2].date).toBe('2026-08-03');
  });
});

describe('estimateTripBudget', () => {
  it('sums block prices', () => {
    const days: ComposerDay[] = [
      {
        dayIndex: 1,
        date: '2026-08-01',
        title: 'Day 1',
        blocks: [
          {
            id: '1',
            type: 'flight',
            sortOrder: 0,
            content: { price: 200 },
            alternatives: [],
            selectedAlternativeId: null,
          },
          {
            id: '2',
            type: 'hotel',
            sortOrder: 1,
            content: { price: 150 },
            alternatives: [],
            selectedAlternativeId: null,
          },
        ],
      },
    ];
    expect(estimateTripBudget(days)).toBe(350);
  });
});