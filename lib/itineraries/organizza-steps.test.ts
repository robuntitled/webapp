import { describe, expect, it } from 'vitest';
import {
  EMPTY_ORGANIZZA_DRAFT,
  canNavigateToOrganizzaStep,
  companyChoiceToTravelMode,
  companyCreatesPrivateTrip,
  companyCreatesPublicGroup,
  nextOrganizzaStep,
  organizzaCompletedSteps,
  patchOrganizzaDraft,
  prevOrganizzaStep,
} from '@/lib/itineraries/organizza-steps';
import { canReusePrivateEditionForUser } from '@/lib/itineraries/private-edition';

describe('organizza stepper state', () => {
  it('starts with no completed steps', () => {
    expect(organizzaCompletedSteps(EMPTY_ORGANIZZA_DRAFT).size).toBe(0);
  });

  it('marks meta complete when slug + duration set', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 14,
    });
    expect([...organizzaCompletedSteps(draft)]).toEqual(['meta']);
  });

  it('allows back navigation without clearing selections', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 10,
      dateFrom: '2026-12-11',
      dateTo: '2026-12-20',
      company: 'amici',
    });
    expect(canNavigateToOrganizzaStep(draft, 'meta', 'riepilogo')).toBe(true);
    expect(prevOrganizzaStep('riepilogo')).toBe('con-chi');
    expect(prevOrganizzaStep('con-chi')).toBe('date');
    expect(draft.slug).toBe('thailandia');
    expect(draft.company).toBe('amici');
  });

  it('blocks forward skip until prior steps complete', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 10,
    });
    expect(canNavigateToOrganizzaStep(draft, 'con-chi', 'meta')).toBe(false);
    expect(canNavigateToOrganizzaStep(draft, 'date', 'meta')).toBe(true);
  });

  it('advances linearly meta → date → con-chi → riepilogo', () => {
    let draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 10,
    });
    expect(nextOrganizzaStep('meta', draft)).toBe('date');
    draft = patchOrganizzaDraft(draft, {
      dateFrom: '2026-12-11',
      dateTo: '2026-12-20',
    });
    expect(nextOrganizzaStep('date', draft)).toBe('con-chi');
    draft = patchOrganizzaDraft(draft, { company: 'solo' });
    expect(nextOrganizzaStep('con-chi', draft)).toBe('riepilogo');
  });
});

describe('organizza private vs group routing', () => {
  it('solo and amici map to private travel modes', () => {
    expect(companyChoiceToTravelMode('solo')).toBe('solo');
    expect(companyChoiceToTravelMode('amici')).toBe('friends');
    expect(companyCreatesPrivateTrip('solo')).toBe(true);
    expect(companyCreatesPrivateTrip('amici')).toBe(true);
    expect(companyCreatesPublicGroup('solo')).toBe(false);
    expect(companyCreatesPublicGroup('amici')).toBe(false);
  });

  it('gruppo redirects to public gruppi path, never private attach', () => {
    expect(companyChoiceToTravelMode('gruppo')).toBe('redirect-gruppi');
    expect(companyCreatesPublicGroup('gruppo')).toBe(true);
    expect(companyCreatesPrivateTrip('gruppo')).toBe(false);
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 14,
      dateFrom: '2026-12-05',
      dateTo: '2026-12-18',
      company: 'gruppo',
    });
    expect(nextOrganizzaStep('con-chi', draft)).toBe('gruppi');
  });

  it('private create never reuses another user edition (privacy invariant)', () => {
    const foreign = {
      edition_type: 'private',
      created_by: 'user-a',
    };
    expect(canReusePrivateEditionForUser(foreign, 'user-b')).toBe(false);
    expect(companyCreatesPrivateTrip('amici')).toBe(true);
  });
});
