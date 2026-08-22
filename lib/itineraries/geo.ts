import { findCatalogDestination } from '@/lib/catalog/destinations';
import type { LatLng } from '@/lib/maps/coordinates';
import type { MapPin } from '@/lib/maps/pins';
import type { ItineraryDay, ItineraryTemplate } from '@/lib/itineraries/types';

/** Coordinate note per area_segment dei template di lancio. */
export const AREA_SEGMENT_COORDS: Record<string, LatLng> = {
  bangkok: { lat: 13.7563, lng: 100.5018 },
  islands: { lat: 9.7319, lng: 100.0136 },
  north: { lat: 18.7883, lng: 98.9853 },
  'chiang mai': { lat: 18.7883, lng: 98.9853 },
  'koh samui': { lat: 9.512, lng: 100.0136 },
  'koh tao': { lat: 10.0956, lng: 99.8381 },
};

export function resolveDayCoords(
  day: Pick<ItineraryDay, 'area_segment' | 'lat' | 'lng'>,
  destinationSlug: string
): LatLng | null {
  if (typeof day.lat === 'number' && typeof day.lng === 'number') {
    return { lat: day.lat, lng: day.lng };
  }
  const seg = day.area_segment.trim().toLowerCase();
  if (AREA_SEGMENT_COORDS[seg]) return AREA_SEGMENT_COORDS[seg];
  for (const [key, coords] of Object.entries(AREA_SEGMENT_COORDS)) {
    if (seg.includes(key) || key.includes(seg)) return coords;
  }
  const dest = findCatalogDestination(destinationSlug);
  if (dest?.lat != null && dest?.lng != null) {
    return { lat: dest.lat, lng: dest.lng };
  }
  return null;
}

/** Arricchisce i giorni con lat/lng risolti (senza inventare punti fuori catalogo). */
export function withResolvedDayCoords(
  days: ItineraryDay[],
  destinationSlug: string
): ItineraryDay[] {
  return days.map((day) => {
    if (day.lat != null && day.lng != null) return day;
    const coords = resolveDayCoords(day, destinationSlug);
    if (!coords) return day;
    return { ...day, lat: coords.lat, lng: coords.lng };
  });
}

/** Pin mappa: solo giorni con coordinate presenti nel modello dati. */
export function buildPinsFromItineraryTemplate(template: ItineraryTemplate): MapPin[] {
  const pins: MapPin[] = [];
  for (const day of template.days) {
    const coords = resolveDayCoords(day, template.destination_slug);
    if (!coords) continue;
    pins.push({
      id: `day-${day.day_number}`,
      blockId: `day-${day.day_number}`,
      lat: coords.lat,
      lng: coords.lng,
      label: `${day.title} · ${day.area_segment}`,
      dayIndex: day.day_number,
      blockType: 'attraction',
      emoji: String(day.day_number),
    });
  }
  return pins;
}
