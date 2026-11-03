import { describe, expect, it } from 'vitest';
import {
  EMPTY_ORGANIZZA_DRAFT,
  patchOrganizzaDraft,
  type OrganizzaDraft,
} from '@/lib/itineraries/organizza-steps';

/** Mirrors OrganizzaWizard sessionStorage (de)serialisation. */
function serialize(draft: OrganizzaDraft, step: string) {
  return JSON.stringify({ draft, step, whenSelection: null });
}

function deserialize(raw: string): { draft: OrganizzaDraft; step: string } | null {
  try {
    const parsed = JSON.parse(raw) as { draft?: OrganizzaDraft; step?: string };
    if (!parsed?.draft || typeof parsed.draft !== 'object') return null;
    return {
      draft: patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, parsed.draft),
      step: parsed.step ?? 'meta',
    };
  } catch {
    return null;
  }
}

describe('organizza draft storage', () => {
  it('round-trips draft fields', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 14,
      dateFrom: '2027-01-10',
      dateTo: '2027-01-24',
      company: 'solo',
    });
    const restored = deserialize(serialize(draft, 'riepilogo'));
    expect(restored?.step).toBe('riepilogo');
    expect(restored?.draft.slug).toBe('thailandia');
    expect(restored?.draft.dateFrom).toBe('2027-01-10');
    expect(restored?.draft.company).toBe('solo');
  });

  it('returns null on garbage', () => {
    expect(deserialize('{not-json')).toBeNull();
    expect(deserialize('{}')).toBeNull();
  });
});
