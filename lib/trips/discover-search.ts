import { format, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import type { TripWithRelations } from '@/types/trip';
import { isDiscoverableSoloTrip } from '@/lib/trips/display';

export type DiscoverSearchFilters = {
  searchTerm: string;
  dateRange: DateRange | undefined;
  priceRange: [number, number];
};

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
  if (dateRange?.from && trip.startDate) {
    const tripStart = startOfDay(new Date(trip.startDate));
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? startOfDay(dateRange.to) : from;
    dateMatch = tripStart >= from && tripStart <= to;
  }

  const price = Number(trip.price) || 0;
  const priceMatch = price >= priceRange[0] && price <= priceRange[1];

  return textMatch && dateMatch && priceMatch;
}

/** Viaggi prenotabili: solo/aperti, non ancora iniziati, non pieni. */
export function isBookableDiscoverTrip(trip: TripWithRelations, userId?: string | null): boolean {
  if (!isDiscoverableSoloTrip(trip, userId)) return false;
  if (!trip.startDate) return true;
  const today = startOfDay(new Date());
  const tripStart = startOfDay(new Date(trip.startDate));
  return tripStart >= today;
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
  const priceMin = Number(searchParams.get('priceMin') ?? 0);
  const priceMax = Number(searchParams.get('priceMax') ?? 5000);

  return {
    searchTerm: searchParams.get('q') ?? '',
    dateRange:
      from
        ? {
            from: new Date(from),
            to: to ? new Date(to) : undefined,
          }
        : undefined,
    priceRange: [
      Number.isFinite(priceMin) ? priceMin : 0,
      Number.isFinite(priceMax) ? priceMax : 500,
    ],
  };
}