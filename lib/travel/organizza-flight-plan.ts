/**
 * Build / sync TripFlightPlan from Organizza draft.
 *
 * Stage 2 (voli principali): outbound + intercountry (multi) + optional return.
 * Stage 3 (itinerario): domestic legs only when itinerary/timing requires them.
 *
 * SGN→REP (VN→KH) is INTERCOUNTRY (international), not domestic.
 * HAN→SGN is DOMESTIC (same country), proposed only at itinerario.
 */

import type {
  OrganizzaDraft,
  OrganizzaSelectedFlight,
} from '@/lib/itineraries/organizza-steps';
import type { MultiCountryPlan } from '@/lib/itineraries/multi-country/types';
import { getMaster } from '@/lib/itineraries/masters';
import {
  buildDefaultTripFlightPlan,
  type TripFlightLeg,
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

function addDaysIso(iso: string, days: number): string {
  const t = Date.parse(`${iso}T12:00:00Z`);
  if (!Number.isFinite(t)) return iso;
  return new Date(t + days * 86400000).toISOString().slice(0, 10);
}

/** Inter-country hop(s) for multi-country — stage 2 main flights. */
export function intercountryLegsFromMultiPlan(
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
  // Only propose a flight leg when curated transfer is flight-like.
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
      labelIt: `Tra paesi ${origin} → ${destination}`,
      notesIt:
        multi.transfer.notesIt ||
        'Tratta internazionale tra destinazioni — non è un volo domestico.',
    },
  ];
}

/** @deprecated alias — intercountry, not domestic */
export const internalLegsFromMultiPlan = intercountryLegsFromMultiPlan;

/**
 * Domestic legs inside a country, only when itinerary hubs require them
 * given the already-selected arrival / intercountry airports.
 */
export function proposeDomesticLegsFromItinerary(input: {
  draft: OrganizzaDraft;
  multi: MultiCountryPlan | null;
  mainPlan: TripFlightPlan | null;
}): Array<{
  originIata: string;
  destinationIata: string;
  date: string;
  labelIt: string;
  notesIt?: string;
}> {
  const { draft, multi, mainPlan } = input;
  const dateFrom = draft.dateFrom;
  const dateTo = draft.dateTo;
  if (!dateFrom || !dateTo) return [];

  const outbound = mainPlan?.legs.find((l) => l.kind === 'outbound');
  const arrivalIata =
    outbound?.offer?.destinationIata ??
    outbound?.destinationIata ??
    draft.arrivalIata ??
    null;
  if (!arrivalIata) return [];

  const inter = mainPlan?.legs.find((l) => l.kind === 'intercountry');
  const interOrigin = inter?.originIata ?? null;

  const out: Array<{
    originIata: string;
    destinationIata: string;
    date: string;
    labelIt: string;
    notesIt?: string;
  }> = [];

  const firstSlug = draft.slugs?.[0] ?? draft.slug;
  if (!firstSlug) return [];

  const master = getMaster(firstSlug);
  if (!master) return [];

  // Hub sequence from master stops that are airport hubs with domestic flight transfers
  const hubStops = master.stops.filter((s) => s.airportHub && s.hubIata);
  const hubIatas = hubStops.map((s) => s.hubIata!.toUpperCase());

  // Need to reach intercountry origin (e.g. SGN) from arrival (e.g. HAN)
  const targetInCountry = interOrigin
    ? interOrigin.toUpperCase()
    : (draft.departureIata ?? hubIatas[hubIatas.length - 1] ?? arrivalIata).toUpperCase();

  const start = arrivalIata.toUpperCase();
  if (start === targetInCountry) return [];

  // Walk master transfers: only propose when mode is internal_flight between hubs
  let cursor = start;
  let dayOffset = 3;
  for (let i = 0; i < master.stops.length - 1; i++) {
    const stop = master.stops[i]!;
    const next = master.stops[i + 1]!;
    const transfer = stop.transferToNext;
    if (!transfer || transfer.mode !== 'internal_flight') continue;
    const fromIata = stop.hubIata?.toUpperCase() ?? null;
    const toIata = next.hubIata?.toUpperCase() ?? null;
    if (!fromIata || !toIata) {
      // Infer from notes if hubs missing on one side
      const fromNotes = iatasFromNotes(transfer.notesIt ?? '');
      const o = fromIata ?? fromNotes?.[0];
      const d = toIata ?? fromNotes?.[1];
      if (!o || !d) continue;
      if (cursor === o && o !== d) {
        out.push({
          originIata: o,
          destinationIata: d,
          date: addDaysIso(dateFrom, dayOffset),
          labelIt: `Domestico ${o} → ${d}`,
          notesIt:
            transfer.notesIt ??
            'Volo domestico richiesto dall’itinerario — orari da verificare.',
        });
        cursor = d;
        dayOffset += 3;
        if (cursor === targetInCountry) break;
      }
      continue;
    }
    // Chain from current cursor toward target
    if (cursor === fromIata && fromIata !== toIata) {
      out.push({
        originIata: fromIata,
        destinationIata: toIata,
        date: addDaysIso(dateFrom, dayOffset),
        labelIt: `Domestico ${fromIata} → ${toIata}`,
        notesIt:
          transfer.notesIt ??
          'Volo domestico richiesto dall’itinerario — orari da verificare.',
      });
      cursor = toIata;
      dayOffset += 3;
      if (cursor === targetInCountry) break;
    }
  }

  // Fallback: direct domestic from arrival to intercountry origin / last hub
  if (out.length === 0 && start !== targetInCountry) {
    // Only if both hubs belong to same master country
    const startInMaster = hubIatas.includes(start) || master.hubs.includes(start);
    const targetInMaster =
      hubIatas.includes(targetInCountry) || master.hubs.includes(targetInCountry);
    if (startInMaster && targetInMaster) {
      out.push({
        originIata: start,
        destinationIata: targetInCountry,
        date: midIso(dateFrom, dateTo),
        labelIt: `Domestico ${start} → ${targetInCountry}`,
        notesIt:
          'Collegamento domestico tra hub dell’itinerario — disponibilità da verificare (non inventiamo orari).',
      });
    }
  }

  // Second country domestic rarely needed for open-jaw leave; skip inventing.

  void multi;
  return out;
}

