import { describe, expect, it } from 'vitest';
import {
  DAY_PLAN_JSON_SUFFIX,
  DAY_PLAN_SYSTEM_PROMPT,
  TRIP_PLAN_JSON_SUFFIX,
  TRIP_PLAN_SYSTEM_PROMPT,
} from '@/lib/ai/prompts';

describe('compact day plan prompts', () => {
  it('keeps system prompt compact for small models', () => {
    expect(DAY_PLAN_SYSTEM_PROMPT.length).toBeLessThan(800);
  });

  it('includes minimal JSON schema hint', () => {
    expect(DAY_PLAN_JSON_SUFFIX).toContain('suggestedTitle');
    expect(DAY_PLAN_JSON_SUFFIX).toContain('blocks');
  });

  it('forbids vague airport placeholders', () => {
    expect(DAY_PLAN_SYSTEM_PROMPT).toMatch(/aeroporto più vicino/i);
    expect(TRIP_PLAN_SYSTEM_PROMPT).toMatch(/aeroporto internazionale più vicino/i);
  });
});

describe('full trip prompt', () => {
  it('requires every day and forbids invented prices', () => {
    expect(TRIP_PLAN_SYSTEM_PROMPT).toContain('dayIndex 1..N');
    expect(TRIP_PLAN_SYSTEM_PROMPT).toMatch(/PREZZI/);
  });

  it('shows a multi-day JSON example', () => {
    expect(TRIP_PLAN_JSON_SUFFIX).toContain('tripTitle');
    expect(TRIP_PLAN_JSON_SUFFIX).toContain('"dayIndex":2');
  });
});
