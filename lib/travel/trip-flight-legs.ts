/**
 * Ordered flight legs for Organizza.
 * Provider supports only oneway | closed roundtrip per search —
 * multi-leg trips are composed of separate oneway offers (honest orchestration).
 */

export type TripFlightShape = 'roundtrip' | 'oneway' | 'openjaw' | 'multi_oneway';

export type TripFlightLegKind =
  | 'outbound'
  | 'return'
  | 'internal'
  | 'openjaw_return'
  | 'custom';

export type TripFlightOfferSnapshot = {
  offerId: string;
  price: number;
  currency: string;
  originIata: string;
  destinationIata: string;
  departureAt: string;
  arrivalAt: string;
  stops: number;
  durationMinutes: number;
  airline?: string | null;
  /** Captured when selected — used to detect stale. */
  capturedAt: number;
};

export type TripFlightLegStatus =
  | 'empty'
  | 'estimated'
  | 'selected'
  | 'stale'
  | 'unavailable';

export type TripFlightLeg = {
  id: string;
  kind: TripFlightLegKind;
  originIata: string;
  destinationIata: string;
  date: string;
  passengers: number;
  offer: TripFlightOfferSnapshot | null;
  status: TripFlightLegStatus;
  labelIt: string;
  /** Soft note (e.g. overnight, unverified internal). Never invented schedules. */
  notesIt?: string | null;
};

export type TripFlightPlan = {
  shape: TripFlightShape;
  /** When false, no return-home leg is included. */
  returnHome: boolean;
  homeOriginIata: string;
  /** May differ from homeOriginIata (return to another Italian/EU airport). */
  homeReturnIata: string;
  legs: TripFlightLeg[];
};

export type BuildLegsInput = {
  homeOriginIata: string;
  homeReturnIata?: string | null;
  /** First destination arrival hub. */
  arrivalIata: string;
  /** Last destination departure hub (open-jaw). */
  departureIata: string;
  dateFrom: string;
  dateTo: string | null;
  passengers: number;
  /** Prefer roundtrip when single hub and returnHome. */
  multiCountry: boolean;
  returnHome?: boolean;
  /** Internal hops from itinerary (only when master marks internal_flight). */
  internalLegs?: Array<{
    originIata: string;
    destinationIata: string;
    date: string;
    labelIt: string;
    notesIt?: string;
  }>;
};

function legId(kind: string, i: number) {
  return `${kind}-${i}-${Math.random().toString(36).slice(2, 7)}`;
}

export function buildDefaultTripFlightPlan(input: BuildLegsInput): TripFlightPlan {
  const homeOrigin = input.homeOriginIata.trim().toUpperCase() || 'MXP';
  const homeReturn = (input.homeReturnIata ?? homeOrigin).trim().toUpperCase() || homeOrigin;
  const arrival = input.arrivalIata.trim().toUpperCase();
  const departHub = input.departureIata.trim().toUpperCase() || arrival;
  const returnHome = input.returnHome !== false;
  const pax = Math.max(1, Math.min(9, input.passengers || 1));
  const legs: TripFlightLeg[] = [];

  const openJaw = arrival !== departHub;
  const shape: TripFlightShape = input.multiCountry
    ? 'multi_oneway'
    : !returnHome
      ? 'oneway'
      : openJaw || homeOrigin !== homeReturn
        ? 'openjaw'
        : 'roundtrip';

  legs.push({
    id: legId('out', 0),
    kind: 'outbound',
    originIata: homeOrigin,
    destinationIata: arrival,
    date: input.dateFrom,
    passengers: pax,
    offer: null,
    status: 'empty',
    labelIt: `Andata ${homeOrigin} → ${arrival}`,
  });

  for (const [i, hop] of (input.internalLegs ?? []).entries()) {
    legs.push({
      id: legId('int', i),
      kind: 'internal',
      originIata: hop.originIata.toUpperCase(),
      destinationIata: hop.destinationIata.toUpperCase(),
      date: hop.date,
      passengers: pax,
      offer: null,
      status: 'estimated',
      labelIt: hop.labelIt,
      notesIt:
        hop.notesIt ??
        'Volo interno suggerito dall’itinerario — verifica disponibilità e orari.',
    });
  }

  if (returnHome && input.dateTo) {
    legs.push({
      id: legId('ret', 0),
      kind: openJaw || homeOrigin !== homeReturn ? 'openjaw_return' : 'return',
      originIata: departHub,
      destinationIata: homeReturn,
      date: input.dateTo,
      passengers: pax,
      offer: null,
      status: 'empty',
      labelIt: `Rientro ${departHub} → ${homeReturn}`,
      notesIt:
        openJaw || homeOrigin !== homeReturn
          ? 'Biglietto separato dall’andata (open-jaw / aeroporto di rientro diverso).'
          : null,
    });
  }

  return {
    shape,
    returnHome,
    homeOriginIata: homeOrigin,
    homeReturnIata: homeReturn,
    legs,
  };
}

