/**
 * Build / sync TripFlightPlan from Organizza draft + multi-country logistics.
 * Internal legs only when transfer mode is internal_flight (curated notes/hubs).
 */

import type {
  OrganizzaDraft,
  OrganizzaSelectedFlight,
} from '@/lib/itineraries/organizza-steps';
import type { MultiCountryPlan } from '@/lib/itineraries/multi-country/types';
import { getMaster } from '@/lib/itineraries/masters';
import {
  buildDefaultTripFlightPlan,
  type TripFlightPlan,
} from '@/lib/travel/trip-flight-legs';

function iatasFromNotes(notes: string): [string, string] | null {
  const matches = notes.match(/\b([A-Z]{3})\b/g);
  if (!matches || matches.length < 2) return null;
  return [matches[0]!, matches[1]!];
}

function midIso(from: string, to: string): string {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return from;
  const mid = new Date(a + (b - a) / 2);
  return mid.toISOString().slice(0, 10);
}

/** Infer internal flight hops only when logistics say internal_flight. */
export function internalLegsFromMultiPlan(
  multi: MultiCountryPlan | null,
  dateFrom: string,
  dateTo: string
): Array<{
  originIata: string;
  destinationIata: string;
  date: string;
  labelIt: string;
  notesIt?: string;
}> {
  if (!multi?.ok) return [];
  if (multi.transfer.mode !== 'internal_flight') return [];

  const fromNotes = iatasFromNotes(multi.transfer.notesIt);
  const fromMaster = getMaster(multi.transfer.fromSlug);
  const toMaster = getMaster(multi.transfer.toSlug);
  const origin =
    fromNotes?.[0] ??
    fromMaster?.hubs[fromMaster.hubs.length - 1] ??
    multi.arrivalIata;
  const destination =
    fromNotes?.[1] ?? toMaster?.hubs[0] ?? multi.departureIata;

  if (!origin || !destination || origin === destination) return [];

  return [
    {
      originIata: origin,
      destinationIata: destination,
      date: midIso(dateFrom, dateTo),
      labelIt: `Volo interno ${origin} → ${destination}`,
      notesIt: multi.transfer.notesIt,
    },
  ];
}

export function buildFlightPlanForDraft(
  draft: OrganizzaDraft,
  multi: MultiCountryPlan | null
): TripFlightPlan {
  const homeOrigin = (draft.originIata ?? 'MXP').toUpperCase();
  const homeReturn = (draft.homeReturnIata ?? draft.originIata ?? 'MXP').toUpperCase();
  const arrival =
    draft.arrivalIata ??
    getMaster(draft.slug ?? '')?.hubs[0] ??
    'BKK';
  const departure = draft.departureIata ?? arrival;
  const dateFrom = draft.dateFrom ?? '';
  const dateTo = draft.dateTo;
  const multiCountry = Boolean(draft.slugs && draft.slugs.length >= 2);
  const returnHome = draft.returnHome !== false;

  const internal =
    dateFrom && dateTo
      ? internalLegsFromMultiPlan(multi, dateFrom, dateTo)
      : [];

  return buildDefaultTripFlightPlan({
    homeOriginIata: homeOrigin,
    homeReturnIata: homeReturn,
    arrivalIata: arrival,
    departureIata: departure,
    dateFrom: dateFrom || new Date().toISOString().slice(0, 10),
    dateTo,
    passengers: draft.travelers,
    multiCountry,
    returnHome,
    internalLegs: internal,
  });
}

/** Keep selectedFlight mirror in sync for legacy step completion / budget. */
export function mirrorSelectedFlightFromPlan(
  plan: TripFlightPlan | null
): OrganizzaSelectedFlight | null {
  if (!plan) return null;
  const priced = plan.legs.filter(
    (l) => (l.status === 'selected' || l.status === 'stale') && l.offer
  );
  if (priced.length === 0) return null;
  const outbound = plan.legs.find((l) => l.kind === 'outbound');
  const ret = plan.legs.find(
    (l) => l.kind === 'return' || l.kind === 'openjaw_return'
  );
  const total = priced.reduce((s, l) => s + (l.offer?.price ?? 0), 0);
  const first = priced[0]!;
  return {
    offerId: first.offer!.offerId,
    labelIt:
      priced.length > 1
        ? `${priced.length} tratte selezionate`
        : outbound?.labelIt ?? first.labelIt,
    price: Math.round(total * 100) / 100,
    currency: first.offer!.currency || 'EUR',
    originIata: outbound?.originIata ?? first.offer!.originIata,
    destinationIata: outbound?.destinationIata ?? first.offer!.destinationIata,
    returnOriginIata: ret?.originIata ?? null,
    departureAt: outbound?.offer?.departureAt ?? first.offer!.departureAt,
    arrivalAt: outbound?.offer?.arrivalAt ?? first.offer!.arrivalAt,
    returnDepartureAt: ret?.offer?.departureAt ?? null,
    returnArrivalAt: ret?.offer?.arrivalAt ?? null,
    stops: first.offer!.stops,
    durationMinutes: first.offer!.durationMinutes,
    pickKind: 'manual',
  };
}

export function flightPlanAllowsContinue(plan: TripFlightPlan | null): boolean {
  if (!plan || plan.legs.length === 0) return false;
  // Estimated internals are optional until user edits them.
  const required = plan.legs.filter((l) => l.kind !== 'internal' || l.status !== 'estimated');
  if (required.length === 0) return true;
  return required.every(
    (l) => l.status === 'selected' || l.status === 'stale' || l.offer != null
  );
}
