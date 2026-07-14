import { describe, expect, it } from 'vitest';
import { buildPlannerPromptBlock } from '@/lib/composer/planner-prompt';
import type { PlannerProfile } from '@/types/planner';

const sample: PlannerProfile = {
  travelStyle: 'adventure',
  pace: 'balanced',
  budgetLevel: 'mid',
  interests: ['photography', 'hiking'],
  accommodationPref: 'hotel',
  experienceLevel: 'first_time',
  freeNotes: 'Early bird',
};

describe('buildPlannerPromptBlock', () => {
  it('returns null without profile', () => {
    expect(buildPlannerPromptBlock(undefined)).toBeNull();
  });

  it('builds compact traveler line for LLM', () => {
    const block = buildPlannerPromptBlock(sample);
    expect(block).toContain('stile=Avventura');
    expect(block).toContain('Fotografia');
    expect(block).toContain('note=Early bird');
  });
});