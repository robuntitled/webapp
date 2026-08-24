import { describe, expect, it } from 'vitest';
import {
  POINTS,
  isLaunchWindow,
  pointsForAction,
  POINTS_LAUNCH_AT,
} from '@/lib/commerce/points';
import { evaluateQualityGate } from '@/lib/composer/quality-gate';

describe('NomadPoints amounts', () => {
  it('uses action amounts from the loyalty spec', () => {
    expect(POINTS.create_trip_published.points).toBe(20);
    expect(POINTS.group_formed.points).toBe(150);
    expect(POINTS.group_doubled.points).toBe(80);
    expect(POINTS.invite_register.points).toBe(15);
    expect(POINTS.invite_join_trip.points).toBe(25);
    expect(POINTS.invite_trip_departed.points).toBe(40);
    expect(POINTS.profile_completed.points).toBe(50);
    expect(POINTS.review_verified.points).toBe(40);
  });

  it('applies launch multipliers inside the 90-day window', () => {
    const inWindow = new Date(POINTS_LAUNCH_AT.getTime() + 86400000);
    expect(isLaunchWindow(inWindow)).toBe(true);
    expect(pointsForAction('group_formed', { now: inWindow })).toBe(450);
    expect(pointsForAction('invite_register', { now: inWindow })).toBe(30);
  });

  it('keeps founding creator ×3 after launch', () => {
    const after = new Date(POINTS_LAUNCH_AT.getTime() + 120 * 86400000);
    expect(isLaunchWindow(after)).toBe(false);
    expect(pointsForAction('group_formed', { now: after })).toBe(150);
    expect(pointsForAction('group_formed', { now: after, foundingCreator: true })).toBe(450);
  });
});

describe('quality gate', () => {
  it('blocks empty itinerary and tiny budget', () => {
    const issues = evaluateQualityGate({
      title: 'Go',
      destination: 'Kenya',
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      description: 'x',
      minParticipants: 1,
      maxParticipants: 8,
      planningMode: 'group',
    });
    expect(issues.some((i) => i.code === 'description')).toBe(true);
    expect(issues.some((i) => i.code === 'dates')).toBe(true);
    expect(issues.some((i) => i.code === 'budget')).toBe(true);
    expect(issues.some((i) => i.code === 'min_participants')).toBe(true);
  });

  it('passes a complete trip', () => {
    const issues = evaluateQualityGate({
      title: 'Kenya in 10 giorni sulla costa',
      destination: 'Kenya',
      startDate: '2026-09-10',
      endDate: '2026-09-19',
      description:
        'Safari e costa: Nairobi, Masai Mara e Diani. Ritmo lento, tre mete, niente corsa.',
      budgetOrientativo: 1400,
      minParticipants: 6,
      maxParticipants: 12,
      planningMode: 'group',
    });
    expect(issues).toEqual([]);
  });
});
