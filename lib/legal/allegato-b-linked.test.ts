import { describe, expect, it } from 'vitest';
import {
  ALLEGATO_B_DRAFT_BANNER,
  getAllegatoBLinkedDraftCopy,
} from '@/lib/legal/allegato-b-linked';

describe('A7 Allegato B draft (nuovo-flusso-legale §L1.4)', () => {
  it('marks copy as lawyer-review draft and keeps LEGAL placeholders', () => {
    const copy = getAllegatoBLinkedDraftCopy();
    expect(copy.banner).toBe(ALLEGATO_B_DRAFT_BANNER);
    expect(copy.banner).toMatch(/BOZZA/i);
    expect(copy.title).toMatch(/servizi turistici collegati/i);
    const body = copy.paragraphs.join(' ');
    expect(body).toMatch(/NON beneficerai dei diritti applicabili ai pacchetti/i);
    expect(body).toMatch(/servizio turistico collegato/i);
    expect(body).toMatch(/insolvenza/i);
    expect(body).toMatch(/contatto in definizione|da definire/i);
    expect(body).not.toMatch(/TODO LEGAL_EMAIL/i);
    expect(body).not.toMatch(/privacy@|supporto@/i);
  });
});