/** Closed roundtrip can use one provider offer; everything else = separate one-ways. */
export function providerSearchModeForPlan(plan: TripFlightPlan): {
  canUseClosedRoundtrip: boolean;
  reasonIt: string;
} {
  if (
    plan.shape === 'roundtrip' &&
    plan.returnHome &&
    plan.legs.length === 2 &&
    plan.homeOriginIata === plan.homeReturnIata &&
    plan.legs[0]?.destinationIata === plan.legs[1]?.originIata
  ) {
    return {
      canUseClosedRoundtrip: true,
      reasonIt: 'Andata e ritorno sullo stesso aeroporto: una sola ricerca A/R.',
    };
  }
  return {
    canUseClosedRoundtrip: false,
    reasonIt:
      'Tratte separate (one-way): il fornitore non emette un unico biglietto multi-tratta in questa integrazione.',
  };
}

export type LegTimingIssue = {
  legId: string;
  severity: 'warn' | 'block';
  messageIt: string;
};

/** Soft checks: overnight, same-day conflict, missing connection buffer. No invented MCT. */
export function analyzeLegTiming(legs: TripFlightLeg[]): LegTimingIssue[] {
  const issues: LegTimingIssue[] = [];
  const ordered = [...legs].sort((a, b) => a.date.localeCompare(b.date));

  for (const leg of ordered) {
    if (leg.offer?.departureAt && leg.offer?.arrivalAt) {
      const dep = Date.parse(leg.offer.departureAt);
      const arr = Date.parse(leg.offer.arrivalAt);
      if (Number.isFinite(dep) && Number.isFinite(arr) && arr < dep) {
        issues.push({
          legId: leg.id,
          severity: 'warn',
          messageIt: `${leg.labelIt}: arrivo il giorno dopo (volo notturno) — verifica il fuso orario locale.`,
        });
      }
    }
  }

  for (let i = 0; i < ordered.length - 1; i++) {
    const a = ordered[i]!;
    const b = ordered[i + 1]!;
    if (a.offer?.arrivalAt && b.offer?.departureAt) {
      const arr = Date.parse(a.offer.arrivalAt);
      const dep = Date.parse(b.offer.departureAt);
      if (Number.isFinite(arr) && Number.isFinite(dep)) {
        const gapMin = (dep - arr) / 60_000;
        if (gapMin < 0) {
          issues.push({
            legId: b.id,
            severity: 'block',
            messageIt: `${b.labelIt}: parte prima dell’arrivo della tratta precedente.`,
          });
        } else if (gapMin < 90 && a.destinationIata === b.originIata) {
          issues.push({
            legId: b.id,
            severity: 'warn',
            messageIt: `${b.labelIt}: meno di 90 minuti dall’arrivo precedente — rischio scalo stretto (biglietti separati).`,
          });
        }
      }
    } else if (a.date === b.date && a.destinationIata === b.originIata) {
      issues.push({
        legId: b.id,
        severity: 'warn',
        messageIt: `${a.labelIt} e ${b.labelIt} lo stesso giorno — conferma tempi reali prima di prenotare.`,
      });
    }
  }

  return issues;
}

/** Mark selected offers stale when trip inputs that affect that leg change. */
export function flagStaleLegs(
  plan: TripFlightPlan,
  changed: Partial<{
    dateFrom: string;
    dateTo: string | null;
    arrivalIata: string;
    departureIata: string;
    homeOriginIata: string;
    homeReturnIata: string;
    passengers: number;
  }>
): TripFlightPlan {
  const legs = plan.legs.map((leg) => {
    if (leg.status !== 'selected' || !leg.offer) return leg;
    let stale = false;
    if (changed.passengers != null && changed.passengers !== leg.passengers) stale = true;
    if (leg.kind === 'outbound') {
      if (changed.dateFrom && changed.dateFrom !== leg.date) stale = true;
      if (changed.homeOriginIata && changed.homeOriginIata !== leg.originIata) stale = true;
      if (changed.arrivalIata && changed.arrivalIata !== leg.destinationIata) stale = true;
    }
    if (leg.kind === 'return' || leg.kind === 'openjaw_return') {
      if (changed.dateTo && changed.dateTo !== leg.date) stale = true;
      if (changed.departureIata && changed.departureIata !== leg.originIata) stale = true;
      if (changed.homeReturnIata && changed.homeReturnIata !== leg.destinationIata) stale = true;
    }
    if (!stale) return leg;
    return { ...leg, status: 'stale' as const };
  });
  return { ...plan, legs };
}

