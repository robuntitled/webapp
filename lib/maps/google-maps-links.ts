import type { MapPin } from '@/lib/maps/pins';

/** Apre un luogo in Google Maps (l'utente può salvarlo nei propri pin). Gratis — nessuna API key. */
export function googleMapsPlaceUrl(lat: number, lng: number, label?: string): string {
  const query = label ? encodeURIComponent(`${label}@${lat},${lng}`) : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Itinerario multi-tappa su Google Maps (max ~10 waypoints). */
export function googleMapsItineraryUrl(pins: MapPin[]): string | null {
  if (pins.length === 0) return null;

  const coords = pins.map((p) => `${p.lat},${p.lng}`);
  if (coords.length === 1) {
    return googleMapsPlaceUrl(pins[0].lat, pins[0].lng, pins[0].label);
  }

  const origin = coords[0];
  const destination = coords[coords.length - 1];
  const waypoints = coords.slice(1, -1).join('|');

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  });
  if (waypoints) params.set('waypoints', waypoints);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}