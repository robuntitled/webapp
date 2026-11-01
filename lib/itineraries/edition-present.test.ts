import { describe, expect, it } from 'vitest';
import { formatEditionDateRange } from '@/lib/itineraries/dates';
import {
  editionBadgeDisplay,
  editionBudgetOrientativeLabel,
  editionGroupHint,
  editionJoinReason,
  editionParticipantsLabel,
  editionScarcity,
  editionThresholdProgress,
} from '@/lib/itineraries/edition-present';

function assertNoForbiddenCopy(text: string) {
  expect(text.toLowerCase()).not.toContain('soglia');
  expect(text).not.toMatch(/in chiusura/i);
  expect(text).not.toMatch(/ultimi/i);
}

describe('edition present', () => {
  it('computes threshold progress', () => {
    expect(editionThresholdProgress(2, 4)).toBe(50);
    expect(editionThresholdProgress(5, 4)).toBe(100);
  });

  it('shows departure countdown near date', () => {
    const near = new Date();
    near.setDate(near.getDate() + 10);
    const info = editionScarcity({
      confirmed_count: 2,
      min_confirmed: 4,
      date_from: near.toISOString().slice(0, 10),
    });
    expect(info.variant).toBe('closing');
    expect(info.label).toMatch(/Partenza tra 10 giorni/);
    assertNoForbiddenCopy(info.label);
    assertNoForbiddenCopy(info.sublabel);
  });

  it('shows formed when threshold met', () => {
    const info = editionScarcity({
      confirmed_count: 4,
      min_confirmed: 4,
      date_from: '2026-12-01',
      status: 'formed',
    });
    expect(info.variant).toBe('formed');
    assertNoForbiddenCopy(info.label);
  });

  it('formats badge labels without false scarcity', () => {
    const open = editionScarcity({
      confirmed_count: 0,
      min_confirmed: 4,
      date_from: '2027-06-01',
    });
    expect(editionBadgeDisplay(open, 6)).toBe('Gruppo in formazione');
    assertNoForbiddenCopy(editionBadgeDisplay(open, 6));
  });

  it('never uses Ultimi posti wording', () => {
    const near = new Date();
    near.setDate(near.getDate() + 40);
    const warming = editionScarcity({
      confirmed_count: 2,
      min_confirmed: 4,
      date_from: near.toISOString().slice(0, 10),
    });
    assertNoForbiddenCopy(warming.label);
    expect(warming.label).toBe('Gruppo in formazione');
  });

  it('formats participants and group hints', () => {
    expect(
      editionParticipantsLabel({ interested_count: 2, confirmed_count: 1 })
    ).toBe('👥 3 iscritti al gruppo');
    expect(editionGroupHint(1, 6, 2, 1)).toBe('3 iscritti al gruppo');
    assertNoForbiddenCopy(editionJoinReason({ confirmed_count: 1, min_confirmed: 6, interested_count: 2 }));
  });

  it('formats edition date range', () => {
    expect(formatEditionDateRange('2027-01-08', '2027-01-28')).toBe(
      '08 → 28 gennaio 2027'
    );
  });

  it('labels budget as orientative, never group price', () => {
    expect(editionBudgetOrientativeLabel(1700, 14)).toBe(
      'Budget orientativo · 1.700 € · 14 giorni'
    );
    expect(editionBudgetOrientativeLabel(null)).toBeNull();
  });
});
