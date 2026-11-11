import type { FlightBookingRecap } from '@/lib/itineraries/bookings';
import type {
  SelectedFlightLegSnapshot,
  SelectedFlightPlanSnapshot,
} from '@/lib/itineraries/selected-flight-plan';
import type { TripFlightLeg, TripFlightOfferSnapshot } from '@/lib/travel/trip-flight-legs';
import type {
  FlightCheckoutDraft,
  FlightCheckoutLegItem,
  FlightLegDraft,
} from '@/lib/travel/flight-checkout-draft';

/**
 * Organizza / LegFlightStrip stores `leg.price` as the **party total** for
 * `plan.travelers` (search is 1-adult, then × pax). Never treat raw `leg.price`
 * as “a persona” without dividing by the basis.
 */
export function planPriceBasisTravelers(
  plan: Pick<SelectedFlightPlanSnapshot, 'travelers'> | null | undefined
): number {
  return Math.max(1, plan?.travelers ?? 1);
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Per-person unit from a stored party-total leg price. */
export function selectedLegPerPersonPrice(
  leg: Pick<SelectedFlightLegSnapshot, 'price'>,
  priceBasisTravelers: number
): number | null {
  if (leg.price == null || !Number.isFinite(leg.price)) return null;
  const basis = Math.max(1, priceBasisTravelers);
  return roundMoney(leg.price / basis);
}

/** Party total as stored (for the Organizza traveler count). */
export function selectedLegPartyTotal(
  leg: Pick<SelectedFlightLegSnapshot, 'price'>
): number | null {
  if (leg.price == null || !Number.isFinite(leg.price)) return null;
  return roundMoney(leg.price);
}

/** Charge for `payForCount` people on one leg (unit × count). */
export function selectedLegChargeForPax(
  leg: Pick<SelectedFlightLegSnapshot, 'price'>,
  priceBasisTravelers: number,
  payForCount: number
): number | null {
  const unit = selectedLegPerPersonPrice(leg, priceBasisTravelers);
  if (unit == null) return null;
  return roundMoney(unit * Math.max(1, payForCount));
}

/** Sum of per-person leg prices for the saved plan (all legs). */
export function sumSelectedPlanPerPerson(
  plan: SelectedFlightPlanSnapshot | null | undefined
): number | null {
  if (!plan?.legs?.length) return null;
  const basis = planPriceBasisTravelers(plan);
  let total = 0;
  let any = false;
  for (const leg of plan.legs) {
    const unit = selectedLegPerPersonPrice(leg, basis);
    if (unit == null) continue;
    total += unit;
    any = true;
  }
  return any ? roundMoney(total) : null;
}

export function sumSelectedLegsPerPerson(
  legs: SelectedFlightLegSnapshot[],
  priceBasisTravelers = 1
): number | null {
  if (!legs.length) return null;
  const basis = Math.max(1, priceBasisTravelers);
  let total = 0;
  let any = false;
  for (const leg of legs) {
    const unit = selectedLegPerPersonPrice(leg, basis);
    if (unit == null) continue;
    total += unit;
    any = true;
  }
  return any ? roundMoney(total) : null;
}

/** Quota to charge for N beneficiaries across the given legs. */
export function sumSelectedLegsChargeForPax(
  legs: SelectedFlightLegSnapshot[],
  priceBasisTravelers: number,
  payForCount: number
): number | null {
  const perPerson = sumSelectedLegsPerPerson(legs, priceBasisTravelers);
  if (perPerson == null) return null;
  return roundMoney(perPerson * Math.max(1, payForCount));
}

function bookingRouteMatches(
  booking: FlightBookingRecap,
  leg: SelectedFlightLegSnapshot
): boolean {
  const candidates = [booking.outbound, booking.returnLeg].filter(Boolean);
  const datePrefix = leg.date.slice(0, 10);
  for (const route of candidates) {
    if (!route) continue;
    if (route.origin !== leg.originIata || route.destination !== leg.destinationIata) {
      continue;
    }
    const dep = (route.departureAt ?? '').slice(0, 10);
    if (dep && datePrefix && dep !== datePrefix) continue;
    return true;
  }
  return false;
}

/** Match a selected plan leg to an existing practice booking (one-way tickets). */
export function findBookingForSelectedLeg(
  leg: SelectedFlightLegSnapshot,
  bookings: FlightBookingRecap[]
): FlightBookingRecap | null {
  for (const b of bookings) {
    if (bookingRouteMatches(b, leg)) return b;
  }
  return null;
}

export function isSelectedLegBooked(
  leg: SelectedFlightLegSnapshot,
  bookings: FlightBookingRecap[]
): boolean {
  return Boolean(findBookingForSelectedLeg(leg, bookings));
}

export function legKindLabelIt(kind: string): string {
  if (kind === 'return' || kind === 'openjaw_return') return 'Rientro';
  if (kind === 'intercountry') return 'Tra paesi';
  if (kind === 'outbound') return 'Andata';
  return 'Tratta';
}

export function selectedLegToCheckoutItem(
  leg: SelectedFlightLegSnapshot,
  priceBasisTravelers = 1
): FlightCheckoutLegItem | null {
  if (!leg.offerId || leg.price == null || !Number.isFinite(leg.price)) return null;
  const unit = selectedLegPerPersonPrice(leg, priceBasisTravelers);
  if (unit == null) return null;
  const draftLeg: FlightLegDraft = {
    origin: leg.originIata,
    destination: leg.destinationIata,
    airline: leg.airline,
    departureAt: leg.departureAt,
    arrivalAt: leg.arrivalAt,
    durationMinutes: leg.durationMinutes,
    stops: leg.stops ?? undefined,
  };
  return {
    id: leg.id,
    offerId: leg.offerId,
    // Unit (a persona) until buildCheckoutDraftFromLegs scales by adults.
    price: unit,
    currency: leg.currency ?? 'EUR',
    kind: leg.kind,
    labelIt: leg.labelIt || `${leg.originIata} → ${leg.destinationIata}`,
    leg: draftLeg,
  };
}

/**
 * Build a multi-leg (or single) checkout draft from selected plan legs.
 * `priceBasisTravelers` = Organizza party size used when prices were stored.
 * `adults` = how many passengers this checkout pays for (Pago per me → 1).
 */
export function buildCheckoutDraftFromLegs(input: {
  legs: SelectedFlightLegSnapshot[];
  adults: number;
  practiceId: string;
  mode: 'all' | 'separate';
  priceBasisTravelers?: number;
}): FlightCheckoutDraft | null {
  const basis = Math.max(1, input.priceBasisTravelers ?? 1);
  const adults = Math.max(1, input.adults);
  const items = input.legs
    .map((leg) => selectedLegToCheckoutItem(leg, basis))
    .filter((x): x is FlightCheckoutLegItem => Boolean(x));
  if (!items.length) return null;
  const unitTotal = roundMoney(items.reduce((s, l) => s + l.price, 0));
  const first = items[0]!;
  return {
    offerId: first.offerId,
    price: roundMoney(unitTotal * adults),
    currency: first.currency || 'EUR',
    adults,
    tripType: 'oneway',
    practiceId: input.practiceId,
    createdAt: Date.now(),
    outbound: first.leg,
    returnLeg: null,
    checkoutLegs: items.map((item) => ({
      ...item,
      price: roundMoney(item.price * adults),
    })),
    checkoutMode: input.mode,
    activeLegIndex: 0,
  };
}

export function formatStopsIt(stops: number | null | undefined): string {
  if (stops == null) return '—';
  if (stops <= 0) return 'Diretto';
  return `${stops} scalo/i`;
}

export function formatDurationIt(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m} min`;
  if (m <= 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatClockIt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function formatLegDateIt(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function snapshotLegToTripLeg(
  leg: SelectedFlightLegSnapshot,
  passengers = 1
): TripFlightLeg {
  const offer: TripFlightOfferSnapshot | null =
    leg.offerId && leg.price != null
      ? {
          offerId: leg.offerId,
          price: leg.price,
          currency: leg.currency ?? 'EUR',
          originIata: leg.originIata,
          destinationIata: leg.destinationIata,
          departureAt: leg.departureAt ?? `${leg.date}T00:00:00.000Z`,
          arrivalAt: leg.arrivalAt ?? `${leg.date}T00:00:00.000Z`,
          stops: leg.stops ?? 0,
          durationMinutes: leg.durationMinutes ?? 0,
          airline: leg.airline,
          capturedAt: Date.now(),
        }
      : null;
  const kind =
    leg.kind === 'outbound' ||
    leg.kind === 'return' ||
    leg.kind === 'intercountry' ||
    leg.kind === 'domestic' ||
    leg.kind === 'internal' ||
    leg.kind === 'openjaw_return' ||
    leg.kind === 'custom'
      ? leg.kind
      : 'custom';
  return {
    id: leg.id,
    kind: kind === 'internal' ? 'domestic' : kind,
    originIata: leg.originIata,
    destinationIata: leg.destinationIata,
    date: leg.date,
    passengers: Math.max(1, passengers),
    offer,
    status: offer ? 'selected' : 'empty',
    labelIt: leg.labelIt || `${leg.originIata} → ${leg.destinationIata}`,
  };
}

export function applyOfferToSnapshotLeg(
  leg: SelectedFlightLegSnapshot,
  date: string,
  offer: TripFlightOfferSnapshot | null
): SelectedFlightLegSnapshot {
  if (!offer) {
    return {
      ...leg,
      date,
      offerId: null,
      price: null,
      currency: null,
      stops: null,
      durationMinutes: null,
      airline: null,
      departureAt: null,
      arrivalAt: null,
    };
  }
  return {
    ...leg,
    date,
    offerId: offer.offerId,
    price: offer.price,
    currency: offer.currency,
    stops: offer.stops,
    durationMinutes: offer.durationMinutes,
    airline: offer.airline ?? null,
    departureAt: offer.departureAt,
    arrivalAt: offer.arrivalAt,
  };
}
