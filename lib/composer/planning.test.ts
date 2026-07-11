import { describe, expect, it } from 'vitest';
import { getBudgetBreakdown, getPlanCompletion, groupBlocksByTimeSlot } from '@/lib/composer/planning';
import type { ComposerDay } from '@/types/composer';

const sampleDays: ComposerDay[] = [
  {
    dayIndex: 1,
    date: '2026-08-01',
    title: 'Arrivo',
    blocks: [
      {
        id: 'b1',
        type: 'flight',
        sortOrder: 0,
        content: { price: 200, timeSlot: 'morning' },
        alternatives: [],
        selectedAlternativeId: null,
      },
      {
        id: 'b2',
        type: 'meal',
        sortOrder: 1,
        content: { price: 30, timeSlot: 'evening' },
        alternatives: [],
        selectedAlternativeId: null,
      },
    ],
  },
  {
    dayIndex: 2,
    date: '2026-08-02',
    title: 'Giorno 2',
    blocks: [],
  },
];

describe('getPlanCompletion', () => {
  it('calculates filled days and percent', () => {
    const result = getPlanCompletion(sampleDays);
    expect(result.filledDays).toBe(1);
    expect(result.totalDays).toBe(2);
    expect(result.percent).toBe(50);
    expect(result.totalBlocks).toBe(2);
  });
});

describe('getBudgetBreakdown', () => {
  it('sums by category', () => {
    const b = getBudgetBreakdown(sampleDays);
    expect(b.flights).toBe(200);
    expect(b.experiences).toBe(30);
    expect(b.total).toBe(230);
  });
});

describe('groupBlocksByTimeSlot', () => {
  it('groups blocks by time slot', () => {
    const groups = groupBlocksByTimeSlot(sampleDays[0].blocks);
    expect(groups.morning).toHaveLength(1);
    expect(groups.evening).toHaveLength(1);
  });
});