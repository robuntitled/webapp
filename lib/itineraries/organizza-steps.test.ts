import { describe, expect, it } from 'vitest';
import {
  EMPTY_ORGANIZZA_DRAFT,
  canNavigateToOrganizzaStep,
  companyChoiceToTravelMode,
  companyCreatesPrivateTrip,
  companyCreatesPublicGroup,
  durationDaysFromRange,
  nextOrganizzaStep,
  organizzaCompletedSteps,
  patchOrganizzaDraft,
  prevOrganizzaStep,
} from '@/lib/itineraries/organizza-steps';
import { canReusePrivateEditionForUser } from '@/lib/itineraries/private-edition';

describe('organizza stepper state (redesign)', () => {
  it('starts with no completed steps', () => {
    expect(organizzaCompletedSteps(EMPTY_ORGANIZZA_DRAFT).size).toBe(0);
  });

  it('marks dove-quando complete when slug + dates + duration set', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 14,
      dateFrom: '2026-12-11',
      dateTo: '2026-12-24',
    });
    expect([...organizzaCompletedSteps(draft)]).toEqual(['dove-quando']);
  });

  it('allows back navigation without clearing selections', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 10,
      dateFrom: '2026-12-11',
      dateTo: '2026-12-20',
      company: 'amici',
      selectedFlight: {
        offerId: 'x',
        labelIt: 'Equilibrato',
        price: 500,
        currency: 'EUR',
        originIata: 'MXP',
        destinationIata: 'BKK',
        departureAt: '2026-12-11T10:00:00',
        arrivalAt: '2026-12-11T22:00:00',
        stops: 0,
        durationMinutes: 600,
        pickKind: 'balanced',
      },
    });
    expect(canNavigateToOrganizzaStep(draft, 'dove-quando', 'riepilogo')).toBe(true);
    expect(prevOrganizzaStep('riepilogo')).toBe('voli');
    expect(prevOrganizzaStep('voli')).toBe('dove-quando');
    expect(draft.slug).toBe('thailandia');
  });

  it('blocks forward skip until prior steps complete', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 10,
      dateFrom: '2026-12-11',
      dateTo: '2026-12-20',
    });
    expect(canNavigateToOrganizzaStep(draft, 'voli', 'dove-quando')).toBe(true);
    expect(canNavigateToOrganizzaStep(draft, 'riepilogo', 'dove-quando')).toBe(false);
  });

  it('advances dove-quando → voli → riepilogo', () => {
    let draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 10,
      dateFrom: '2026-12-11',
      dateTo: '2026-12-20',
    });
    expect(nextOrganizzaStep('dove-quando', draft)).toBe('voli');
    draft = patchOrganizzaDraft(draft, {
      selectedFlight: {
        offerId: 'x',
        labelIt: 'Più conveniente',
        price: 400,
        currency: 'EUR',
        originIata: 'MXP',
        destinationIata: 'BKK',
        departureAt: '2026-12-11T10:00:00',
        arrivalAt: '2026-12-11T22:00:00',
        stops: 1,
        durationMinutes: 900,
        pickKind: 'cheapest',
      },
    });
    expect(nextOrganizzaStep('voli', draft)).toBe('riepilogo');
  });

  it('computes inclusive duration from free calendar range', () => {
    expect(durationDaysFromRange('2026-11-10', '2026-11-20')).toBe(11);
    expect(durationDaysFromRange('2026-11-10', '2026-11-19')).toBe(10);
  });
});

describe('organizza private vs group routing', () => {
  it('solo and amici map to private travel modes', () => {
    expect(companyChoiceToTravelMode('solo')).toBe('solo');
    expect(companyChoiceToTravelMode('amici')).toBe('friends');
    expect(companyCreatesPrivateTrip('solo')).toBe(true);
    expect(companyCreatesPrivateTrip('amici')).toBe(true);
    expect(companyCreatesPublicGroup('solo')).toBe(false);
  });

  it('gruppo redirects on create from riepilogo', () => {
    expect(companyChoiceToTravelMode('gruppo')).toBe('redirect-gruppi');
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      durationDays: 14,
      dateFrom: '2026-12-05',
      dateTo: '2026-12-18',
      company: 'gruppo',
      selectedFlight: {
        offerId: 'x',
        labelIt: 'Equilibrato',
        price: 500,
        currency: 'EUR',
        originIata: 'MXP',
        destinationIata: 'BKK',
        departureAt: '2026-12-05T10:00:00',
        arrivalAt: '2026-12-05T22:00:00',
        stops: 0,
        durationMinutes: 600,
        pickKind: 'balanced',
      },
    });
    expect(nextOrganizzaStep('riepilogo', draft)).toBe('gruppi');
  });

  it('private create never reuses another user edition', () => {
    const foreign = { edition_type: 'private', created_by: 'user-a' };
    expect(canReusePrivateEditionForUser(foreign, 'user-b')).toBe(false);
  });
});
