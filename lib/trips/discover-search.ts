import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import type { TripWithRelations } from '@/types/trip';
import { isDiscoverableSoloTrip, isOpenSoloTrip, isTripCreator } from '@/lib/trips/display';

export type DiscoverSearchFilters = {
  searchTerm: string;
  dateRange: DateRange | undefined;
  priceRange: [number, number];
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

export function tripMatchesDiscoverFilters(
  trip: TripWithRelations,
  filters: DiscoverSearchFilters
): boolean {
  const { searchTerm, dateRange, priceRange } = filters;
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
  // Se max non è sensato, non filtrare per tetto
  const maxP =
    Number.isFinite(priceRange[1]) && priceRange[1] > 0 ? priceRange[1] : Number.MAX_SAFE_INTEGER;
  const priceMatch = safePrice >= minP && safePrice <= maxP;

  return textMatch && dateMatch && priceMatch;
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
  if (!isDiscoverableSoloTrip(trip, userId)) return false;

  const today = todayDateOnlyUtcMs();
  const end = toDateOnlyUtcMs(trip.endDate);
  if (end != null) return end >= today;

  const start = toDateOnlyUtcMs(trip.startDate);
  if (start == null) return true;
  return start >= today;
}

export function filterDiscoverResults(
  trips: TripWithRelations[],
  filters: DiscoverSearchFilters,
  userId?: string | null
): TripWithRelations[] {
  return trips
    .filter((trip) => isBookableDiscoverTrip(trip, userId))
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
  };
}
