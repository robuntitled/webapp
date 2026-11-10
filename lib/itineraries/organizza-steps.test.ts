import { describe, expect, it } from 'vitest';
import {
  EMPTY_ORGANIZZA_DRAFT,
  canNavigateToOrganizzaStep,
  clampAmiciTravelers,
  companyChoiceToTravelMode,
  companyShowsInviteAfterCreate,
  defaultTravelersForCompany,
  durationDaysFromRange,
  isImpostaComplete,
  isPartenzaComplete,
  nextOrganizzaStep,
  normalizeOrganizzaCompany,
  normalizeOrganizzaStep,
  ORGANIZZA_STEPS,
  organizzaCompletedSteps,
  patchOrganizzaDraft,
  prevOrganizzaStep,
} from '@/lib/itineraries/organizza-steps';

describe('organizza stepper (Imposta → Partenza → Voli → Itinerario)', () => {
  it('has four stages', () => {
    expect(ORGANIZZA_STEPS.map((s) => s.id)).toEqual([
      'imposta',
      'partenza',
      'voli',
      'itinerario',
    ]);
  });

  it('starts empty', () => {
    expect(organizzaCompletedSteps(EMPTY_ORGANIZZA_DRAFT).size).toBe(0);
    expect(EMPTY_ORGANIZZA_DRAFT.originIata).toBeNull();
    expect(EMPTY_ORGANIZZA_DRAFT.homeReturnIata).toBeNull();
  });

  it('advances through the four stages', () => {
    let draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
    });
    expect(isImpostaComplete(draft)).toBe(true);
    expect(isPartenzaComplete(draft)).toBe(false);
    expect(nextOrganizzaStep('imposta', draft)).toBe('partenza');

    draft = patchOrganizzaDraft(draft, {
      originIata: 'MXP',
      homeReturnIata: 'MXP',
      dateFrom: '2026-12-11',
      dateTo: '2026-12-24',
      durationDays: 14,
      company: 'amici',
      travelers: 4,
      returnHome: true,
    });
    expect(isPartenzaComplete(draft)).toBe(true);
    expect([...organizzaCompletedSteps(draft)].sort()).toEqual(
      ['imposta', 'partenza'].sort()
    );
    expect(nextOrganizzaStep('partenza', draft)).toBe('voli');

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
    expect(nextOrganizzaStep('voli', draft)).toBe('itinerario');
    expect(prevOrganizzaStep('itinerario')).toBe('voli');
    expect(prevOrganizzaStep('partenza')).toBe('imposta');
  });

  it('requires origin before partenza complete', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'vietnam',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-20',
      durationDays: 11,
      company: 'solo',
      travelers: 1,
      returnHome: true,
      homeReturnIata: 'MXP',
    });
    expect(isPartenzaComplete(draft)).toBe(false);
  });

  it('maps company choices without Gruppo', () => {
    expect(companyChoiceToTravelMode('solo')).toBe('solo');
    expect(companyChoiceToTravelMode('coppia')).toBe('friends');
    expect(companyChoiceToTravelMode('amici')).toBe('friends');
    expect(companyShowsInviteAfterCreate('amici')).toBe(true);
    expect(companyShowsInviteAfterCreate('solo')).toBe(false);
    expect(defaultTravelersForCompany('coppia')).toBe(2);
    expect(normalizeOrganizzaCompany('gruppo')).toBe('amici');
    expect(normalizeOrganizzaStep('dove-quando')).toBe('imposta');
    expect(normalizeOrganizzaStep('quando')).toBe('partenza');
    expect(normalizeOrganizzaStep('riepilogo')).toBe('itinerario');
    expect(clampAmiciTravelers(1)).toBe(2);
    expect(clampAmiciTravelers(99)).toBe(20);
  });

  it('blocks skipping ahead', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, { slug: 'vietnam' });
    expect(canNavigateToOrganizzaStep(draft, 'voli', 'imposta')).toBe(false);
    expect(canNavigateToOrganizzaStep(draft, 'partenza', 'imposta')).toBe(true);
  });

  it('duration from free calendar range', () => {
    expect(durationDaysFromRange('2026-11-10', '2026-11-20')).toBe(11);
  });
});
