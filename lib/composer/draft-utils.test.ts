import { describe, expect, it } from 'vitest';
import { isMeaningfulComposerDraft } from '@/lib/composer/draft-utils';

describe('isMeaningfulComposerDraft', () => {
  it('returns false for empty or missing destination', () => {
    expect(isMeaningfulComposerDraft(null)).toBe(false);
    expect(isMeaningfulComposerDraft({})).toBe(false);
    expect(isMeaningfulComposerDraft({ destination: '  ' })).toBe(false);
  });

  it('returns true when destination is set', () => {
    expect(isMeaningfulComposerDraft({ destination: 'Roma' })).toBe(true);
  });
});