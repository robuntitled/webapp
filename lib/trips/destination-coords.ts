import { findDestination } from '@/lib/composer/destinations';

export type LatLng = { lat: number; lng: number };

export function coordsFromDestinationLabel(destination: string): LatLng | null {
  const raw = destination.trim();
  if (!raw) return null;

  const featured = findDestination(raw);
  if (featured) return { lat: featured.lat, lng: featured.lng };

  const first = raw.split(',')[0]?.trim() ?? '';
  if (first && first !== raw) {
    const nested = findDestination(first);
    if (nested) return { lat: nested.lat, lng: nested.lng };
  }

  return null;
}
