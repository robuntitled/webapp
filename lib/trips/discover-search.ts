import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import type { TripWithRelations } from '@/types/trip';
import { findDestination } from '@/lib/composer/destinations';
import { getSpotsLeft, isDiscoverableSoloTrip, isOpenSoloTrip, isTripCreator } from '@/lib/trips/display';
import { isClosingSoon, isGroupSolid } from '@/lib/trips/formation';

export type DurationFilter = 'any' | 'weekend' | 'week' | 'long';
export type StatusFilter = 'any' | 'forming' | 'closing' | 'last';

export type DiscoverSearchFilters = {
  searchTerm: string;
  dateRange: DateRange | undefined;
  priceRange: [number, number];
  duration: DurationFilter;
  status: StatusFilter;
  region: string;
};

export const EMPTY_DISCOVER_FILTERS: Omit<DiscoverSearchFilters, 'priceRange'> = {
  searchTerm: '',
  dateRange: undefined,
  duration: 'any',
  status: 'any',
  region: '',
};

/** Confronta date YYYY-MM-DD senza shift timezone. */
export function toDateOnlyUtcMs(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!m) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function todayDateOnlyUtcMs(): number {
  const n = new Date();
  return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
}

export function formatDiscoverDateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'Qualsiasi periodo';
  if (!range.to) return format(range.from, 'd MMM yyyy', { locale: it });
  return `${format(range.from, 'd MMM yyyy', { locale: it })} – ${format(range.to, 'd MMM yyyy', { locale: it })}`;
}

