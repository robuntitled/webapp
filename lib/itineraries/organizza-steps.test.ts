import { describe, expect, it } from 'vitest';
import {
  EMPTY_ORGANIZZA_DRAFT,
  canNavigateToOrganizzaStep,
  companyChoiceToTravelMode,
  companyShowsInviteAfterCreate,
  defaultTravelersForCompany,
  durationDaysFromRange,
  nextOrganizzaStep,
  normalizeOrganizzaCompany,
  normalizeOrganizzaStep,
  organizzaCompletedSteps,
  patchOrganizzaDraft,
  prevOrganizzaStep,
} from '@/lib/itineraries/organizza-steps';

describe('organizza stepper (Dove → Quando → Con chi → Voli → Riepilogo)', () => {
  it('starts empty', () => {
    expect(organizzaCompletedSteps(EMPTY_ORGANIZZA_DRAFT).size).toBe(0);
  });

  it('advances through the five steps', () => {
    let draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, { slug: 'thailandia' });
    expect([...organizzaCompletedSteps(draft)]).toEqual(['dove']);
    expect(nextOrganizzaStep('dove', draft)).toBe('quando');

    draft = patchOrganizzaDraft(draft, {
      dateFrom: '2026-12-11',
      dateTo: '2026-12-24',
      durationDays: 14,
    });
    expect(nextOrganizzaStep('quando', draft)).toBe('con-chi');

    draft = patchOrganizzaDraft(draft, { company: 'amici', travelers: 4 });
    expect(nextOrganizzaStep('con-chi', draft)).toBe('voli');

    draft = patchOrganizzaDraft(draft, {
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
    expect(nextOrganizzaStep('voli', draft)).toBe('riepilogo');
    expect(prevOrganizzaStep('riepilogo')).toBe('voli');
  });

  it('maps company choices without Gruppo', () => {
    expect(companyChoiceToTravelMode('solo')).toBe('solo');
    expect(companyChoiceToTravelMode('coppia')).toBe('friends');
    expect(companyChoiceToTravelMode('amici')).toBe('friends');
    expect(companyShowsInviteAfterCreate('amici')).toBe(true);
    expect(companyShowsInviteAfterCreate('solo')).toBe(false);
    expect(defaultTravelersForCompany('coppia')).toBe(2);
    expect(normalizeOrganizzaCompany('gruppo')).toBe('amici');
    expect(normalizeOrganizzaStep('dove-quando')).toBe('dove');
  });

  it('blocks skipping ahead', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, { slug: 'vietnam' });
    expect(canNavigateToOrganizzaStep(draft, 'voli', 'dove')).toBe(false);
  });

  it('duration from free calendar range', () => {
    expect(durationDaysFromRange('2026-11-10', '2026-11-20')).toBe(11);
  });
});
