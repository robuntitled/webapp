import { describe, expect, it } from 'vitest';
import {
  formatQuotaUserMessage,
  isGeminiQuotaError,
  parseRetrySecondsFromGeminiError,
} from '@/lib/ai/quota';

describe('isGeminiQuotaError', () => {
  it('detects free tier quota messages', () => {
    expect(
      isGeminiQuotaError(
        'Quota exceeded for metric: generate_content_free_tier_requests, limit: 10'
      )
    ).toBe(true);
  });
});

describe('parseRetrySecondsFromGeminiError', () => {
  it('parses retry delay from API message', () => {
    expect(
      parseRetrySecondsFromGeminiError('Please retry in 18.808148056s.')
    ).toBe(19);
  });
});

describe('formatQuotaUserMessage', () => {
  it('returns short Italian guidance', () => {
    expect(formatQuotaUserMessage(20_000)).toContain('20s');
    expect(formatQuotaUserMessage(20_000)).toContain('10 richieste/min');
  });
});