import { describe, expect, it } from 'vitest';
import {
  ALLEGATO_B_DRAFT_BANNER,
  getAllegatoBLinkedDraftCopy,
} from '@/lib/legal/allegato-b-linked';

describe('A7 Allegato B draft', () => {
  it('marks copy as lawyer-review draft and keeps LEGAL placeholders', () => {
    const copy = getAllegatoBLinkedDraftCopy();
    expect(copy.banner).toBe(ALLEGATO_B_DRAFT_BANNER);
    expect(copy.banner).toMatch(/BOZZA/i);
    expect(copy.paragraphs.join(' ')).toMatch(/servizio turistico collegato/i);
    expect(copy.paragraphs.join(' ')).toMatch(/LEGAL_|da definire|TODO LEGAL_/i);
  });
});
