import { describe, expect, it } from 'vitest';
import { DAY_PLAN_JSON_SUFFIX, DAY_PLAN_SYSTEM_PROMPT } from '@/lib/ai/prompts';

describe('compact day plan prompts', () => {
  it('keeps system prompt under 400 characters', () => {
    expect(DAY_PLAN_SYSTEM_PROMPT.length).toBeLessThan(400);
  });

  it('includes minimal JSON schema hint', () => {
    expect(DAY_PLAN_JSON_SUFFIX).toContain('suggestedTitle');
    expect(DAY_PLAN_JSON_SUFFIX).toContain('blocks');
  });
});
