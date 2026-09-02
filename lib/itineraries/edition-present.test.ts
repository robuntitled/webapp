import { describe, expect, it } from 'vitest';
import { formatEditionDateRange } from '@/lib/itineraries/dates';
import {
  editionBadgeDisplay,
  editionGroupHint,
  editionParticipantsLabel,
  editionScarcity,
  editionThresholdProgress,
} from '@/lib/itineraries/edition-present';

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

  it('formats badge labels for card display', () => {
    expect(editionBadgeDisplay({ variant: 'open' }, 6)).toBe('Gruppo in formazione');
    expect(editionBadgeDisplay({ variant: 'warming' }, 5)).toBe('Ultimi 5 posti');
    expect(editionBadgeDisplay({ variant: 'formed' }, 0)).toBe('Gruppo confermato');
  });

  it('formats participants and group hints', () => {
    expect(
      editionParticipantsLabel({ interested_count: 2, confirmed_count: 1 })
    ).toBe('👥 2 iscritti al gruppo');
    expect(editionGroupHint(1, 6)).toBe('Ancora 5 voli per la soglia');
    expect(editionGroupHint(6, 6)).toBe('Soglia voli raggiunta — il gruppo può partire');
  });

  it('formats edition date range', () => {
    expect(formatEditionDateRange('2027-01-08', '2027-01-28')).toBe(
      '08 → 28 gennaio 2027'
    );
  });
});
