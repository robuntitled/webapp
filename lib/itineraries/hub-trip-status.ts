import {
  listPracticeFlightBookings,
  practiceHasFlightBooked,
} from '@/lib/itineraries/practice-flights';
import { parseFlightStatus, type FlightStatusKind } from '@/lib/itineraries/bookings';
import type { PracticeRow } from '@/lib/itineraries/types';
import { DASHBOARD_VIAGGI_COPY } from '@/lib/itineraries/dashboard-viaggi-copy';

export type HubTripBadgeId =
  | 'draft'
  | 'flightPending'
  | 'booked'
  | 'toBook'
  | 'carrierCancelled';

export type HubTripBadge = {
  id: HubTripBadgeId;
  label: string;
  tone: 'neutral' | 'amber' | 'emerald' | 'rose' | 'slate';
};

function primaryFlightStatus(p: PracticeRow): FlightStatusKind | null {
  const bookings = listPracticeFlightBookings(p);
  if (!bookings.length) return null;
  // Prefer cancelled / pending / failed signal from any leg.
  const kinds = bookings.map((b) => parseFlightStatus(b.status));
  if (kinds.includes('cancelled')) return 'cancelled';
  if (kinds.includes('pending')) return 'pending';
  if (kinds.includes('failed')) return 'failed';
  if (kinds.includes('confirmed')) return 'confirmed';
  return kinds[0] ?? null;
}

/** Badge stato per le card dashboard (una etichetta primaria). */
export function resolveHubTripBadge(p: PracticeRow): HubTripBadge {
  const flightKind = primaryFlightStatus(p);
  const copy = DASHBOARD_VIAGGI_COPY.badges;

  if (flightKind === 'cancelled') {
    return { id: 'carrierCancelled', label: copy.carrierCancelled, tone: 'slate' };
  }
  if (flightKind === 'pending') {
    return { id: 'flightPending', label: copy.flightPending, tone: 'amber' };
  }
  if (practiceHasFlightBooked(p) || flightKind === 'confirmed') {
    return { id: 'booked', label: copy.booked, tone: 'emerald' };
  }
  if (p.status === 'draft') {
    return { id: 'draft', label: copy.draft, tone: 'neutral' };
  }
  return { id: 'toBook', label: copy.toBook, tone: 'amber' };
}

export function hubBadgeClassName(tone: HubTripBadge['tone']): string {
  switch (tone) {
    case 'emerald':
      return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
    case 'amber':
      return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200';
    case 'rose':
      return 'bg-rose-50 text-rose-800 ring-1 ring-rose-200';
    case 'slate':
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    default:
      return 'bg-stone-100 text-stone-700 ring-1 ring-stone-200';
  }
}

export function practiceHasPaidHotelOrActivity(
  p: Pick<PracticeRow, 'hotel_bookings' | 'activity_bookings' | 'hotel_confirmed_at' | 'activity_confirmed_at'>
): boolean {
  if (p.hotel_confirmed_at || p.activity_confirmed_at) return true;
  if ((p.hotel_bookings?.length ?? 0) > 0) return true;
  if ((p.activity_bookings?.length ?? 0) > 0) return true;
  return false;
}
