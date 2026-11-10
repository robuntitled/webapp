/**
 * Organizza flow (owner feedback Nov 2026):
 * Imposta (destinazioni) → Partenza (aeroporti/date/con chi) → Voli → Itinerario
 * Solo / coppia / amici → privato. Gruppo removed.
 */

import type { TravelMode } from '@/lib/itineraries/types';
import type { TripFlightPlan } from '@/lib/travel/trip-flight-legs';

export const ORGANIZZA_STEPS = [
  { id: 'imposta', label: 'Imposta', index: 0 },
  { id: 'partenza', label: 'Partenza', index: 1 },
  { id: 'voli', label: 'Voli', index: 2 },
  { id: 'itinerario', label: 'Itinerario', index: 3 },
] as const;

export type OrganizzaStepId = (typeof ORGANIZZA_STEPS)[number]['id'];

/** Gruppo removed from Con chi (confused with amici). */
export type OrganizzaCompanyChoice = 'solo' | 'coppia' | 'amici';

export type OrganizzaTripType = 'roundtrip' | 'oneway' | 'multi';

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
  /** Return-to airport (may differ from origin — open-jaw home). */
  homeReturnIata: string | null;
  /** When false, no return-home flight leg (trip end date still kept). */
  returnHome: boolean;
  tripType: OrganizzaTripType;
  /** Main legs (outbound / intercountry / return) — Voli stage. */
  flightPlan: TripFlightPlan | null;
  /** Domestic legs proposed only at itinerary stage. */
  domesticPlan: TripFlightPlan | null;
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
  originIata: null,
  homeReturnIata: null,
  returnHome: true,
  tripType: 'roundtrip',
  flightPlan: null,
  domesticPlan: null,
  selectedFlight: null,
  legalAck: false,
};

export const AMICI_TRAVELERS_MIN = 2;
export const AMICI_TRAVELERS_MAX = 20;

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

/** Step 1: destinazioni (+ tipo A/R | solo andata). */
export function isImpostaComplete(draft: OrganizzaDraft): boolean {
  return Boolean(draft.slug);
}

/** Step 2: aeroporti, date, compagnia. */
export function isPartenzaComplete(draft: OrganizzaDraft): boolean {
  if (!isImpostaComplete(draft)) return false;
  if (!draft.originIata || draft.originIata.length !== 3) return false;
  if (!draft.dateFrom) return false;
  if (draft.returnHome) {
    if (!draft.dateTo || !draft.homeReturnIata || draft.homeReturnIata.length !== 3) {
      return false;
    }
  } else if (!draft.dateTo) {
    return false;
  }
  if (!draft.durationDays || draft.durationDays < 1) return false;
  if (
    draft.company !== 'solo' &&
    draft.company !== 'coppia' &&
    draft.company !== 'amici'
  ) {
    return false;
  }
  if (draft.company === 'amici') {
    return (
      draft.travelers >= AMICI_TRAVELERS_MIN &&
      draft.travelers <= AMICI_TRAVELERS_MAX
    );
  }
  return draft.travelers >= 1;
}

export function hasMainFlightSelection(draft: OrganizzaDraft): boolean {
  const plan = draft.flightPlan;
  if (!plan || plan.legs.length === 0) {
    return Boolean(draft.selectedFlight && draft.selectedFlight.offerId);
  }
  const required = plan.legs.filter(
    (l) => l.kind !== 'domestic' && l.kind !== 'internal'
  );
  if (required.length === 0) return Boolean(draft.selectedFlight);
  return required.every(
    (l) => l.status === 'selected' || l.status === 'stale' || l.offer != null
  );
}

export function organizzaCompletedSteps(draft: OrganizzaDraft): Set<OrganizzaStepId> {
  const done = new Set<OrganizzaStepId>();
  if (isImpostaComplete(draft)) done.add('imposta');
  if (done.has('imposta') && isPartenzaComplete(draft)) done.add('partenza');
  if (done.has('partenza') && hasMainFlightSelection(draft)) done.add('voli');
  if (done.has('voli') && draft.company) done.add('itinerario');
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

export function clampAmiciTravelers(n: number): number {
  if (!Number.isFinite(n)) return AMICI_TRAVELERS_MIN;
  return Math.min(AMICI_TRAVELERS_MAX, Math.max(AMICI_TRAVELERS_MIN, Math.round(n)));
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

/** Migrate legacy step ids and older drafts. */
export function normalizeOrganizzaStep(raw: string | null | undefined): OrganizzaStepId {
  if (
    raw === 'dove' ||
    raw === 'meta' ||
    raw === 'dove-quando'
  ) {
    return 'imposta';
  }
  if (raw === 'quando' || raw === 'con-chi' || raw === 'date' || raw === 'dettagli') {
    return 'partenza';
  }
  if (raw === 'riepilogo') return 'itinerario';
  if (
    raw === 'imposta' ||
    raw === 'partenza' ||
    raw === 'voli' ||
    raw === 'itinerario'
  ) {
    return raw;
  }
  return 'imposta';
}

export function normalizeOrganizzaCompany(
  raw: string | null | undefined
): OrganizzaCompanyChoice | null {
  if (raw === 'solo' || raw === 'coppia' || raw === 'amici') return raw;
  if (raw === 'gruppo') return 'amici';
  if (raw === 'friends') return 'amici';
  return null;
}

export function tripTypeFromDraft(draft: OrganizzaDraft): OrganizzaTripType {
  if (draft.tripType === 'multi' || isMultiCountryDraft(draft)) return 'multi';
  if (!draft.returnHome) return 'oneway';
  return 'roundtrip';
}
