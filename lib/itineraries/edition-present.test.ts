import { describe, expect, it } from 'vitest';
import { editionScarcity, editionThresholdProgress } from '@/lib/itineraries/edition-present';

describe('edition present', () => {
  it('computes threshold progress', () => {
    expect(editionThresholdProgress(2, 4)).toBe(50);
    expect(editionThresholdProgress(5, 4)).toBe(100);
  });

  it('shows closing when near departure with momentum', () => {
    const near = new Date();
    near.setDate(near.getDate() + 10);
    const info = editionScarcity({
      confirmed_count: 2,
      min_confirmed: 4,
      date_from: near.toISOString().slice(0, 10),
    });
    expect(info.variant).toBe('closing');
    expect(info.label).toBe('In chiusura');
  });

  it('shows formed when threshold met', () => {
    const info = editionScarcity({
      confirmed_count: 4,
      min_confirmed: 4,
      date_from: '2026-12-01',
      status: 'formed',
    });
    expect(info.variant).toBe('formed');
  });
});
