import type { SelectedFlightLegSnapshot } from '@/lib/itineraries/selected-flight-plan';
import type { TripFlightLeg, TripFlightOfferSnapshot } from '@/lib/travel/trip-flight-legs';

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
