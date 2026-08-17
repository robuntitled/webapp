import { describe, expect, it } from 'vitest';
import { draftFromTripTemplate, TRIP_TEMPLATES } from '@/lib/composer/trip-templates';

describe('trip templates', () => {
  it('seeds featured templates for cold start', () => {
    expect(TRIP_TEMPLATES.length).toBeGreaterThan(0);
    expect(TRIP_TEMPLATES.some((t) => t.featured)).toBe(true);
  });

  it('builds a forming-ready draft from a template', () => {
    const tpl = TRIP_TEMPLATES[0];
    const draft = draftFromTripTemplate(tpl, '2026-10-01');
    expect(draft.destination).toBeTruthy();
    expect(draft.days?.length).toBe(tpl.durationDays);
    expect(draft.minParticipants).toBe(4);
  });
});