/** Main flights plan for stage 2 — no domestic legs. */
export function buildMainFlightPlanForDraft(
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

  const intercountry =
    dateFrom && dateTo
      ? intercountryLegsFromMultiPlan(multi, dateFrom, dateTo)
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
    intercountryLegs: intercountry,
    domesticLegs: [],
  });
}

/** @deprecated use buildMainFlightPlanForDraft */
export function buildFlightPlanForDraft(
  draft: OrganizzaDraft,
  multi: MultiCountryPlan | null
): TripFlightPlan {
  return buildMainFlightPlanForDraft(draft, multi);
}

export function buildDomesticPlanForDraft(
  draft: OrganizzaDraft,
  multi: MultiCountryPlan | null,
  mainPlan: TripFlightPlan | null
): TripFlightPlan {
  const hops = proposeDomesticLegsFromItinerary({ draft, multi, mainPlan });
  const homeOrigin = (draft.originIata ?? 'MXP').toUpperCase();
  return {
    shape: 'multi_oneway',
    returnHome: false,
    homeOriginIata: homeOrigin,
    homeReturnIata: homeOrigin,
    legs: hops.map((hop, i) => ({
      id: `domestic-${i}-${hop.originIata}${hop.destinationIata}`,
      kind: 'domestic' as const,
      originIata: hop.originIata,
      destinationIata: hop.destinationIata,
      date: hop.date,
      passengers: draft.travelers,
      offer: null,
      status: 'estimated' as const,
      labelIt: hop.labelIt,
      notesIt: hop.notesIt,
    })),
  };
}

export function mergeMainAndDomestic(
  main: TripFlightPlan | null,
  domestic: TripFlightPlan | null
): TripFlightPlan | null {
  if (!main) return domestic;
  if (!domestic || domestic.legs.length === 0) return main;
  // Insert domestic after outbound, before intercountry/return
  const outbound = main.legs.filter((l) => l.kind === 'outbound');
  const rest = main.legs.filter((l) => l.kind !== 'outbound');
  return {
    ...main,
    shape: 'multi_oneway',
    legs: [...outbound, ...domestic.legs, ...rest],
  };
}

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

/** Stage 2 continue: all main (non-domestic) legs selected or skipped. */
export function flightPlanAllowsContinue(plan: TripFlightPlan | null): boolean {
  if (!plan || plan.legs.length === 0) return false;
  const required = plan.legs.filter(
    (l) => l.kind !== 'domestic' && l.kind !== 'internal'
  );
  if (required.length === 0) return true;
  return required.every(
    (l) => l.status === 'selected' || l.status === 'stale' || l.offer != null
  );
}

export function mainLegsOf(plan: TripFlightPlan | null): TripFlightLeg[] {
  if (!plan) return [];
  return plan.legs.filter(
    (l) => l.kind !== 'domestic' && l.kind !== 'internal'
  );
}
