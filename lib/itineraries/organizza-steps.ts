/**
 * Stepper lineare Organizza (meta → date → con chi → riepilogo).
 * Solo / amici → sempre privato (mai attach a edition altrui).
 * Gruppo → percorso pubblico (/gruppi) o creazione privata da rendere pubblica dopo.
 */

import type { TravelMode } from '@/lib/itineraries/types';

export const ORGANIZZA_STEPS = [
  { id: 'meta', label: 'Meta', index: 0 },
  { id: 'date', label: 'Date', index: 1 },
  { id: 'con-chi', label: 'Con chi', index: 2 },
  { id: 'riepilogo', label: 'Riepilogo', index: 3 },
] as const;

export type OrganizzaStepId = (typeof ORGANIZZA_STEPS)[number]['id'];

export type OrganizzaCompanyChoice = 'solo' | 'amici' | 'gruppo';

export type OrganizzaDraft = {
  slug: string | null;
  durationDays: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  company: OrganizzaCompanyChoice | null;
  tripName: string;
  vibe: string | null;
};

export const EMPTY_ORGANIZZA_DRAFT: OrganizzaDraft = {
  slug: null,
  durationDays: null,
  dateFrom: null,
  dateTo: null,
  company: null,
  tripName: '',
  vibe: null,
};

export function organizzaStepIndex(id: OrganizzaStepId): number {
  return ORGANIZZA_STEPS.find((s) => s.id === id)?.index ?? 0;
}

export function organizzaStepByIndex(index: number): OrganizzaStepId {
  const clamped = Math.max(0, Math.min(ORGANIZZA_STEPS.length - 1, index));
  return ORGANIZZA_STEPS[clamped]!.id;
}

/** Passi completati: ogni step precedente ha i dati minimi. */
export function organizzaCompletedSteps(draft: OrganizzaDraft): Set<OrganizzaStepId> {
  const done = new Set<OrganizzaStepId>();
  if (draft.slug && draft.durationDays) done.add('meta');
  if (draft.dateFrom && draft.dateTo) done.add('date');
  if (draft.company === 'solo' || draft.company === 'amici' || draft.company === 'gruppo') {
    done.add('con-chi');
  }
  if (
    done.has('meta') &&
    done.has('date') &&
    done.has('con-chi') &&
    draft.company !== 'gruppo'
  ) {
    done.add('riepilogo');
  }
  return done;
}

/**
 * Può avanzare allo step target solo se tutti i precedenti sono completi
 * (o se torna indietro — back non cancella le selezioni).
 */
export function canNavigateToOrganizzaStep(
  draft: OrganizzaDraft,
  target: OrganizzaStepId,
  current: OrganizzaStepId
): boolean {
  const targetIdx = organizzaStepIndex(target);
  const currentIdx = organizzaStepIndex(current);
  if (targetIdx <= currentIdx) return true; // indietro / stesso sempre ok
  const done = organizzaCompletedSteps(draft);
  for (const step of ORGANIZZA_STEPS) {
    if (step.index >= targetIdx) break;
    if (!done.has(step.id)) return false;
  }
  return true;
}

/**
 * Solo e amici creano SEMPRE un viaggio privato (TravelMode solo|friends).
 * Gruppo non crea qui: porta a /gruppi (join) — o, se esplicito, mode group privato.
 */
export function companyChoiceToTravelMode(
  company: OrganizzaCompanyChoice
): TravelMode | 'redirect-gruppi' {
  if (company === 'solo') return 'solo';
  if (company === 'amici') return 'friends';
  return 'redirect-gruppi';
}

/** Privacy: solo/amici → edition privata (o bozza solo). Mai official reuse. */
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
  if (current === 'con-chi' && draft.company === 'gruppo') return 'gruppi';
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

/** Merge draft preservando le selezioni (back non le cancella). */
export function patchOrganizzaDraft(
  draft: OrganizzaDraft,
  patch: Partial<OrganizzaDraft>
): OrganizzaDraft {
  return { ...draft, ...patch };
}