export function tripDurationDays(trip: Pick<TripWithRelations, 'startDate' | 'endDate'>): number {
  const start = toDateOnlyUtcMs(trip.startDate);
  const end = toDateOnlyUtcMs(trip.endDate);
  if (start == null || end == null) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

export function tripMatchesDiscoverFilters(
  trip: TripWithRelations,
  filters: DiscoverSearchFilters
): boolean {
  const { searchTerm, dateRange, priceRange, duration, status, region } = filters;
  const q = searchTerm.trim().toLowerCase();

  const textMatch =
    !q ||
    trip.title.toLowerCase().includes(q) ||
    trip.destination.toLowerCase().includes(q) ||
    (trip.creator?.first_name?.toLowerCase().includes(q) ?? false);

  let dateMatch = true;
  if (dateRange?.from) {
    const tripStart = toDateOnlyUtcMs(trip.startDate);
    const from = toDateOnlyUtcMs(dateRange.from);
    const to = dateRange.to ? toDateOnlyUtcMs(dateRange.to) : from;
    if (tripStart == null || from == null || to == null) {
      dateMatch = true;
    } else {
      dateMatch = tripStart >= from && tripStart <= to;
    }
  }

  const price = Number(trip.price);
  const safePrice = Number.isFinite(price) ? price : 0;
  const minP = Number.isFinite(priceRange[0]) ? priceRange[0] : 0;
  const maxP =
    Number.isFinite(priceRange[1]) && priceRange[1] > 0 ? priceRange[1] : Number.MAX_SAFE_INTEGER;
  const priceMatch = safePrice >= minP && safePrice <= maxP;

  const days = tripDurationDays(trip);
  const durationMatch =
    duration === 'any' ||
    days === 0 ||
    (duration === 'weekend' && days <= 4) ||
    (duration === 'week' && days >= 5 && days <= 8) ||
    (duration === 'long' && days >= 9);

  const count = trip.participantCount ?? 0;
  const left = getSpotsLeft(Number(trip.maxParticipants) || 0, count);
  const statusMatch =
    status === 'any' ||
    (status === 'forming' && !isGroupSolid(trip)) ||
    (status === 'closing' && isClosingSoon(trip)) ||
    (status === 'last' && left > 0 && left <= 3);

  const tripRegion = findDestination(trip.destination)?.region ?? '';
  const regionMatch = !region || tripRegion === region || trip.destination.toLowerCase().includes(region.toLowerCase());

  return textMatch && dateMatch && priceMatch && durationMatch && statusMatch && regionMatch;
}

/**
 * Viaggi prenotabili in Scopri:
 * aperti (solo), con posti, non i tuoi, non già iscritti,
 * e non terminati (endDate >= oggi, o startDate >= oggi se manca end).
 */
export function isBookableDiscoverTrip(
  trip: TripWithRelations,
  userId?: string | null
): boolean {
  if (trip.status === 'draft' || trip.status === 'archived') return false;
  if (!isDiscoverableSoloTrip(trip, userId)) return false;

  const today = todayDateOnlyUtcMs();
  const end = toDateOnlyUtcMs(trip.endDate);
  if (end != null) return end >= today;

  const start = toDateOnlyUtcMs(trip.startDate);
  if (start == null) return true;
  return start >= today;
}

/**
 * Viaggi elencabili in Esplora: come i prenotabili, ma includono anche i
 * viaggi aperti creati da te (per vederli pubblicati e gestirli). Il "Solo puro"
 * (max 1 posto) resta fuori: è privato, solo tuo.
 */
export function isDiscoverListableTrip(
  trip: TripWithRelations,
  userId?: string | null
): boolean {
  if (trip.status === 'draft' || trip.status === 'archived') return false;
  if (!isOpenSoloTrip(trip)) return false;
  if ((Number(trip.maxParticipants) || 0) <= 1) return false;

  const today = todayDateOnlyUtcMs();
  const end = toDateOnlyUtcMs(trip.endDate);
  const start = toDateOnlyUtcMs(trip.startDate);
  const future = end != null ? end >= today : start == null || start >= today;
  if (!future) return false;

  if (isTripCreator(trip, userId)) return true;
  return isDiscoverableSoloTrip(trip, userId);
}

export function filterDiscoverResults(
  trips: TripWithRelations[],
  filters: DiscoverSearchFilters,
  userId?: string | null
): TripWithRelations[] {
  return trips
    .filter((trip) => isDiscoverListableTrip(trip, userId))
    .filter((trip) => tripMatchesDiscoverFilters(trip, filters));
}

export function explainEmptyDiscover(
  trips: TripWithRelations[],
  userId?: string | null
): 'own-solo-only' | 'no-solo' | 'past-or-full' | 'filters' {
  const solo = trips.filter(isOpenSoloTrip);
  if (solo.length === 0) return 'no-solo';

  const ownSolo = userId ? solo.filter((t) => isTripCreator(t, userId)) : [];
  const discoverable = solo.filter((t) => isDiscoverableSoloTrip(t, userId));
  if (discoverable.length === 0 && ownSolo.length > 0) return 'own-solo-only';

  const bookable = solo.filter((t) => isBookableDiscoverTrip(t, userId));
  if (bookable.length === 0) return 'past-or-full';

  return 'filters';
}

export function buildDiscoverSearchParams(filters: DiscoverSearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.searchTerm.trim()) params.set('q', filters.searchTerm.trim());
  if (filters.dateRange?.from) {
    params.set('from', filters.dateRange.from.toISOString().slice(0, 10));
  }
  if (filters.dateRange?.to) {
    params.set('to', filters.dateRange.to.toISOString().slice(0, 10));
  }
  params.set('priceMin', String(filters.priceRange[0]));
  params.set('priceMax', String(filters.priceRange[1]));
  if (filters.duration !== 'any') params.set('duration', filters.duration);
  if (filters.status !== 'any') params.set('status', filters.status);
  if (filters.region) params.set('region', filters.region);
  return params;
}

export function parseDiscoverSearchParams(searchParams: URLSearchParams): DiscoverSearchFilters {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const priceMinRaw = searchParams.get('priceMin');
  const priceMaxRaw = searchParams.get('priceMax');
  const priceMin = priceMinRaw != null ? Number(priceMinRaw) : 0;
  // Default molto alto se assente — evita di tagliare viaggi costosi
  const priceMax = priceMaxRaw != null ? Number(priceMaxRaw) : 100_000;

  const durationRaw = searchParams.get('duration');
  const duration: DurationFilter =
    durationRaw === 'weekend' || durationRaw === 'week' || durationRaw === 'long'
      ? durationRaw
      : 'any';
  const statusRaw = searchParams.get('status');
  const status: StatusFilter =
    statusRaw === 'forming' || statusRaw === 'closing' || statusRaw === 'last' ? statusRaw : 'any';

  return {
    searchTerm: searchParams.get('q') ?? '',
    dateRange: from
      ? {
          from: new Date(from),
          to: to ? new Date(to) : undefined,
        }
      : undefined,
    priceRange: [
      Number.isFinite(priceMin) ? priceMin : 0,
      Number.isFinite(priceMax) && priceMax > 0 ? priceMax : 100_000,
    ],
    duration,
    status,
    region: searchParams.get('region') ?? '',
  };
}
