import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GEMINI_MODEL,
  isGeminiModelUnavailableError,
  resolveGeminiModelCandidates,
} from '@/lib/ai/models';

describe('resolveGeminiModelCandidates', () => {
  it('maps deprecated gemini-2.5-flash to flash-lite first', () => {
    const models = resolveGeminiModelCandidates('gemini-2.5-flash');
    expect(models[0]).toBe(DEFAULT_GEMINI_MODEL);
    expect(models).toContain('gemini-3.5-flash');
  });

  it('uses default when model is not set', () => {
    expect(resolveGeminiModelCandidates()[0]).toBe(DEFAULT_GEMINI_MODEL);
  });
});

describe('isGeminiModelUnavailableError', () => {
  it('detects deprecation messages', () => {
    expect(
      isGeminiModelUnavailableError(
        'This model models/gemini-2.5-flash is no longer available to new users.'
      )
    ).toBe(true);
  });
});