/**
 * Organizza flow (owner redesign Nov 2026):
 * Dove e quando → Voli consigliati → Riepilogo compatto
 * Solo / amici → privato. Gruppo → /gruppi.
 */

import type { TravelMode } from '@/lib/itineraries/types';

export const ORGANIZZA_STEPS = [
  { id: 'dove-quando', label: 'Dove e quando', index: 0 },
  { id: 'voli', label: 'Voli', index: 1 },
  { id: 'riepilogo', label: 'Riepilogo', index: 2 },
] as const;

export type OrganizzaStepId = (typeof ORGANIZZA_STEPS)[number]['id'];

export type OrganizzaCompanyChoice = 'solo' | 'amici' | 'gruppo';

export type OrganizzaSelectedFlight = {
  offerId: string;
  labelIt: string;
  price: number;
  currency: string;
  originIata: string;
  destinationIata: string;
  returnOriginIata?: string | null;
  departureAt: string;
  arrivalAt: string;
  returnDepartureAt?: string | null;
  returnArrivalAt?: string | null;
  stops: number;
  durationMinutes: number;
  pickKind: 'cheapest' | 'fastest' | 'balanced' | 'manual';
};

export type OrganizzaDraft = {
  slug: string | null;
  slugs: string[] | null;
  durationDays: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  company: OrganizzaCompanyChoice | null;
  tripName: string;
  vibe: string | null;
  arrivalIata: string | null;
  departureIata: string | null;
  /** Home / Italy side airport for search. */
  originIata: string | null;
  selectedFlight: OrganizzaSelectedFlight | null;
  legalAck: boolean;
};

export const EMPTY_ORGANIZZA_DRAFT: OrganizzaDraft = {
  slug: null,
  slugs: null,
  durationDays: null,
  dateFrom: null,
  dateTo: null,
  company: 'solo',
  tripName: '',
  vibe: null,
  arrivalIata: null,
  departureIata: null,
  originIata: 'MXP',
  selectedFlight: null,
  legalAck: false,
};

export function isMultiCountryDraft(draft: OrganizzaDraft): boolean {
  return Array.isArray(draft.slugs) && draft.slugs.length >= 2;
}

export function organizzaStepIndex(id: OrganizzaStepId): number {
  return ORGANIZZA_STEPS.find((s) => s.id === id)?.index ?? 0;
}

export function organizzaStepByIndex(index: number): OrganizzaStepId {
  const clamped = Math.max(0, Math.min(ORGANIZZA_STEPS.length - 1, index));
  return ORGANIZZA_STEPS[clamped]!.id;
}

export function organizzaCompletedSteps(draft: OrganizzaDraft): Set<OrganizzaStepId> {
  const done = new Set<OrganizzaStepId>();
  if (draft.slug && draft.dateFrom && draft.dateTo && draft.durationDays) {
    done.add('dove-quando');
  }
  if (done.has('dove-quando') && draft.selectedFlight) {
    done.add('voli');
  }
  if (
    done.has('voli') &&
    (draft.company === 'solo' || draft.company === 'amici' || draft.company === 'gruppo')
  ) {
    done.add('riepilogo');
  }
  return done;
}

export function canNavigateToOrganizzaStep(
  draft: OrganizzaDraft,
  target: OrganizzaStepId,
  current: OrganizzaStepId
): boolean {
  const targetIdx = organizzaStepIndex(target);
  const currentIdx = organizzaStepIndex(current);
  if (targetIdx <= currentIdx) return true;
  const done = organizzaCompletedSteps(draft);
  for (const step of ORGANIZZA_STEPS) {
    if (step.index >= targetIdx) break;
    if (!done.has(step.id)) return false;
  }
  return true;
}

export function companyChoiceToTravelMode(
  company: OrganizzaCompanyChoice
): TravelMode | 'redirect-gruppi' {
  if (company === 'solo') return 'solo';
  if (company === 'amici') return 'friends';
  return 'redirect-gruppi';
}

export function companyCreatesPrivateTrip(company: OrganizzaCompanyChoice): boolean {
  return company === 'solo' || company === 'amici';
}

export function companyCreatesPublicGroup(company: OrganizzaCompanyChoice): boolean {
  return company === 'gruppo';
}

export function nextOrganizzaStep(
  current: OrganizzaStepId,
  draft: OrganizzaDraft
): OrganizzaStepId | 'gruppi' | null {
  if (current === 'riepilogo' && draft.company === 'gruppo') return 'gruppi';
  const idx = organizzaStepIndex(current);
  if (idx >= ORGANIZZA_STEPS.length - 1) return null;
  const next = organizzaStepByIndex(idx + 1);
  if (!canNavigateToOrganizzaStep(draft, next, current)) return null;
  return next;
}

export function prevOrganizzaStep(current: OrganizzaStepId): OrganizzaStepId | null {
  const idx = organizzaStepIndex(current);
  if (idx <= 0) return null;
  return organizzaStepByIndex(idx - 1);
}

export function patchOrganizzaDraft(
  draft: OrganizzaDraft,
  patch: Partial<OrganizzaDraft>
): OrganizzaDraft {
  return { ...draft, ...patch };
}

/** Inclusive calendar days between ISO dates. */
export function durationDaysFromRange(dateFrom: string, dateTo: string): number {
  const a = Date.parse(`${dateFrom}T12:00:00Z`);
  const b = Date.parse(`${dateTo}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}
