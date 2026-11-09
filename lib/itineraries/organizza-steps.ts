/**
 * Organizza flow (owner redesign Nov 2026):
 * Dove → Quando → Con chi → Voli → Riepilogo
 * Solo / coppia / amici → privato. Gruppo removed from Con chi.
 */

import type { TravelMode } from '@/lib/itineraries/types';

export const ORGANIZZA_STEPS = [
  { id: 'dove', label: 'Dove', index: 0 },
  { id: 'quando', label: 'Quando', index: 1 },
  { id: 'con-chi', label: 'Con chi', index: 2 },
  { id: 'voli', label: 'Voli', index: 3 },
  { id: 'riepilogo', label: 'Riepilogo', index: 4 },
] as const;

export type OrganizzaStepId = (typeof ORGANIZZA_STEPS)[number]['id'];

/** Gruppo removed from Con chi (confused with amici). */
export type OrganizzaCompanyChoice = 'solo' | 'coppia' | 'amici';

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
  /** Party size (1 solo, 2 coppia, N amici). */
  travelers: number;
  tripName: string;
  vibe: string | null;
  arrivalIata: string | null;
  departureIata: string | null;
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
  company: null,
  travelers: 1,
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
  if (draft.slug) done.add('dove');
  if (done.has('dove') && draft.dateFrom && draft.dateTo && draft.durationDays) {
    done.add('quando');
  }
  if (
    done.has('quando') &&
    (draft.company === 'solo' || draft.company === 'coppia' || draft.company === 'amici') &&
    draft.travelers >= 1
  ) {
    done.add('con-chi');
  }
  if (done.has('con-chi') && draft.selectedFlight) {
    done.add('voli');
  }
  if (done.has('voli') && draft.company) {
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
): TravelMode {
  if (company === 'solo') return 'solo';
  // Coppia e amici: edizione privata con invito disponibile.
  return 'friends';
}

export function companyCreatesPrivateTrip(company: OrganizzaCompanyChoice): boolean {
  return company === 'solo' || company === 'coppia' || company === 'amici';
}

export function companyShowsInviteAfterCreate(company: OrganizzaCompanyChoice): boolean {
  return company === 'amici' || company === 'coppia';
}

export function defaultTravelersForCompany(company: OrganizzaCompanyChoice): number {
  if (company === 'solo') return 1;
  if (company === 'coppia') return 2;
  return 3;
}

export function nextOrganizzaStep(
  current: OrganizzaStepId,
  draft: OrganizzaDraft
): OrganizzaStepId | null {
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

/** Migrate legacy drafts that still have dove-quando / gruppo. */
export function normalizeOrganizzaStep(raw: string | null | undefined): OrganizzaStepId {
  if (raw === 'dove-quando' || raw === 'meta') return 'dove';
  if (raw === 'date') return 'quando';
  if (
    raw === 'dove' ||
    raw === 'quando' ||
    raw === 'con-chi' ||
    raw === 'voli' ||
    raw === 'riepilogo'
  ) {
    return raw;
  }
  return 'dove';
}

export function normalizeOrganizzaCompany(
  raw: string | null | undefined
): OrganizzaCompanyChoice | null {
  if (raw === 'solo' || raw === 'coppia' || raw === 'amici') return raw;
  if (raw === 'gruppo') return 'amici';
  if (raw === 'friends') return 'amici';
  return null;
}