export function selectOfferOnLeg(
  plan: TripFlightPlan,
  legId: string,
  offer: TripFlightOfferSnapshot
): TripFlightPlan {
  return {
    ...plan,
    legs: plan.legs.map((leg) =>
      leg.id === legId
        ? {
            ...leg,
            offer,
            status: 'selected',
            originIata: offer.originIata,
            destinationIata: offer.destinationIata,
          }
        : leg
    ),
  };
}

export function clearLegOffer(plan: TripFlightPlan, legId: string): TripFlightPlan {
  return {
    ...plan,
    legs: plan.legs.map((leg) =>
      leg.id === legId ? { ...leg, offer: null, status: 'empty' as const } : leg
    ),
  };
}

export function updateLegFields(
  plan: TripFlightPlan,
  legId: string,
  patch: Partial<Pick<TripFlightLeg, 'originIata' | 'destinationIata' | 'date' | 'passengers' | 'labelIt'>>
): TripFlightPlan {
  return {
    ...plan,
    legs: plan.legs.map((leg) => {
      if (leg.id !== legId) return leg;
      const next = { ...leg, ...patch };
      if (leg.offer && leg.status === 'selected') {
        next.status = 'stale';
      }
      return next;
    }),
  };
}

export function removeLeg(plan: TripFlightPlan, legId: string): TripFlightPlan {
  const legs = plan.legs.filter((l) => l.id !== legId);
  const returnHome = legs.some(
    (l) => l.kind === 'return' || l.kind === 'openjaw_return'
  );
  return { ...plan, legs, returnHome };
}

export function addCustomLeg(
  plan: TripFlightPlan,
  leg: Omit<TripFlightLeg, 'id' | 'status' | 'offer'> & { id?: string }
): TripFlightPlan {
  const next: TripFlightLeg = {
    ...leg,
    id: leg.id ?? legId('custom', plan.legs.length),
    offer: null,
    status: 'empty',
  };
  return { ...plan, legs: [...plan.legs, next], shape: 'multi_oneway' };
}

export function reorderLegs(plan: TripFlightPlan, fromIndex: number, toIndex: number): TripFlightPlan {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= plan.legs.length ||
    toIndex >= plan.legs.length
  ) {
    return plan;
  }
  const legs = [...plan.legs];
  const [moved] = legs.splice(fromIndex, 1);
  legs.splice(toIndex, 0, moved!);
  return { ...plan, legs };
}

export function selectedLegsTotal(plan: TripFlightPlan): {
  amount: number | null;
  currency: string;
  selectedCount: number;
  emptyCount: number;
  staleCount: number;
} {
  let amount = 0;
  let currency = 'EUR';
  let selectedCount = 0;
  let emptyCount = 0;
  let staleCount = 0;
  let any = false;
  for (const leg of plan.legs) {
    if (leg.status === 'selected' && leg.offer) {
      amount += leg.offer.price;
      currency = leg.offer.currency || currency;
      selectedCount += 1;
      any = true;
    } else if (leg.status === 'stale') {
      staleCount += 1;
      if (leg.offer) {
        amount += leg.offer.price;
        any = true;
      }
    } else if (leg.status === 'empty' || leg.status === 'estimated') {
      emptyCount += 1;
    }
  }
  return {
    amount: any ? Math.round(amount * 100) / 100 : null,
    currency,
    selectedCount,
    emptyCount,
    staleCount,
  };
}

export const SEPARATE_TICKETS_NOTICE_IT =
  'Ogni tratta selezionata è un biglietto indipendente. Non c’è garanzia all-or-nothing: se una tratta cambia prezzo o non è più disponibile, le altre non sono automaticamente rimborsate. Collegamenti e scali tra biglietti separati sono a tuo rischio.';

export const STALE_OFFER_NOTICE_IT =
  'Tariffa da ricontrollare: le condizioni del viaggio sono cambiate oppure l’offerta è in cache. Verifica di nuovo disponibilità e prezzo prima di procedere.';
